-- Histórico das conversas com o Théo.
-- Rodar manualmente uma vez contra o D1 remoto:
--   wrangler d1 execute treinai-db --remote --file=./migrations/0007_add_coach_conversations.sql

CREATE TABLE IF NOT EXISTS coach_conversations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_coach_conversations_user ON coach_conversations(user_id, updated_at);

CREATE TABLE IF NOT EXISTS coach_messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES coach_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL, -- user | assistant
  content TEXT NOT NULL,
  -- Treinos criados/alterados pelo Théo nessa resposta (JSON), para o card "Ver treino" voltar ao reabrir
  actions TEXT,
  -- Instrução enviada pelo app em nome do usuário (ex.: boas-vindas do onboarding): vai para o modelo, não aparece no chat
  hidden INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_coach_messages_conversation ON coach_messages(conversation_id, created_at);
