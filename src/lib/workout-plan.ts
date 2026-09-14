/**
 * Dados extraídos de "Plano Full Body — Retorno aos Treinos"
 * (Plano_Full_Body_Retorno_4_Semanas.pdf). Segue os mesmos tipos usados
 * pelo resto do app (ver types.ts) para que fique editável junto com o
 * restante do domínio quando a persistência real (Fases 2-6) existir.
 */
import type { Exercise, TrainingProgram, Workout, WorkoutExercise } from "./types";

export const planExercises: Exercise[] = [
  { id: "mesa-flexora", name: "Mesa flexora", muscleGroup: "pernas", equipment: "maquina", type: "isolado", isCustom: false, videoSearchTerm: "mesa flexora execução correta" },
  { id: "supino-maquina", name: "Supino máquina", muscleGroup: "peito", equipment: "maquina", type: "composto", isCustom: false, videoSearchTerm: "chest press machine execução" },
  { id: "triceps-corda", name: "Tríceps corda", muscleGroup: "triceps", equipment: "cabo", type: "isolado", isCustom: false, videoSearchTerm: "cable rope triceps pushdown execução" },
  { id: "abdominal", name: "Abdominal", muscleGroup: "abdomen", equipment: "peso-corporal", type: "isolado", isCustom: false, videoSearchTerm: "abdominal crunch execução" },
  { id: "agachamento-smith", name: "Agachamento no Smith", muscleGroup: "pernas", equipment: "maquina", type: "composto", isCustom: false, videoSearchTerm: "Smith machine squat execução" },
  { id: "supino-inclinado-maquina", name: "Supino inclinado máquina", muscleGroup: "peito", equipment: "maquina", type: "composto", isCustom: false, videoSearchTerm: "incline chest press machine execução" },
  { id: "desenvolvimento-maquina", name: "Desenvolvimento máquina", muscleGroup: "ombros", equipment: "maquina", type: "composto", isCustom: false, videoSearchTerm: "machine shoulder press execução" },
  { id: "stiff-halteres", name: "Stiff com halteres", muscleGroup: "pernas", equipment: "halteres", type: "composto", isCustom: false, videoSearchTerm: "dumbbell Romanian deadlift execução" },
  { id: "supino-halteres", name: "Supino reto com halteres", muscleGroup: "peito", equipment: "halteres", type: "composto", isCustom: false, videoSearchTerm: "dumbbell bench press execução" },
  { id: "puxada-neutra", name: "Puxada neutra", muscleGroup: "costas", equipment: "cabo", type: "composto", isCustom: false, videoSearchTerm: "neutral grip lat pulldown execução" },
  { id: "panturrilha", name: "Panturrilha", muscleGroup: "pernas", equipment: "outro", type: "isolado", isCustom: false, videoSearchTerm: "standing calf raise execução" },
];

const userId = "current-user";
const createdAt = "2026-09-14";

function we(
  workoutId: string,
  order: number,
  exerciseId: string,
  targetSets: number,
  targetRepsMin: number,
  targetRepsMax: number,
  notes: string,
): WorkoutExercise {
  return {
    id: `${workoutId}-${order}`,
    workoutId,
    exerciseId,
    order,
    targetSets,
    targetRepsMin,
    targetRepsMax,
    restTime: 90,
    notes,
  };
}

export const workoutA: Workout = {
  id: "treino-a",
  userId,
  name: "Treino A",
  description: "Full body — retorno aos treinos",
  createdAt,
  exercises: [
    we("treino-a", 1, "leg-press", 3, 10, 12, "Pés firmes e alinhados; desça controlando, sem deixar a lombar perder contato com o apoio. Suba empurrando a plataforma e sem travar os joelhos."),
    we("treino-a", 2, "mesa-flexora", 2, 10, 12, "Ajuste o equipamento ao seu tamanho. Flexione os joelhos de forma controlada e retorne devagar, evitando arrancadas."),
    we("treino-a", 3, "supino-maquina", 3, 8, 12, "Ajuste o banco para as mãos ficarem aproximadamente na linha do meio do peito. Empurre sem tirar as costas do apoio e retorne controlando."),
    we("treino-a", 4, "puxada-frontal", 3, 8, 12, "Peito aberto e tronco estável. Puxe a barra em direção à parte alta do peito, conduzindo com os cotovelos; retorne lentamente."),
    we("treino-a", 5, "elevacao-lateral", 2, 12, 15, "Braços levemente flexionados. Eleve os halteres lateralmente até uma altura confortável, sem balanço, e desça controlando."),
    we("treino-a", 6, "rosca-direta", 2, 10, 12, "Cotovelos próximos ao tronco. Flexione os cotovelos sem balançar o corpo e retorne devagar."),
    we("treino-a", 7, "triceps-corda", 2, 10, 12, "Cotovelos próximos ao corpo. Estenda os braços para baixo, controle a volta e evite movimentar os ombros."),
    we("treino-a", 8, "abdominal", 2, 12, 15, "Movimento controlado, contraindo o abdômen. Evite puxar o pescoço com as mãos e não faça repetições com impulso."),
  ],
};

