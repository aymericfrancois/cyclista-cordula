-- Retours d'usage de l'utilisateur sur la pièce (ex. « je transpire beaucoup dedans »).
ALTER TABLE pieces ADD COLUMN notes TEXT NOT NULL DEFAULT '';
