// Applique les migrations D1 (migrations/*.sql) a la base simulee avant de
// lancer les tests. Necessaire car vitest-pool-workers ne le fait pas de
// lui-meme : sans ce fichier, des tables comme "tentatives" n'existent pas
// dans env.DB pendant les tests.
import { applyD1Migrations, env } from 'cloudflare:test';

await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
