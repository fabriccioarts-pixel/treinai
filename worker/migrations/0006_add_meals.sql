-- Registro de refeições (foto do prato ou descrição em texto, estimadas pela IA e confirmadas pelo usuário).
-- A foto não é guardada: só serve para a análise e é descartada.
-- Rodar manualmente uma vez contra o D1 remoto:
--   wrangler d1 execute treinai-db --remote --file=./migrations/0006_add_meals.sql

CREATE TABLE IF NOT EXISTS meals (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  local_date TEXT NOT NULL, -- YYYY-MM-DD no fuso do usuário
  meal_type TEXT NOT NULL, -- cafe | almoco | lanche | jantar
  source TEXT NOT NULL, -- foto | texto
  kcal REAL NOT NULL,
  protein_g REAL NOT NULL,
  carbs_g REAL NOT NULL,
  fat_g REAL NOT NULL,
  logged_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_meals_user_date ON meals(user_id, local_date);

CREATE TABLE IF NOT EXISTS meal_items (
  id TEXT PRIMARY KEY,
  meal_id TEXT NOT NULL REFERENCES meals(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  grams REAL NOT NULL,
  kcal REAL NOT NULL,
  protein_g REAL NOT NULL,
  carbs_g REAL NOT NULL,
  fat_g REAL NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_meal_items_meal ON meal_items(meal_id);
