-- Inscrições de Web Push (um registro por aparelho/navegador), usadas pelos lembretes de água e de treino.
-- Rodar manualmente uma vez contra o D1 remoto:
--   wrangler d1 execute treinai-db --remote --file=./migrations/0008_add_push_subscriptions.sql

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON push_subscriptions(user_id);
