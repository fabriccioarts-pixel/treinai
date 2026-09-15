-- Adiciona a coluna de foto de perfil a bancos já existentes
-- (schema.sql já cria a coluna em instalações novas via CREATE TABLE).
--
-- Rodar manualmente uma vez contra o D1 remoto:
--   wrangler d1 execute treinai-db --remote --file=./migrations/0003_add_user_avatar.sql
ALTER TABLE users ADD COLUMN avatar_key TEXT;
