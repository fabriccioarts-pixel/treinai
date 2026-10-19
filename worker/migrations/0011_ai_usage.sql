-- Custos de IA: cache de contexto do Gemini (parte fixa do Théo) e limite diário de voz.
-- Rodar manualmente uma vez contra o D1 remoto:
--   wrangler d1 execute treinai-db --remote --file=./migrations/0011_ai_usage.sql

-- Cache explícito do Gemini compartilhado entre os isolates do worker (um por versão do prompt)
CREATE TABLE IF NOT EXISTS ai_caches (
  fingerprint TEXT PRIMARY KEY, -- hash do modelo + prompt fixo + ferramentas
  name TEXT NOT NULL, -- "cachedContents/..." devolvido pelo Gemini
  expires_at TEXT NOT NULL
);

-- Ligações de voz, para o limite de minutos por dia
CREATE TABLE IF NOT EXISTS voice_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  local_date TEXT NOT NULL, -- AAAA-MM-DD no fuso do usuário
  started_at TEXT NOT NULL,
  allowed_ms INTEGER NOT NULL,
  ended_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_voice_sessions_user_date ON voice_sessions(user_id, local_date);
