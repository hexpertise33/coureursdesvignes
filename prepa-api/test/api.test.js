import { env, SELF } from 'cloudflare:test';
import { describe, it, expect } from 'vitest';

describe('Worker', () => {
  it('répond sur /api/sante', async () => {
    const r = await SELF.fetch('https://prepa.test/api/sante');
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ ok: true });
  });

  it('renvoie 404 sur une route inconnue', async () => {
    const r = await SELF.fetch('https://prepa.test/api/nimporte-quoi');
    expect(r.status).toBe(404);
  });
});
