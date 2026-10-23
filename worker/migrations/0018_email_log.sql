-- E-mails do ciclo do teste grátis já enviados (boas-vindas, "acaba amanhã", "acabou"),
-- para cada pessoa receber cada um uma vez só.
-- Rodar manualmente uma vez contra o D1 remoto, ANTES do deploy que usa a tabela:
--   wrangler d1 execute treinai-db --remote --file=./migrations/0018_email_log.sql

CREATE TABLE IF NOT EXISTS email_log (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL, -- boas-vindas | teste-acaba-amanha | teste-acabou
  sent_at TEXT NOT NULL,
  PRIMARY KEY (user_id, kind)
);
