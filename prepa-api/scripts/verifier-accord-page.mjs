// Vérifie que la page et le serveur parlent des mêmes valeurs.
//
// Il existe deux listes qui doivent s'accorder et que rien ne rapprochait :
// les valeurs des boutons radio de prepa.html, et les clés de variante
// déclarées par les programmes. La page envoyait « Bordeaux » là où le
// serveur attendait « bordeaux », et toute inscription au marathon échouait
// sur « Variante de course inconnue pour P4 ». Aucun test ne pouvait le voir :
// chaque côté était parfaitement cohérent avec lui-même.
//
// Ce contrôle vit hors de vitest parce que la suite tourne dans le runtime
// Workers, qui n'a pas de système de fichiers et ne peut donc pas lire la page
// telle qu'elle est servie. Le lire est pourtant tout l'intérêt : une copie
// des valeurs dans un test finirait par diverger, ce qui est exactement le
// défaut qu'on corrige ici.
//
// Lancé par `npm test` avant vitest, il échoue en signalant la valeur fautive.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { PROGRAMMES } from '../src/programmes/index.js';

const ICI = dirname(fileURLToPath(import.meta.url));
const RACINE = join(ICI, '..', '..');

const lire = (chemin) => readFileSync(join(RACINE, chemin), 'utf8');
const page = lire('prepa.html');
const script = lire('js/prepa.js');

const erreurs = [];
const verifier = (condition, message) => { if (!condition) erreurs.push(message); };

// Garde-fou du contrôle lui-même : un fichier vide ou déplacé ne doit pas
// passer pour un accord parfait.
verifier(page.includes('name="variante"'), 'prepa.html ne contient aucun bouton de variante : le contrôle ne vérifie rien.');
verifier(script.includes('var PROGRAMMES'), 'js/prepa.js ne contient pas le catalogue : le contrôle ne vérifie rien.');

// --- Variantes de course ---------------------------------------------------

const offertes = [...page.matchAll(/name="variante"\s+value="([^"]+)"/g)].map((m) => m[1]);
const declarees = new Set(
  Object.values(PROGRAMMES).flatMap((p) => p.variantesCourse ?? []).map((v) => v.cle),
);

for (const valeur of offertes) {
  verifier(
    declarees.has(valeur),
    `prepa.html propose la variante "${valeur}", qu'aucun programme ne déclare. Connues : ${[...declarees].join(', ')}.`,
  );
}
for (const cle of declarees) {
  verifier(offertes.includes(cle), `la variante "${cle}" est déclarée côté serveur mais absente de prepa.html.`);
}

// --- Codes de programme du catalogue ---------------------------------------

const codesPage = [...script.matchAll(/\{\s*code:\s*'(P\d+)'/g)].map((m) => m[1]);
const codesServeur = Object.keys(PROGRAMMES);

for (const code of codesPage) {
  verifier(codesServeur.includes(code), `le catalogue de la page propose ${code}, absent du serveur.`);
}
for (const code of codesServeur) {
  verifier(codesPage.includes(code), `le serveur sert ${code}, absent du catalogue de la page.`);
}

// --- Verdict ---------------------------------------------------------------

if (erreurs.length > 0) {
  console.error('\nDésaccord entre la page et le serveur :\n');
  for (const e of erreurs) console.error('  ' + e);
  console.error('');
  process.exit(1);
}

console.log(
  `Accord page/serveur vérifié : ${offertes.length} variante(s), ${codesPage.length} programme(s).`,
);
