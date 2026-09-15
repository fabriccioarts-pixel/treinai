-- Adiciona a coluna de foto da sessão a bancos já existentes
-- (schema.sql já cria a coluna em instalações novas via CREATE TABLE).
--
-- Rodar manualmente uma vez contra o D1 remoto:
--   wrangler d1 execute treinai-db --remote --file=./migrations/0002_add_session_photo.sql
ALTER TABLE workout_sessions ADD COLUMN photo_key TEXT;
