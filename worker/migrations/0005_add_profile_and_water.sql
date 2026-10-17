-- Perfil corporal (base do cálculo de TMB/gasto diário), histórico de peso e registro de água.
-- Dados de saúde: dados pessoais sensíveis (LGPD art. 11) — só gravados com consentimento (health_consent_at).
-- Rodar manualmente uma vez contra o D1 remoto:
--   wrangler d1 execute treinai-db --remote --file=./migrations/0005_add_profile_and_water.sql

CREATE TABLE IF NOT EXISTS user_profiles (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  goal TEXT NOT NULL, -- hipertrofia | emagrecimento | ganho-massa | enfase
  emphasis TEXT,
  training_days INTEGER NOT NULL,
  sex TEXT NOT NULL, -- masculino | feminino | nao-informado (sexo biológico, só para o cálculo)
  birth_date TEXT NOT NULL,
  height_cm REAL NOT NULL,
  weight_kg REAL NOT NULL,
  body_fat_pct REAL,
  target_weight_kg REAL,
  activity_level TEXT NOT NULL, -- sedentario | leve | moderado | intenso (fora da academia)
  wake_time TEXT NOT NULL DEFAULT '07:00',
  sleep_time TEXT NOT NULL DEFAULT '23:00',
  timezone TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
  health_restriction INTEGER NOT NULL DEFAULT 0,
  health_consent_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS weight_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  weight_kg REAL NOT NULL,
  logged_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_weight_logs_user ON weight_logs(user_id, logged_at);

CREATE TABLE IF NOT EXISTS water_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount_ml INTEGER NOT NULL,
  local_date TEXT NOT NULL, -- YYYY-MM-DD no fuso do usuário
  logged_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_water_logs_user_date ON water_logs(user_id, local_date);
