-- Mais variações no catálogo global: polia (bíceps, tríceps, peito, ombros), crucifixos inclinado
-- e declinado, desenvolvimentos, serrote e barra. Só inserções: pode rodar depois da 0014.
-- Rodar manualmente uma vez contra o D1 remoto:
--   wrangler d1 execute treinai-db --remote --file=./migrations/0015_more_exercise_variations.sql

INSERT OR IGNORE INTO exercises (id, user_id, name, muscle_group, equipment, type, video_search_term, is_custom) VALUES
-- Peito: crucifixos, polia e supinos
('crucifixo-declinado', NULL, 'Crucifixo declinado', 'peito', 'halteres', 'isolado', 'decline dumbbell fly execução', 0),
('crucifixo-polia', NULL, 'Crucifixo na polia (banco reto)', 'peito', 'cabo', 'isolado', 'cable fly flat bench execução', 0),
('crucifixo-inclinado-polia', NULL, 'Crucifixo inclinado na polia', 'peito', 'cabo', 'isolado', 'incline cable fly execução', 0),
('crucifixo-declinado-polia', NULL, 'Crucifixo declinado na polia', 'peito', 'cabo', 'isolado', 'decline cable fly execução', 0),
('crossover-polia-media', NULL, 'Crossover polia média', 'peito', 'cabo', 'isolado', 'mid cable chest fly execução', 0),
('crossover-unilateral', NULL, 'Crossover unilateral', 'peito', 'cabo', 'isolado', 'single arm cable fly execução', 0),
('supino-declinado-halteres', NULL, 'Supino declinado com halteres', 'peito', 'halteres', 'composto', 'decline dumbbell press execução', 0),
('supino-reto-smith', NULL, 'Supino reto no Smith', 'peito', 'maquina', 'composto', 'Smith machine bench press execução', 0),
('supino-declinado-smith', NULL, 'Supino declinado no Smith', 'peito', 'maquina', 'composto', 'Smith machine decline press execução', 0),
('supino-pegada-aberta', NULL, 'Supino reto pegada aberta', 'peito', 'barra', 'composto', 'wide grip bench press execução', 0),
('supino-polia', NULL, 'Supino na polia (em pé)', 'peito', 'cabo', 'composto', 'standing cable chest press execução', 0),
('pullover-barra', NULL, 'Pullover com barra', 'peito', 'barra', 'isolado', 'barbell pullover execução', 0),
-- Ombros: desenvolvimentos, polia e barra
('desenvolvimento-smith', NULL, 'Desenvolvimento no Smith', 'ombros', 'maquina', 'composto', 'Smith machine shoulder press execução', 0),
('desenvolvimento-unilateral', NULL, 'Desenvolvimento unilateral com halter', 'ombros', 'halteres', 'composto', 'single arm dumbbell shoulder press execução', 0),
('desenvolvimento-landmine', NULL, 'Desenvolvimento landmine (barra no canto)', 'ombros', 'barra', 'composto', 'landmine press execução', 0),
('elevacao-lateral-sentado', NULL, 'Elevação lateral sentado', 'ombros', 'halteres', 'isolado', 'seated lateral raise execução', 0),
('elevacao-frontal-polia', NULL, 'Elevação frontal na polia', 'ombros', 'cabo', 'isolado', 'cable front raise execução', 0),
('elevacao-frontal-barra', NULL, 'Elevação frontal com barra', 'ombros', 'barra', 'isolado', 'barbell front raise execução', 0),
('elevacao-frontal-anilha', NULL, 'Elevação frontal com anilha', 'ombros', 'outro', 'isolado', 'plate front raise execução', 0),
('crucifixo-inverso-polia', NULL, 'Crucifixo inverso na polia', 'ombros', 'cabo', 'isolado', 'cable reverse fly execução', 0),
('remada-alta-polia', NULL, 'Remada alta na polia', 'ombros', 'cabo', 'composto', 'cable upright row execução', 0),
-- Bíceps: polia, Scott e barra
('rosca-polia-unilateral', NULL, 'Rosca unilateral na polia', 'biceps', 'cabo', 'isolado', 'single arm cable curl execução', 0),
('rosca-polia-alta', NULL, 'Rosca na polia alta (duplo bíceps)', 'biceps', 'cabo', 'isolado', 'high cable curl execução', 0),
('rosca-polia-atras', NULL, 'Rosca na polia por trás do corpo', 'biceps', 'cabo', 'isolado', 'bayesian cable curl execução', 0),
('rosca-scott-polia', NULL, 'Rosca Scott na polia', 'biceps', 'cabo', 'isolado', 'cable preacher curl execução', 0),
('rosca-inversa-polia', NULL, 'Rosca inversa na polia', 'biceps', 'cabo', 'isolado', 'cable reverse curl execução', 0),
('rosca-scott-halter', NULL, 'Rosca Scott unilateral com halter', 'biceps', 'halteres', 'isolado', 'dumbbell preacher curl execução', 0),
('rosca-scott-maquina', NULL, 'Rosca Scott máquina', 'biceps', 'maquina', 'isolado', 'machine preacher curl execução', 0),
('rosca-spider', NULL, 'Rosca spider (de bruços no banco inclinado)', 'biceps', 'halteres', 'isolado', 'spider curl execução', 0),
('rosca-zottman', NULL, 'Rosca Zottman', 'biceps', 'halteres', 'isolado', 'Zottman curl execução', 0),
('rosca-21', NULL, 'Rosca 21', 'biceps', 'barra', 'isolado', '21s biceps curl execução', 0),
-- Tríceps: polia, serrote e barra
('triceps-pulley-barra-v', NULL, 'Tríceps pulley com barra V', 'triceps', 'cabo', 'isolado', 'V bar triceps pushdown execução', 0),
('triceps-pulley-inverso', NULL, 'Tríceps pulley pegada invertida', 'triceps', 'cabo', 'isolado', 'reverse grip triceps pushdown execução', 0),
('triceps-coice-polia', NULL, 'Tríceps coice na polia', 'triceps', 'cabo', 'isolado', 'cable triceps kickback execução', 0),
('triceps-frances-polia-unilateral', NULL, 'Tríceps francês unilateral na polia', 'triceps', 'cabo', 'isolado', 'single arm overhead cable extension execução', 0),
('triceps-testa-polia', NULL, 'Tríceps testa na polia', 'triceps', 'cabo', 'isolado', 'cable skull crusher execução', 0),
('triceps-cruzado-polia', NULL, 'Tríceps cruzado na polia', 'triceps', 'cabo', 'isolado', 'cross body cable triceps extension execução', 0),
('triceps-frances-unilateral', NULL, 'Tríceps francês unilateral com halter', 'triceps', 'halteres', 'isolado', 'single arm overhead dumbbell extension execução', 0),
('triceps-testa-halteres', NULL, 'Tríceps testa com halteres', 'triceps', 'halteres', 'isolado', 'dumbbell skull crusher execução', 0),
('triceps-frances-barra-w', NULL, 'Tríceps francês com barra W', 'triceps', 'barra', 'isolado', 'EZ bar overhead triceps extension execução', 0),
('flexao-diamante', NULL, 'Flexão diamante', 'triceps', 'peso-corporal', 'composto', 'diamond push up execução', 0),
-- Costas: serrote, polia e barra
('serrote-polia', NULL, 'Serrote na polia (remada unilateral)', 'costas', 'cabo', 'composto', 'single arm cable row execução', 0),
('serrote-maquina', NULL, 'Remada unilateral na máquina', 'costas', 'maquina', 'composto', 'single arm machine row execução', 0),
('remada-apoiada-halteres', NULL, 'Remada apoiada no banco inclinado com halteres', 'costas', 'halteres', 'composto', 'chest supported dumbbell row execução', 0),
('puxada-unilateral-polia', NULL, 'Puxada unilateral na polia', 'costas', 'cabo', 'composto', 'single arm lat pulldown execução', 0),
('remada-baixa-aberta', NULL, 'Remada baixa pegada aberta', 'costas', 'cabo', 'composto', 'wide grip seated cable row execução', 0),
('remada-pendlay', NULL, 'Remada Pendlay', 'costas', 'barra', 'composto', 'Pendlay row execução', 0),
('remada-curvada-smith', NULL, 'Remada curvada no Smith', 'costas', 'maquina', 'composto', 'Smith machine bent over row execução', 0),
('encolhimento-barra', NULL, 'Encolhimento com barra', 'costas', 'barra', 'isolado', 'barbell shrug execução', 0),
-- Pernas com barra e Smith
('afundo-barra', NULL, 'Afundo com barra', 'pernas', 'barra', 'composto', 'barbell lunge execução', 0),
('agachamento-bulgaro-smith', NULL, 'Agachamento búlgaro no Smith', 'pernas', 'maquina', 'composto', 'Smith machine bulgarian split squat execução', 0),
('elevacao-pelvica-smith', NULL, 'Elevação pélvica no Smith', 'pernas', 'maquina', 'composto', 'Smith machine hip thrust execução', 0),
-- Abdômen com barra
('rollout-barra', NULL, 'Rollout com barra', 'abdomen', 'barra', 'isolado', 'barbell rollout execução', 0);
