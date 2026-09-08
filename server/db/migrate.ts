/**
 * Migration runner: applies server/db/migrations/*.sql in filename order and
 * records each one in schema_migrations. Idempotent — already-applied files
 * are skipped. Each migration runs in its own transaction; a SQL error rolls
 * back that migration and exits non-zero.
 *
 * Usage: npm run db:migrate   (DATABASE_URL env or the documented default)
 */
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { databaseUrl } from './connection.ts';

const { Client } = pg;

const MIGRATIONS_DIR = path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    'migrations',
);

async function main(): Promise<void> {
    const client = new Client({ connectionString: databaseUrl() });
    await client.connect();

    try {
        await client.query(`
            CREATE TABLE IF NOT EXISTS schema_migrations (
                filename TEXT PRIMARY KEY,
                applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
            )
        `);

        const files = (await readdir(MIGRATIONS_DIR))
            .filter((f) => f.endsWith('.sql'))
            .sort();

        const { rows: appliedRows } = await client.query<{ filename: string }>(
            'SELECT filename FROM schema_migrations',
        );
        const applied = new Set(appliedRows.map((r) => r.filename));

        let appliedCount = 0;
        for (const file of files) {
            if (applied.has(file)) continue;

            const sql = await readFile(path.join(MIGRATIONS_DIR, file), 'utf8');
            await client.query('BEGIN');
            try {
                await client.query(sql);
                await client.query(
                    'INSERT INTO schema_migrations (filename) VALUES ($1)',
                    [file],
                );
                await client.query('COMMIT');
            } catch (err) {
                await client.query('ROLLBACK');
                throw new Error(`Migration ${file} failed: ${String(err)}`);
            }
            console.log(`applied  ${file}`);
            appliedCount += 1;
        }

        if (appliedCount === 0) {
            console.log('database schema is up to date');
        } else {
            console.log(`${appliedCount} migration(s) applied`);
        }
    } finally {
        await client.end();
    }
}

main().catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
});
