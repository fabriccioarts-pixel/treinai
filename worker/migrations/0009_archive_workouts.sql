-- Treino "excluído" que já tem sessões fica arquivado em vez de apagado: as sessões, séries,
-- PRs e fotos dependem dele (workout_sessions.workout_id não tem ON DELETE CASCADE, de propósito).
-- Rodar manualmente uma vez contra o D1 remoto, ANTES do deploy que usa a coluna:
--   wrangler d1 execute treinai-db --remote --file=./migrations/0009_archive_workouts.sql

ALTER TABLE workouts ADD COLUMN archived_at TEXT;
