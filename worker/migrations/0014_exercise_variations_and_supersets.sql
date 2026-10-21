-- Mais variações de exercício no catálogo global e métodos de treino no treino:
-- conjugados (bi-set, tri-set, série gigante) e técnicas (drop-set, rest-pause, pirâmide…).
-- Rodar manualmente uma vez contra o D1 remoto, ANTES do deploy que usa as colunas novas:
--   wrangler d1 execute treinai-db --remote --file=./migrations/0014_exercise_variations_and_supersets.sql

-- Exercícios seguidos com o mesmo número são feitos em sequência, sem descanso entre eles;
-- o descanso do último do grupo vale para a volta inteira. NULL = exercício sozinho.
ALTER TABLE workout_exercises ADD COLUMN superset_group INTEGER;
-- drop-set | rest-pause | piramide-crescente | piramide-decrescente | falha | parciais | isometria | cadencia; NULL = série normal
ALTER TABLE workout_exercises ADD COLUMN technique TEXT;

INSERT OR IGNORE INTO exercises (id, user_id, name, muscle_group, equipment, type, video_search_term, is_custom) VALUES
-- Peito
('supino-inclinado-halteres', NULL, 'Supino inclinado com halteres', 'peito', 'halteres', 'composto', 'incline dumbbell press execução', 0),
('supino-inclinado-smith', NULL, 'Supino inclinado no Smith', 'peito', 'maquina', 'composto', 'Smith machine incline press execução', 0),
('crucifixo-inclinado', NULL, 'Crucifixo inclinado', 'peito', 'halteres', 'isolado', 'incline dumbbell fly execução', 0),
('voador', NULL, 'Voador (peck deck)', 'peito', 'maquina', 'isolado', 'pec deck fly execução', 0),
('crossover-polia-baixa', NULL, 'Crossover polia baixa', 'peito', 'cabo', 'isolado', 'low to high cable fly execução', 0),
('flexao', NULL, 'Flexão de braço', 'peito', 'peso-corporal', 'composto', 'push up execução correta', 0),
('flexao-joelhos', NULL, 'Flexão com joelhos apoiados', 'peito', 'peso-corporal', 'composto', 'knee push up execução', 0),
('paralelas', NULL, 'Mergulho nas paralelas', 'peito', 'peso-corporal', 'composto', 'chest dips execução', 0),
('pullover', NULL, 'Pullover com halter', 'peito', 'halteres', 'isolado', 'dumbbell pullover execução', 0),
-- Costas
('puxada-supinada', NULL, 'Puxada supinada', 'costas', 'cabo', 'composto', 'reverse grip lat pulldown execução', 0),
('puxada-articulada', NULL, 'Puxada articulada', 'costas', 'maquina', 'composto', 'machine lat pulldown execução', 0),
('remada-unilateral', NULL, 'Remada unilateral com halter (serrote)', 'costas', 'halteres', 'composto', 'one arm dumbbell row execução', 0),
('remada-cavalinho', NULL, 'Remada cavalinho', 'costas', 'barra', 'composto', 'T-bar row execução', 0),
('remada-articulada', NULL, 'Remada articulada', 'costas', 'maquina', 'composto', 'machine row execução', 0),
('remada-curvada-supinada', NULL, 'Remada curvada supinada', 'costas', 'barra', 'composto', 'reverse grip barbell row execução', 0),
('pulldown-corda', NULL, 'Pulldown com corda', 'costas', 'cabo', 'isolado', 'cable straight arm pulldown execução', 0),
('barra-fixa-supinada', NULL, 'Barra fixa supinada', 'costas', 'peso-corporal', 'composto', 'chin up execução', 0),
('barra-assistida', NULL, 'Barra fixa assistida (graviton)', 'costas', 'maquina', 'composto', 'assisted pull up machine execução', 0),
('levantamento-terra', NULL, 'Levantamento terra', 'costas', 'barra', 'composto', 'deadlift execução correta', 0),
('hiperextensao', NULL, 'Hiperextensão lombar', 'costas', 'peso-corporal', 'isolado', 'back extension execução', 0),
('encolhimento', NULL, 'Encolhimento com halteres', 'costas', 'halteres', 'isolado', 'dumbbell shrug execução', 0),
-- Pernas e glúteos
('agachamento-frontal', NULL, 'Agachamento frontal', 'pernas', 'barra', 'composto', 'front squat execução', 0),
('agachamento-goblet', NULL, 'Agachamento goblet', 'pernas', 'halteres', 'composto', 'goblet squat execução', 0),
('agachamento-sumo', NULL, 'Agachamento sumô', 'pernas', 'halteres', 'composto', 'dumbbell sumo squat execução', 0),
('agachamento-bulgaro', NULL, 'Agachamento búlgaro', 'pernas', 'halteres', 'composto', 'bulgarian split squat execução', 0),
('hack', NULL, 'Hack machine', 'pernas', 'maquina', 'composto', 'hack squat machine execução', 0),
('afundo', NULL, 'Afundo com halteres', 'pernas', 'halteres', 'composto', 'dumbbell lunge execução', 0),
('passada', NULL, 'Passada (avanço caminhando)', 'pernas', 'halteres', 'composto', 'walking lunge execução', 0),
('subida-banco', NULL, 'Subida no banco (step-up)', 'pernas', 'halteres', 'composto', 'dumbbell step up execução', 0),
('cadeira-flexora', NULL, 'Cadeira flexora', 'pernas', 'maquina', 'isolado', 'seated leg curl execução', 0),
('flexora-em-pe', NULL, 'Flexora em pé unilateral', 'pernas', 'maquina', 'isolado', 'standing leg curl execução', 0),
('cadeira-adutora', NULL, 'Cadeira adutora', 'pernas', 'maquina', 'isolado', 'hip adduction machine execução', 0),
('cadeira-abdutora', NULL, 'Cadeira abdutora', 'pernas', 'maquina', 'isolado', 'hip abduction machine execução', 0),
('elevacao-pelvica', NULL, 'Elevação pélvica (hip thrust)', 'pernas', 'barra', 'composto', 'barbell hip thrust execução', 0),
('gluteo-polia', NULL, 'Glúteo na polia (coice)', 'pernas', 'cabo', 'isolado', 'cable glute kickback execução', 0),
('gluteo-maquina', NULL, 'Glúteo na máquina (coice)', 'pernas', 'maquina', 'isolado', 'glute kickback machine execução', 0),
('levantamento-terra-sumo', NULL, 'Levantamento terra sumô', 'pernas', 'barra', 'composto', 'sumo deadlift execução', 0),
('bom-dia', NULL, 'Bom dia (good morning)', 'pernas', 'barra', 'composto', 'barbell good morning execução', 0),
('panturrilha-sentado', NULL, 'Panturrilha sentado', 'pernas', 'maquina', 'isolado', 'seated calf raise execução', 0),
('panturrilha-leg-press', NULL, 'Panturrilha no leg press', 'pernas', 'maquina', 'isolado', 'leg press calf raise execução', 0),
-- Ombros
('desenvolvimento-barra', NULL, 'Desenvolvimento com barra', 'ombros', 'barra', 'composto', 'barbell overhead press execução', 0),
('desenvolvimento-arnold', NULL, 'Desenvolvimento Arnold', 'ombros', 'halteres', 'composto', 'Arnold press execução', 0),
('elevacao-lateral-polia', NULL, 'Elevação lateral na polia', 'ombros', 'cabo', 'isolado', 'cable lateral raise execução', 0),
('elevacao-lateral-maquina', NULL, 'Elevação lateral máquina', 'ombros', 'maquina', 'isolado', 'machine lateral raise execução', 0),
('crucifixo-inverso-maquina', NULL, 'Crucifixo inverso na máquina', 'ombros', 'maquina', 'isolado', 'reverse pec deck execução', 0),
('face-pull', NULL, 'Face pull', 'ombros', 'cabo', 'isolado', 'face pull execução', 0),
('remada-alta', NULL, 'Remada alta', 'ombros', 'barra', 'composto', 'upright row execução', 0),
-- Bíceps
('rosca-scott', NULL, 'Rosca Scott', 'biceps', 'barra', 'isolado', 'preacher curl execução', 0),
('rosca-barra-w', NULL, 'Rosca com barra W', 'biceps', 'barra', 'isolado', 'EZ bar curl execução', 0),
('rosca-concentrada', NULL, 'Rosca concentrada', 'biceps', 'halteres', 'isolado', 'concentration curl execução', 0),
('rosca-inclinada', NULL, 'Rosca no banco inclinado', 'biceps', 'halteres', 'isolado', 'incline dumbbell curl execução', 0),
('rosca-polia', NULL, 'Rosca na polia', 'biceps', 'cabo', 'isolado', 'cable biceps curl execução', 0),
('rosca-martelo-corda', NULL, 'Rosca martelo na corda', 'biceps', 'cabo', 'isolado', 'cable rope hammer curl execução', 0),
('rosca-inversa', NULL, 'Rosca inversa', 'biceps', 'barra', 'isolado', 'reverse barbell curl execução', 0),
-- Tríceps
('triceps-polia-acima-cabeca', NULL, 'Tríceps acima da cabeça na polia', 'triceps', 'cabo', 'isolado', 'overhead cable triceps extension execução', 0),
('triceps-unilateral-polia', NULL, 'Tríceps unilateral na polia', 'triceps', 'cabo', 'isolado', 'single arm cable pushdown execução', 0),
('triceps-coice', NULL, 'Tríceps coice', 'triceps', 'halteres', 'isolado', 'dumbbell triceps kickback execução', 0),
('triceps-banco', NULL, 'Tríceps no banco', 'triceps', 'peso-corporal', 'composto', 'bench dips execução', 0),
('supino-fechado', NULL, 'Supino fechado', 'triceps', 'barra', 'composto', 'close grip bench press execução', 0),
('triceps-maquina', NULL, 'Tríceps máquina', 'triceps', 'maquina', 'composto', 'triceps dip machine execução', 0),
-- Abdômen
('prancha', NULL, 'Prancha', 'abdomen', 'peso-corporal', 'isolado', 'plank execução correta', 0),
('prancha-lateral', NULL, 'Prancha lateral', 'abdomen', 'peso-corporal', 'isolado', 'side plank execução', 0),
('abdominal-infra', NULL, 'Abdominal infra', 'abdomen', 'peso-corporal', 'isolado', 'lying leg raise execução', 0),
('elevacao-pernas-barra', NULL, 'Elevação de pernas na barra', 'abdomen', 'peso-corporal', 'isolado', 'hanging leg raise execução', 0),
('abdominal-polia', NULL, 'Abdominal na polia', 'abdomen', 'cabo', 'isolado', 'cable crunch execução', 0),
('abdominal-maquina', NULL, 'Abdominal máquina', 'abdomen', 'maquina', 'isolado', 'ab crunch machine execução', 0),
('abdominal-bicicleta', NULL, 'Abdominal bicicleta', 'abdomen', 'peso-corporal', 'isolado', 'bicycle crunch execução', 0),
('roda-abdominal', NULL, 'Roda abdominal', 'abdomen', 'outro', 'isolado', 'ab wheel rollout execução', 0),
('pallof', NULL, 'Pallof press', 'abdomen', 'cabo', 'isolado', 'Pallof press execução', 0);
