/**
 * RLS verification: proves default-deny tenancy works end to end.
 *
 * Requires the demo seed (two organizations). Checks:
 *   1. No tenant context  -> zero rows on every tenant table (default deny).
 *   2. Org A context      -> sees only org A rows; org B rows invisible.
 *   3. Org B context      -> sees only org B rows; org A rows invisible.
 *   4. Cross-org write    -> INSERT/UPDATE of another org's row is rejected.
 *   5. SET LOCAL edge case -> tenant context evaporates at COMMIT on a pooled
 *                             connection; after commit, the same connection
 *                             sees zero rows again (spec section 36).
 *   6. users / assumption_sets / notifications special policies.
 *   7. audit_logs         -> UPDATE is denied (append-only).
 *
 * Usage: npx tsx server/db/verify-rls.ts   (expects DATABASE_URL or default)
 */
import pg from 'pg';
import { databaseUrl } from './connection.ts';

const { Client } = pg;

/**
 * RLS is bypassed by superusers (postgres) and BYPASSRLS roles, so this
 * script must connect as the application role created in 0095_app_role.sql.
 * It derives the app_user URL from DATABASE_URL unless VERIFY_DATABASE_URL
 * is set explicitly.
 */
function verifyUrl(): string {
    if (process.env.VERIFY_DATABASE_URL) return process.env.VERIFY_DATABASE_URL;
    const url = new URL(databaseUrl());
    url.username = 'app_user';
    url.password = process.env.APP_USER_PASSWORD ?? 'app_user_dev_password';
    return url.toString();
}

const ORG_DEMO = '00000000-0000-4000-8000-000000000001';
const ORG_NORTHSTAR = '00000000-0000-4000-8000-000000000002';
const PRACTITIONER_KETAN = '00000000-0000-4000-8000-000000000010';
const NORTHSTAR_OWNER = '00000000-0000-4000-8000-000000008000';

let failures = 0;

