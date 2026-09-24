import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import postgres from 'postgres';

const databaseUrl = process.env.DATABASE_URL?.trim();

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required to run migrations.');
}

const sql = postgres(databaseUrl, { max: 1, prepare: false });
const migrationsDir = join(process.cwd(), 'db', 'migrations');

await sql`
  create table if not exists schema_migrations (
    filename text primary key,
    applied_at timestamptz not null default now()
  )
`;

const files = (await readdir(migrationsDir)).filter((file) => file.endsWith('.sql')).sort();

for (const file of files) {
  const alreadyApplied = await sql`select 1 from schema_migrations where filename = ${file} limit 1`;
  if (alreadyApplied.length > 0) continue;

  const migration = await readFile(join(migrationsDir, file), 'utf8');
  await sql.begin(async (tx) => {
    await tx.unsafe(migration);
    await tx`insert into schema_migrations (filename) values (${file})`;
  });
  console.log(`applied ${file}`);
}

await sql.end();
