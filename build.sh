#!/usr/bin/env bash
#
# Reconstruit dist/, le dossier publié par Cloudflare Pages.
#
# Le point important : dist/ est reconstruit de zéro à chaque fois. Avant,
# il était alimenté par des copies successives, si bien qu'il avait fini par
# accumuler le code du backend (prepa-api/, dont son .dev.vars) et le servir
# publiquement. Tout ce qui se retrouve ici est visible sur Internet, donc
# on liste explicitement ce qui entre au lieu de retirer ce qui gêne.
#
# Usage : ./build.sh        puis      npx wrangler pages deploy dist
#
set -euo pipefail
cd "$(dirname "$0")"

SITE="https://coureursdesvignes.fr"

rm -rf dist
mkdir dist

# Pages, en-têtes HTTP et fichiers destinés aux moteurs de recherche.
cp ./*.html dist/
cp _headers robots.txt dist/

# Ressources statiques.
cp -R css js assets dist/

# ---- sitemap.xml -----------------------------------------------------------
#
# Cloudflare Pages redirige /page.html vers /page en 308. Le sitemap doit donc
# annoncer les adresses sans extension, sinon Google classe chaque page en
# « page avec redirection » et ne l'indexe pas.
#
# 404.html est exclu : une page d'erreur n'a rien à faire dans un sitemap.

{
  echo '<?xml version="1.0" encoding="UTF-8"?>'
  echo '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'

  for fichier in ./*.html; do
    nom=$(basename "$fichier" .html)
    [ "$nom" = "404" ] && continue

    if [ "$nom" = "index" ]; then
      url="$SITE/"
    else
      url="$SITE/$nom"
    fi

    lastmod=$(date -r "$fichier" +%Y-%m-%d)

    printf '  <url>\n    <loc>%s</loc>\n    <lastmod>%s</lastmod>\n  </url>\n' "$url" "$lastmod"
  done

  echo '</urlset>'
} > dist/sitemap.xml

pages=$(grep -c '<loc>' dist/sitemap.xml)
echo "dist/ reconstruit : $(find dist -type f | wc -l | tr -d ' ') fichiers, $pages URL dans le sitemap."