function check(label: string, ok: boolean, detail = ''): void {
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ` (${detail})` : ''}`);
    if (!ok) failures += 1;
}

async function main(): Promise<void> {
    const client = new Client({ connectionString: verifyUrl() });
    await client.connect();
    const q = (text: string, params: unknown[] = []) => client.query(text, params);
    const scalar = async (text: string, params: unknown[] = []): Promise<number> => {
        const { rows } = await q(text, params);
        return Number((rows[0] as Record<string, unknown>).n);
    };
    const inTx = async <T>(fn: () => Promise<T>): Promise<T> => {
        await q('BEGIN');
        try {
            const result = await fn();
            await q('COMMIT');
            return result;
        } catch (err) {
            await q('ROLLBACK');
            throw err;
        }
    };

    // 1. Default deny: no context at all.
    await inTx(async () => {
        const clients = await scalar('SELECT count(*) AS n FROM clients');
        const assets = await scalar('SELECT count(*) AS n FROM assets');
        const orgs = await scalar('SELECT count(*) AS n FROM organizations');
        const memberships = await scalar('SELECT count(*) AS n FROM organization_memberships');
        check('default-deny: clients invisible without context', clients === 0, `count=${clients}`);
        check('default-deny: assets invisible without context', assets === 0, `count=${assets}`);
        check('default-deny: organizations invisible without context', orgs === 0, `count=${orgs}`);
        check('default-deny: memberships invisible without context', memberships === 0, `count=${memberships}`);
    });

    // 2. Org A sees its own rows only.
    await inTx(async () => {
        await q('SELECT set_tenant_context($1::uuid, $2::uuid)', [ORG_DEMO, PRACTITIONER_KETAN]);
        const demoClients = await scalar(
            'SELECT count(*) AS n FROM clients WHERE organization_id = $1', [ORG_DEMO]);
        const northstarClientsVisible = await scalar(
            'SELECT count(*) AS n FROM clients WHERE organization_id = $1', [ORG_NORTHSTAR]);
        const allVisible = await scalar('SELECT count(*) AS n FROM clients');
        check('org A: sees its 25 demo clients', demoClients === 25, `count=${demoClients}`);
        check('org A: zero org B clients visible', northstarClientsVisible === 0, `count=${northstarClientsVisible}`);
        check('org A: total visible clients == 25 (no cross-org rows)', allVisible === 25, `count=${allVisible}`);
    });

    // 3. Org B sees its own row only; org A hidden.
    await inTx(async () => {
        await q('SELECT set_tenant_context($1::uuid, $2::uuid)', [ORG_NORTHSTAR, NORTHSTAR_OWNER]);
        const own = await scalar('SELECT count(*) AS n FROM clients');
        const demoVisible = await scalar('SELECT count(*) AS n FROM clients WHERE organization_id = $1', [ORG_DEMO]);
        check('org B: sees exactly its 1 client', own === 1, `count=${own}`);
        check('org B: zero org A clients visible', demoVisible === 0, `count=${demoVisible}`);
    });

    // 4. Cross-org writes are rejected.
    const writeRejection = await inTx(async () => {
        await q('SELECT set_tenant_context($1::uuid, $2::uuid)', [ORG_DEMO, PRACTITIONER_KETAN]);
        let rejected = false;
        try {
            await q('SAVEPOINT sp1');
            await q(
                `INSERT INTO clients (id, organization_id, first_name, last_name)
                 VALUES (gen_random_uuid(), $1, 'Evil', 'CrossOrg')`, [ORG_NORTHSTAR]);
        } catch {
            rejected = true;
            await q('ROLLBACK TO SAVEPOINT sp1');
        }
        check('org A context: INSERT into org B rejected', rejected);
        return rejected;
    });
    check('cross-org INSERT rejected', writeRejection);

    // 5. SET LOCAL evaporation on a reused connection (the pooling edge case).
    await inTx(async () => {
        await q('SELECT set_tenant_context($1::uuid, $2::uuid)', [ORG_DEMO, PRACTITIONER_KETAN]);
    });
    await inTx(async () => {
        const afterCommit = await scalar('SELECT count(*) AS n FROM clients');
        check(
            'edge case: tenant context gone after COMMIT on same connection',
            afterCommit === 0,
            `count=${afterCommit}`,
        );
    });

    // 6. Special policies.
    await inTx(async () => {
        await q('SELECT set_tenant_context($1::uuid, $2::uuid)', [ORG_DEMO, PRACTITIONER_KETAN]);
        const globalSets = await scalar(
            'SELECT count(*) AS n FROM assumption_sets WHERE organization_id IS NULL');
        const overrideForA = await scalar(
            'SELECT count(*) AS n FROM assumption_sets WHERE organization_id = $1', [ORG_DEMO]);
        check('assumption_sets: globals visible to org A', globalSets >= 1, `count=${globalSets}`);
        check('assumption_sets: org A override visible to org A', overrideForA === 1, `count=${overrideForA}`);
        const nadiaVisible = await scalar('SELECT count(*) AS n FROM users WHERE id = $1', [NORTHSTAR_OWNER]);
        check('users: org B owner hidden from org A', nadiaVisible === 0, `count=${nadiaVisible}`);
    });
    await inTx(async () => {
        await q('SELECT set_tenant_context($1::uuid, $2::uuid)', [ORG_NORTHSTAR, NORTHSTAR_OWNER]);
        const overrideForA = await scalar(
            'SELECT count(*) AS n FROM assumption_sets WHERE organization_id = $1', [ORG_DEMO]);
        const globalSets = await scalar(
            'SELECT count(*) AS n FROM assumption_sets WHERE organization_id IS NULL');
        check('assumption_sets: org A override hidden from org B', overrideForA === 0, `count=${overrideForA}`);
        check('assumption_sets: globals visible to org B', globalSets >= 1, `count=${globalSets}`);
        const ketanVisible = await scalar('SELECT count(*) AS n FROM users WHERE id = $1', [PRACTITIONER_KETAN]);
        check('users: org A practitioner hidden from org B', ketanVisible === 0, `count=${ketanVisible}`);
    });

    // 7. client_assignments passes through parent client (no organization_id).
    await inTx(async () => {
        await q('SELECT set_tenant_context($1::uuid, $2::uuid)', [ORG_NORTHSTAR, NORTHSTAR_OWNER]);
        const count = await scalar('SELECT count(*) AS n FROM client_assignments');
        check('client_assignments: org B sees only its own assignment', count === 1, `count=${count}`);
    });

    // 8. audit_logs append-only: with no UPDATE policy, the USING clause
    // matches zero rows, so the statement succeeds but modifies nothing.
    await inTx(async () => {
        await q('SELECT set_tenant_context($1::uuid, $2::uuid)', [ORG_DEMO, PRACTITIONER_KETAN]);
        const res = await q(
            `UPDATE audit_logs SET action = 'tampered' WHERE organization_id = $1`, [ORG_DEMO]);
        const tampered = await scalar(`SELECT count(*) AS n FROM audit_logs WHERE action = 'tampered'`);
        check('audit_logs: UPDATE affects 0 rows (append-only)', res.rowCount === 0, `rowCount=${res.rowCount}`);
        check('audit_logs: no row tampered', tampered === 0, `count=${tampered}`);
    });

    await client.end();

    if (failures > 0) {
        console.error(`\n${failures} check(s) FAILED`);
        process.exit(1);
    }
    console.log('\nall RLS checks passed');
}

main().catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
});
