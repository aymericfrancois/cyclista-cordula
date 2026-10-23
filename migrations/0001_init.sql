-- Réglages clé/valeur (ex. décalages personnels par zone, phase 7).
CREATE TABLE reglages (
  cle TEXT PRIMARY KEY,
  valeur TEXT NOT NULL,
  maj_le TEXT NOT NULL DEFAULT (datetime('now'))
);
