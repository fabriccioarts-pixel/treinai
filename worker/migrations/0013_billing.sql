-- Funil de venda: teste grátis, assinatura (Cakto) e leads do diagnóstico.
-- Rodar manualmente uma vez contra o D1 remoto:
--   wrangler d1 execute treinai-db --remote --file=./migrations/0013_billing.sql

-- Fim do teste grátis; contas novas recebem agora + TRIAL_DAYS (wrangler.jsonc)
ALTER TABLE users ADD COLUMN trial_ends_at TEXT;
-- Quem já tinha conta ganha o teste a partir da migração, em vez de perder o acesso de uma vez
UPDATE users SET trial_ends_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '+3 days') WHERE trial_ends_at IS NULL;

CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY, -- id da assinatura na Cakto
  -- Conta dona; vazio quando a compra chegou com um e-mail que ainda não tem conta (liga pelo e-mail)
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  email TEXT NOT NULL, -- e-mail usado no checkout
  plan TEXT NOT NULL, -- mensal | trimestral
  status TEXT NOT NULL, -- active | canceled | refunded | chargeback
  amount_cents INTEGER NOT NULL,
  -- Acesso pago garantido até aqui (próxima cobrança); continua valendo depois de cancelar
  paid_until TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_subscriptions_email ON subscriptions(email);

-- Quem fez o diagnóstico e deixou contato, comprando ou não
CREATE TABLE IF NOT EXISTS leads (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  whatsapp TEXT NOT NULL,
  answers TEXT NOT NULL, -- JSON com as respostas do quiz
  score INTEGER NOT NULL, -- nota geral de 0 a 100
  phase TEXT NOT NULL,
  utm TEXT, -- JSON com utm_* da campanha
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL, -- preenchido quando a pessoa cria a conta
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email);
