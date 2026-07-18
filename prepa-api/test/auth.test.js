import { env } from 'cloudflare:test';
import { describe, it, expect } from 'vitest';
import { creerJeton, verifierJeton, roleDepuisRequete, debitDepasse } from '../src/auth.js';

const S = 'secret-de-test';

describe('jetons', () => {
  it('accepte un jeton valide', async () => {
    const j = await creerJeton(S, 'coureur', 60000);
    expect(await verifierJeton(S, j)).toEqual({ role: 'coureur' });
  });

  it('rejette un jeton signé avec un autre secret', async () => {
    const j = await creerJeton('autre', 'admin', 60000);
    expect(await verifierJeton(S, j)).toBeNull();
  });

  it('rejette un jeton dont le rôle a été modifié', async () => {
    const j = await creerJeton(S, 'coureur', 60000);
    const falsifie = j.replace('coureur', 'admin');
    expect(await verifierJeton(S, falsifie)).toBeNull();
  });

  it('rejette un jeton expiré', async () => {
    const j = await creerJeton(S, 'coureur', -1000);
    expect(await verifierJeton(S, j)).toBeNull();
  });

  it('rejette une chaîne quelconque', async () => {
    expect(await verifierJeton(S, 'nimportequoi')).toBeNull();
    expect(await verifierJeton(S, '')).toBeNull();
  });

  it('rejette un rôle hors liste fermée même correctement signé', async () => {
    // On fabrique un jeton avec un rôle arbitraire, signé exactement comme
    // creerJeton l'aurait fait, pour vérifier que la liste de rôles autorisés
    // est bien fermée à 'coureur' et 'admin' et ne dépend pas que de la signature.
    const charge = `super-admin.${Date.now() + 60000}`;
    const cle = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(S),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const signatureBrute = await crypto.subtle.sign('HMAC', cle, new TextEncoder().encode(charge));
    let s = '';
    for (const o of new Uint8Array(signatureBrute)) s += String.fromCharCode(o);
    const signature = btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const jeton = `${charge}.${signature}`;
    expect(await verifierJeton(S, jeton)).toBeNull();
  });
});

describe('rôle depuis la requête', () => {
  it('lit le cookie', async () => {
    const j = await creerJeton(env.SECRET_JETON, 'admin', 60000);
    const r = new Request('https://x.test/', { headers: { cookie: `prepa=${j}` } });
    expect(await roleDepuisRequete(r, env)).toBe('admin');
  });

  it('renvoie null sans cookie', async () => {
    expect(await roleDepuisRequete(new Request('https://x.test/'), env)).toBeNull();
  });
});

describe('limitation de débit', () => {
  it('bloque après 10 tentatives dans l\'heure', async () => {
    for (let i = 0; i < 10; i++) {
      expect(await debitDepasse(env.DB, '1.2.3.4')).toBe(false);
    }
    expect(await debitDepasse(env.DB, '1.2.3.4')).toBe(true);
  });

  it('compte les IP séparément', async () => {
    expect(await debitDepasse(env.DB, '9.9.9.9')).toBe(false);
  });
});
