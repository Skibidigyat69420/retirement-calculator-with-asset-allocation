import postgres from 'postgres';
import { createFieldCipher } from '../src/fieldEncryption.js';

const databaseUrl = process.env.DATABASE_URL?.trim();
const cipher = createFieldCipher();
if (!databaseUrl) throw new Error('DATABASE_URL is required.');
if (!cipher) throw new Error('FIELD_ENCRYPTION_KEY is required.');

const sql = postgres(databaseUrl, { max: 1, prepare: false, ssl: 'require' });
const protectedClientColumns = ['first_name', 'last_name', 'preferred_name', 'email', 'phone', 'date_of_birth', 'marital_status', 'notes'] as const;

try {
  const clients = await sql`select id, first_name, last_name, preferred_name, email, phone, date_of_birth, marital_status, notes from clients`;
  for (const client of clients) {
    const next = Object.fromEntries(protectedClientColumns.map((column) => {
      const value = client[column] as string | null;
      return [column, value?.startsWith('stwenc:v1:') ? value : cipher.encryptString(value)];
    }));
    await sql`update clients set first_name = ${next.first_name}, last_name = ${next.last_name}, preferred_name = ${next.preferred_name}, email = ${next.email}, phone = ${next.phone}, date_of_birth = ${next.date_of_birth}, marital_status = ${next.marital_status}, notes = ${next.notes}, updated_at = now() where id = ${client.id}`;
  }

  for (const [table, column] of [['financial_resources', 'data'], ['plan_versions', 'input_snapshot'], ['calculation_runs', 'result']] as const) {
    const rows = await sql.unsafe(`select id, ${column} from ${table}`);
    for (const row of rows) {
      const value = row[column];
      if (value?.__stwEncrypted === 'v1') continue;
      const touchesUpdatedAt = table === 'financial_resources';
      await sql.unsafe(`update ${table} set ${column} = $1::jsonb${touchesUpdatedAt ? ', updated_at = now()' : ''} where id = $2`, [JSON.stringify(cipher.encryptJson(value ?? {})), row.id]);
    }
  }

  const versions = await sql`select id, assumptions_snapshot from plan_versions`;
  for (const version of versions) {
    if (version.assumptions_snapshot?.__stwEncrypted === 'v1') continue;
    await sql`update plan_versions set assumptions_snapshot = ${sql.json(cipher.encryptJson(version.assumptions_snapshot ?? {}) as any)} where id = ${version.id}`;
  }
  console.log('Encrypted existing sensitive records.');
} finally {
  await sql.end();
}
