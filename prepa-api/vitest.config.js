import { defineWorkersConfig } from '@cloudflare/vitest-pool-workers/config';

export default defineWorkersConfig({
  test: {
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
          },
        },
      },
    },
  },
});
