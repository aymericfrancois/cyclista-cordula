-- Garde-robe. `zones` et `photos` sont des tableaux JSON.
-- `sport` permet d'ajouter la course à pied plus tard.
CREATE TABLE pieces (
  id TEXT PRIMARY KEY,
  sport TEXT NOT NULL DEFAULT 'velo',
  nom TEXT NOT NULL,
  marque TEXT NOT NULL DEFAULT '',
  lien TEXT,
  type TEXT NOT NULL,
  zones TEXT NOT NULL,
  composition TEXT NOT NULL DEFAULT '',
  grammage TEXT NOT NULL DEFAULT '',
  chaleur INTEGER NOT NULL DEFAULT 0 CHECK (chaleur BETWEEN 0 AND 5),
  coupe_vent INTEGER NOT NULL DEFAULT 0 CHECK (coupe_vent BETWEEN 0 AND 5),
  impermeabilite INTEGER NOT NULL DEFAULT 0 CHECK (impermeabilite BETWEEN 0 AND 5),
  respirabilite INTEGER NOT NULL DEFAULT 0 CHECK (respirabilite BETWEEN 0 AND 5),
  compressible INTEGER NOT NULL DEFAULT 0 CHECK (compressible IN (0, 1)),
  etat TEXT NOT NULL DEFAULT 'dispo' CHECK (etat IN ('dispo', 'sale', 'lavage')),
  photos TEXT NOT NULL DEFAULT '[]',
  image_propre TEXT,
  cree_le TEXT NOT NULL DEFAULT (datetime('now')),
  maj_le TEXT NOT NULL DEFAULT (datetime('now'))
);
