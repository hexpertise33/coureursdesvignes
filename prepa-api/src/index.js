const JSON_HEADERS = { 'content-type': 'application/json; charset=utf-8' };

export function json(donnees, statut = 200, entetes = {}) {
  return new Response(JSON.stringify(donnees), {
    status: statut,
    headers: { ...JSON_HEADERS, ...entetes },
  });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === '/api/sante') return json({ ok: true });

    return json({ erreur: 'route inconnue' }, 404);
  },

  async scheduled(event, env, ctx) {
    // Rempli en tâche 14.
  },
};
