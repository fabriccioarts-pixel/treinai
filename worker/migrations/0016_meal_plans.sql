-- Cardápio da semana e lista de compras gerados pela IA a partir das metas do perfil.
-- Rodar manualmente uma vez contra o D1 remoto, ANTES do deploy que usa a tabela:
--   wrangler d1 execute treinai-db --remote --file=./migrations/0016_meal_plans.sql

CREATE TABLE IF NOT EXISTS meal_plans (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  local_date TEXT NOT NULL, -- AAAA-MM-DD no fuso do usuário, para o limite de gerações por dia
  preferences TEXT NOT NULL, -- JSON: refeições por dia, tipo de dieta, alimentos evitados, rotina
  plan TEXT NOT NULL, -- JSON: 7 dias, substituições e lista de compras
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_meal_plans_user ON meal_plans(user_id, created_at);
