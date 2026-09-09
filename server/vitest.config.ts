import { defineConfig } from 'vitest/config';

/**
 * Core test config. DATABASE_URL defaults to the local docker bootstrap
 * (see test/migrations/0000_test_minimal.sql + README): a throwaway
 * postgres on port 54330 with TEST_BOOTSTRAP=1 applying the minimal
 * core-test schema. Override DATABASE_URL/TEST_BOOTSTRAP via the
 * environment when running against a CI-managed database.
 */
export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    testTimeout: 30_000,
    hookTimeout: 60_000,
    env: {
      NODE_ENV: 'test',
      LOG_LEVEL: 'silent',
      AUTH_MODE: 'dev',
      SUPABASE_JWT_SECRET: 'test-secret',
      ALLOW_SEED: 'false',
      TEST_BOOTSTRAP: '1',
      DATABASE_URL:
        process.env.DATABASE_URL ??
        'postgres://postgres:postgres@localhost:54330/postgres',
    },
  },
});
