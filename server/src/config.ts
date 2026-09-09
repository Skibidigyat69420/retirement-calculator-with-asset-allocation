import { z } from 'zod';

const envSchema = z.object({
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  DATABASE_URL: z
    .string()
    .min(1, 'DATABASE_URL is required (postgres:// user:pass@host:port/db)'),
  AUTH_MODE: z.enum(['supabase', 'dev']).default('dev'),
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  SUPABASE_JWT_SECRET: z.string().min(1).default('dev-only-secret-change-me'),
  SUPABASE_JWKS_URL: z.string().url().optional(),
  ENGINE_VERSION: z.string().min(1).default('1.0.0'),
  ALLOW_SEED: z
    .string()
    .default('false')
    .transform((v) => v === 'true'),
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
    .default('info'),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join('.') || '(env)'}: ${i.message}`)
      .join('\n');
    throw new Error(
      `Invalid environment configuration — refusing to boot:\n${issues}`,
    );
  }
  return parsed.data;
}

export const env: Env = loadEnv();
