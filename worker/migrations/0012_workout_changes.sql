-- Histórico de mudanças no treino (criar, alterar, remover), pelo app ou pelo Théo.
-- Base do aviso de "trocas frequentes": resultado vem de repetir o treino e progredir a carga.
-- Rodar manualmente uma vez contra o D1 remoto:
--   wrangler d1 execute treinai-db --remote --file=./migrations/0012_workout_changes.sql

CREATE TABLE IF NOT EXISTS workout_changes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  workout_id TEXT NOT NULL,
  kind TEXT NOT NULL, -- criado | alterado | removido
  changed_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_workout_changes_user ON workout_changes(user_id, changed_at);
