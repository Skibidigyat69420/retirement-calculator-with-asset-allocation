import { buildApp } from './app.js';
import { env } from './config.js';
import { pool } from './db/client.js';

const app = await buildApp();

try {
  await app.listen({ port: env.PORT, host: '0.0.0.0' });
} catch (err) {
  app.log.error(err);
  await pool.end().catch(() => {});
  process.exit(1);
}

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    void app
      .close()
      .then(() => pool.end())
      .finally(() => process.exit(0));
  });
}
