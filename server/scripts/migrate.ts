/**
 * Applies supabase/migrations/*.sql to DATABASE_URL in filename order.
 *
 * Idempotent: applied files are recorded in `schema_migrations`; reruns skip
 * them. Each file is applied inside its own transaction and committed only on
 * success, so a failing migration leaves the database unchanged.
 *
 * Migrations contain DO blocks and triggers, so they are split into
 * statements with a quote-aware parser (single quotes, -- and / * * / comments,
 * and $tag$ ... $tag$ dollar quoting) rather than a naive `;` split.
 *
 * Env:
 *   DATABASE_URL      — target database (required)
 *   MIGRATIONS_DIR    — defaults to <repo>/supabase/migrations
 */
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import postgres from 'postgres';

const here = dirname(fileURLToPath(import.meta.url));
const defaultDir = resolve(here, '..', '..', 'supabase', 'migrations');
const migrationsDir = process.env['MIGRATIONS_DIR'] ?? defaultDir;
const databaseUrl: string = (() => {
  const url = process.env['DATABASE_URL'];
  if (!url) throw new Error('migrate: DATABASE_URL is required');
  return url;
})();

/** Split SQL text into statements on top-level semicolons. */
export function splitStatements(sql: string): string[] {
  const statements: string[] = [];
  let current = '';
  let i = 0;
  const n = sql.length;

  while (i < n) {
    const ch = sql[i]!;
    const next = sql[i + 1];

    // Line comment: -- ... \n
    if (ch === '-' && next === '-') {
      while (i < n && sql[i] !== '\n') i++;
      continue;
    }
    // Block comment: /* ... */
    if (ch === '/' && next === '*') {
      i += 2;
      while (i < n && !(sql[i] === '*' && sql[i + 1] === '/')) i++;
      i += 2;
      continue;
    }
    // Single-quoted string ('' escapes a quote)
    if (ch === "'") {
      current += ch;
      i++;
      while (i < n) {
        current += sql[i];
        if (sql[i] === "'") {
          if (sql[i + 1] === "'") {
            current += sql[i + 1];
            i += 2;
            continue;
          }
          i++;
          break;
        }
        i++;
      }
      continue;
    }
    // Dollar-quoted string: $tag$ ... $tag$
    if (ch === '$') {
      let j = i + 1;
      while (j < n && /[A-Za-z0-9_]/.test(sql[j]!)) j++;
      if (sql[j] === '$') {
        const tag = sql.slice(i, j + 1); // includes both $...$ delimiters
        const end = sql.indexOf(tag, j + 1);
        if (end === -1) {
          current += sql.slice(i);
          i = n;
          continue;
        }
        current += sql.slice(i, end + tag.length);
        i = end + tag.length;
        continue;
      }
    }
    // Statement boundary
    if (ch === ';') {
      statements.push(current);
      current = '';
      i++;
      continue;
    }
    current += ch;
    i++;
  }
  if (current.trim().length > 0) statements.push(current);

  return statements.map((s) => s.trim()).filter((s) => s.length > 0);
}

async function main(): Promise<void> {
  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();
  if (files.length === 0) {
    console.error(`migrate: no .sql files found in ${migrationsDir}`);
    process.exit(1);
  }

  const sql = postgres(databaseUrl, { max: 1 });
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        name       text PRIMARY KEY,
        applied_at timestamptz NOT NULL DEFAULT now()
      )
    `;

    const applied = new Set(
      (await sql`SELECT name FROM schema_migrations`).map((r) => r.name as string),
    );

    for (const file of files) {
      if (applied.has(file)) {
        console.log(`migrate: skip ${file} (already applied)`);
        continue;
      }
      const body = readFileSync(join(migrationsDir, file), 'utf8');
      const statements = splitStatements(body);
      await sql.begin(async (tx) => {
        for (const statement of statements) {
          await tx.unsafe(statement);
        }
        await tx`INSERT INTO schema_migrations (name) VALUES (${file})`;
      });
      console.log(`migrate: applied ${file} (${statements.length} statements)`);
    }
    console.log('migrate: done');
  } finally {
    await sql.end();
  }
}

await main();
