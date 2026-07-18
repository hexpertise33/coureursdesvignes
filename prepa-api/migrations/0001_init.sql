CREATE TABLE coureurs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  prenom TEXT NOT NULL,
  cle TEXT NOT NULL UNIQUE,
  programme TEXT NOT NULL,
  variante_course TEXT,
  fait_izon INTEGER NOT NULL DEFAULT 0,
  cree_le TEXT NOT NULL
);

CREATE TABLE validations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  coureur_id INTEGER NOT NULL REFERENCES coureurs(id) ON DELETE CASCADE,
  semaine INTEGER NOT NULL,
  seance TEXT NOT NULL,
  ressenti TEXT,
  note TEXT,
  valide_le TEXT NOT NULL,
  UNIQUE(coureur_id, semaine, seance)
);

CREATE TABLE semaines_override (
  programme TEXT NOT NULL,
  semaine INTEGER NOT NULL,
  contenu_json TEXT,
  veto INTEGER NOT NULL DEFAULT 0,
  modifie_le TEXT NOT NULL,
  PRIMARY KEY (programme, semaine)
);

CREATE TABLE tentatives (
  ip TEXT NOT NULL,
  heure TEXT NOT NULL,
  compte INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (ip, heure)
);

CREATE INDEX idx_validations_coureur ON validations(coureur_id);
CREATE INDEX idx_validations_semaine ON validations(semaine);
