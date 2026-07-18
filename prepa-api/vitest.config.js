import { defineWorkersConfig, readD1Migrations } from '@cloudflare/vitest-pool-workers/config';
import path from 'node:path';

export default defineWorkersConfig(async () => {
  // Les migrations de la base D1 simulee ne sont pas appliquees
  // automatiquement par vitest-pool-workers : on les lit ici et on les
  // rejoue via test/appliquer-migrations.js (setupFiles), sinon les tables
  // (ex. "tentatives") n'existent pas dans les tests.
  const migrationsPath = path.join(__dirname, 'migrations');
  const migrations = await readD1Migrations(migrationsPath);

  return {
    test: {
      setupFiles: ['./test/appliquer-migrations.js'],
      poolOptions: {
        workers: {
          wrangler: { configPath: './wrangler.toml' },
          miniflare: {
            d1Databases: ['DB'],
            // Valeurs de test volontairement factices. Les vrais codes d'acces
            // vivent dans .dev.vars (ignore par git) et en secrets Cloudflare.
            // Ne jamais remettre les codes de production ici : ce fichier est versionne.
            bindings: {
              CODE_COUREUR: 'coureur-test',
              CODE_ADMIN: 'admin-test',
              SECRET_JETON: 'secret-de-test',
              EMAIL_ADMIN: 'test@example.com',
              SITE_URL: 'https://example.test',
              TEST_MIGRATIONS: migrations,
            },
          },
        },
      },
    },
  };
});
