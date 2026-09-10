import { execFileSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Full-schema test database for the security suites.
 *
 * Core tests (core.test.ts) intentionally run against the throwaway
 * `postgres` DB with the minimal 3-table bootstrap. The route-level security
 * suites in tenancyIsolation / authorization / idempotencyRateLimit /
 * rlsDirect need the REAL platform schema (all tables + RLS policies from
 * supabase/migrations), so they run against a dedicated `stw_test` database
 * on the same localhost:54330 server.
 *
 * setupMigratedDb() is idempotent and safe to call from every test file's
 * beforeAll (vitest forks give each file its own process, and a cluster-wide
 * advisory lock serializes first-time creation/migration across files):
 *   - creates database `stw_test` if missing (already-exists is fine),
 *   - applies every supabase/migrations/*.sql in filename order via psql
 *     with ON_ERROR_STOP=1 (the migrations contain DO blocks and triggers,
 *     so statement-splitting in JS would be unsafe — psql is the parser),
 *   - skips migration application when the schema is already present.
 *
 * Env override: TEST_DATABASE_URL (defaults to
 * postgres://postgres@localhost:54330/stw_test).
 */

const MAINTENANCE_URL =
  process.env['MAINTENANCE_DATABASE_URL'] ??
  'postgres://postgres@localhost:54330/postgres';
const SETUP_LOCK_KEY = 727_472; // arbitrary advisory-lock id for setup serialization

let ready = false;

/** DATABASE_URL for the fully-migrated security-test database. */
export function testDbUrl(): string {
  return (
    process.env['TEST_DATABASE_URL'] ??
    'postgres://postgres@localhost:54330/stw_test'
  );
}

/** True once this process has run setupMigratedDb() successfully. */
export function migratedDbReady(): boolean {
  return ready;
}

function migrationsDir(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  return join(here, '..', '..', 'supabase', 'migrations');
}

function applyMigrations(): void {
  const dir = migrationsDir();
  const files = readdirSync(dir)
    .filter((f) => f.endsWith('.sql'))
    .sort();
  if (files.length === 0) {
    throw new Error(`No migration files found in ${dir}`);
  }

  let hasPsql = true;
  try {
    execFileSync('which', ['psql'], { stdio: 'ignore' });
  } catch {
    hasPsql = false;
  }

  if (hasPsql) {
    for (const file of files) {
      try {
        execFileSync(
          'psql',
          ['-X', '-v', 'ON_ERROR_STOP=1', '-d', testDbUrl(), '-f', join(dir, file)],
          { stdio: 'pipe', encoding: 'utf8' },
        );
      } catch (err) {
        const detail =
          err && typeof err === 'object' && 'stderr' in err
            ? String((err as { stderr: unknown }).stderr)
            : String(err);
        throw new Error(`Migration ${file} failed:\n${detail}`);
      }
    }
    return;
  }

  // Fallback when psql is not available on PATH: run migrate.ts script
  const scriptPath = join(dirname(fileURLToPath(import.meta.url)), '..', 'scripts', 'migrate.ts');
  execFileSync('npx', ['tsx', scriptPath], {
    env: { ...process.env, DATABASE_URL: testDbUrl(), MIGRATIONS_DIR: dir },
    stdio: 'pipe',
    encoding: 'utf8',
  });
}

/**
 * Ensure `stw_test` exists with the full platform schema applied.
 * Returns the DATABASE_URL to use. Safe to call repeatedly.
 */
export async function setupMigratedDb(): Promise<string> {
  if (ready) return testDbUrl();

  const postgres = (await import('postgres')).default;

  // 1. Create the database if missing (connect to the maintenance DB).
  const admin = postgres(MAINTENANCE_URL, { max: 1 });
  try {
    const [existing] =
      await admin`SELECT 1 FROM pg_database WHERE datname = 'stw_test'`;
    if (!existing) {
      try {
        await admin`CREATE DATABASE stw_test`;
      } catch (err) {
        if ((err as { code?: string }).code !== '42P04') throw err; // race: another file created it
      }
    }
  } finally {
    await admin.end();
  }

  // 2. Serialize first-time schema application across parallel test files
  //    with an advisory lock, then apply migrations only when absent.
  const sql = postgres(testDbUrl(), { max: 1 });
  try {
    await sql`SELECT pg_advisory_lock(${SETUP_LOCK_KEY})`;
    const [invitations] = await sql`
      SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'invitations'
    `;
    if (!invitations) applyMigrations();

    const [clientsPolicy] = await sql`
      SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'clients'
    `;
    if (!clientsPolicy) {
      throw new Error('stw_test schema incomplete: RLS policies missing on clients');
    }
  } finally {
    await sql.end();
  }

  ready = true;
  return testDbUrl();
}
