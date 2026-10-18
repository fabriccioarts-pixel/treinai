-- Gamificação: registro de XP (nutrição, água, missões), escudos de constância e dias protegidos.
-- Rodar manualmente uma vez contra o D1 remoto:
--   wrangler d1 execute treinai-db --remote --file=./migrations/0010_gamification.sql

-- Cada ganho de XP é único por (usuário, origem, referência): conceder de novo não duplica
CREATE TABLE IF NOT EXISTS xp_events (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source TEXT NOT NULL, -- agua | refeicoes | calorias | missao
  ref TEXT NOT NULL, -- ex.: data "2026-10-18" ou "2026-W42:treinos"
  amount INTEGER NOT NULL,
  label TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (user_id, source, ref)
);
CREATE INDEX IF NOT EXISTS idx_xp_events_user ON xp_events(user_id, created_at);

-- Escudos de constância: ganha 1 a cada 7 dias seguidos (máx. 2 guardados)
CREATE TABLE IF NOT EXISTS streak_shields (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  available INTEGER NOT NULL DEFAULT 0,
  last_awarded_streak INTEGER NOT NULL DEFAULT 0,
  used_total INTEGER NOT NULL DEFAULT 0
);

-- Dias (UTC, AAAA-MM-DD) em que um escudo segurou a constância
CREATE TABLE IF NOT EXISTS streak_shield_days (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day TEXT NOT NULL,
  PRIMARY KEY (user_id, day)
);