export const workoutB: Workout = {
  id: "treino-b",
  userId,
  name: "Treino B",
  description: "Full body — retorno aos treinos",
  createdAt,
  exercises: [
    we("treino-b", 1, "agachamento-smith", 3, 8, 12, "Pés em posição confortável e estável. Desça controlando, mantendo joelhos acompanhando a direção dos pés; suba sem perder o controle."),
    we("treino-b", 2, "cadeira-extensora", 2, 10, 15, "Ajuste o eixo do aparelho ao joelho. Estenda as pernas de forma controlada e retorne sem soltar o peso de uma vez."),
    we("treino-b", 3, "remada-baixa", 3, 8, 12, "Tronco firme. Puxe o cabo em direção ao abdômen, aproximando as escápulas, e retorne controlando sem arredondar excessivamente as costas."),
    we("treino-b", 4, "supino-inclinado-maquina", 3, 8, 12, "Ajuste o banco para uma posição confortável. Empurre mantendo os ombros apoiados e retorne devagar."),
    we("treino-b", 5, "desenvolvimento-maquina", 2, 10, 12, "Ajuste o assento para as alças ficarem aproximadamente na altura dos ombros. Empurre para cima sem forçar a articulação e retorne controlando."),
    we("treino-b", 6, "rosca-martelo", 2, 10, 12, "Palmas voltadas uma para a outra. Flexione os cotovelos mantendo-os próximos ao corpo e evite balanço."),
    we("treino-b", 7, "triceps-pulley", 2, 10, 12, "Mantenha os cotovelos estáveis junto ao tronco. Estenda os braços e retorne lentamente."),
    we("treino-b", 8, "abdominal", 2, 12, 15, "Contraia o abdômen com movimento controlado, sem usar impulso."),
  ],
};

export const workoutC: Workout = {
  id: "treino-c",
  userId,
  name: "Treino C",
  description: "Full body — retorno aos treinos",
  createdAt,
  exercises: [
    we("treino-c", 1, "leg-press", 3, 8, 12, "Pés firmes e alinhados. Desça controlando até uma amplitude confortável e suba mantendo joelhos estáveis."),
    we("treino-c", 2, "stiff-halteres", 2, 8, 12, "Joelhos levemente flexionados. Leve o quadril para trás mantendo a coluna neutra; desça até onde conseguir sem perder a posição e volte usando o quadril."),
    we("treino-c", 3, "supino-halteres", 3, 8, 12, "Pés firmes no chão e ombros estáveis. Desça os halteres controlando e empurre mantendo os punhos alinhados."),
    we("treino-c", 4, "puxada-neutra", 3, 8, 12, "Segure com pegada neutra. Puxe em direção ao peito, mantendo o tronco estável, e retorne lentamente."),
    we("treino-c", 5, "elevacao-lateral", 2, 12, 15, "Eleve os braços lateralmente sem impulso, até uma altura confortável, e desça controlando."),
    we("treino-c", 6, "rosca-direta", 2, 10, 12, "Cotovelos próximos ao corpo, movimento controlado e sem balanço."),
    we("treino-c", 7, "triceps-corda", 2, 10, 12, "Cotovelos junto ao corpo. Estenda os braços e controle a subida."),
    we("treino-c", 8, "panturrilha", 3, 12, 15, "Faça uma amplitude confortável: desça controlando o calcanhar e suba contraindo a panturrilha, sem quicar."),
  ],
};

export const planWorkouts: Workout[] = [workoutA, workoutB, workoutC];

export const fullBodyReturnProgram: TrainingProgram = {
  id: "full-body-retorno-4-semanas",
  userId,
  name: "Plano Full Body — Retorno aos treinos",
  goal: "Readaptação após mais de 4 meses sem treinar, retomando técnica, condicionamento e progressão de carga com segurança.",
  frequencyPerWeek: 3,
  sessionDurationMinutes: { min: 45, max: 60 },
  restBetweenSetsSeconds: { min: 60, max: 120 },
  mainRule: "Nas primeiras semanas, escolha cargas que permitam terminar cada série com aproximadamente 2–4 repetições sobrando. Não é necessário treinar até a falha.",
  weeks: [
    { week: 1, focus: "Readaptação", howTo: "Carga leve/moderada, técnica e amplitude confortáveis. 2–4 reps sobrando." },
    { week: 2, focus: "Retomada", howTo: "Mantenha a técnica e aumente pouco a carga somente se o exercício estiver confortável." },
    { week: 3, focus: "Evolução", howTo: "Aproxime-se gradualmente do limite, sem sacrificar a execução." },
    { week: 4, focus: "Consolidação", howTo: "Mantenha ou aumente gradualmente as cargas. Prepare-se para a próxima fase." },
  ],
  workoutIds: [workoutA.id, workoutB.id, workoutC.id],
  warmup: "Faça 5–10 minutos de caminhada, bicicleta ou outro cardio leve. Antes do primeiro exercício de cada grupo, faça 1–2 séries leves de aquecimento quando necessário.",
  loadControl: "Quando conseguir atingir o topo da faixa de repetições com técnica consistente e ainda houver margem, aumente a carga de forma pequena na próxima sessão. Se a técnica piorar, reduza a carga.",
  safetyNote: "Dor muscular leve após voltar a treinar pode acontecer. Dor aguda, forte ou diferente do desconforto muscular comum é sinal para interromper o exercício e buscar orientação de um profissional. Se você tiver alguma lesão, limitação ou condição de saúde, converse com um profissional de educação física ou médico antes de seguir a planilha.",
};
