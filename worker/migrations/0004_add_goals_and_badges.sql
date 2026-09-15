-- Metas de progressão de carga e conquistas (gamificação).
-- Rodar manualmente uma vez contra o D1 remoto:
--   wrangler d1 execute treinai-db --remote --file=./migrations/0004_add_goals_and_badges.sql

CREATE TABLE IF NOT EXISTS load_goals (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  exercise_id TEXT NOT NULL REFERENCES exercises(id),
  target_weight REAL NOT NULL,
  target_reps INTEGER NOT NULL DEFAULT 1,
  starting_weight REAL NOT NULL,
  deadline TEXT,
  achieved_at TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_load_goals_user ON load_goals(user_id);

CREATE TABLE IF NOT EXISTS user_badges (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  badge_key TEXT NOT NULL,
  achieved_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, badge_key)
);
CREATE INDEX IF NOT EXISTS idx_user_badges_user ON user_badges(user_id);
