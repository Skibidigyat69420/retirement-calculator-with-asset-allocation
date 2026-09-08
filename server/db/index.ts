import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/sound_thesis',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

export const db = {
  query: (text: string, params?: any[]) => pool.query(text, params),
  
  // A wrapper for executing queries within a specific tenant context
  withTenant: async <T>(organizationId: string, callback: (client: any) => Promise<T>): Promise<T> => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      // Set the session variable for RLS
      await client.query('SET LOCAL app.current_organization_id = $1', [organizationId]);
      
      const result = await callback(client);
      
      await client.query('COMMIT');
      return result;
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  },
  
  getPool: () => pool
};
