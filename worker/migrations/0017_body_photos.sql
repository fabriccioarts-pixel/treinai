-- Fotos do corpo para acompanhar a evolução, e a análise do shape pela IA.
-- Foto do corpo é dado pessoal sensível (LGPD, art. 11): só com consentimento específico, que pode ser revogado.
-- Rodar manualmente uma vez contra o D1 remoto, ANTES do deploy que usa as tabelas:
--   wrangler d1 execute treinai-db --remote --file=./migrations/0017_body_photos.sql

-- Consentimentos separados: guardar as fotos e, à parte, enviá-las para a IA analisar
CREATE TABLE IF NOT EXISTS body_photo_consents (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  photos_consent_at TEXT, -- NULL = sem consentimento para guardar fotos
  ai_consent_at TEXT, -- NULL = sem consentimento para análise por IA
  adult_confirmed_at TEXT, -- a pessoa confirmou ter 18 anos ou mais
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS body_photos (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pose TEXT NOT NULL CHECK (pose IN ('frente', 'lado', 'costas')),
  photo_key TEXT NOT NULL, -- objeto privado no R2 (bucket PHOTOS)
  taken_on TEXT NOT NULL, -- AAAA-MM-DD no fuso do usuário: agrupa as poses de um mesmo dia
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_body_photos_user ON body_photos(user_id, taken_on);

CREATE TABLE IF NOT EXISTS body_analyses (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  taken_on TEXT NOT NULL, -- dia das fotos analisadas
  result TEXT NOT NULL, -- JSON: resumo, pontos fortes, prioridades e treino sugerido
  workout_id TEXT, -- treino criado a partir da sugestão, se a pessoa aceitou
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_body_analyses_user ON body_analyses(user_id, created_at);
