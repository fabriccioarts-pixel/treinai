import { createWorkoutRecord, updateWorkoutRecord } from "./workout-mutations";
import type { CoachAction } from "./coach-conversations";

/*
 * Ferramentas do Théo (criar e editar treino), compartilhadas pelo chat de texto
 * e pela conversa por voz.
 */

interface ExerciseInput {
  exerciseId: string;
  targetSets?: number;
  targetRepsMin?: number;
  targetRepsMax?: number;
  restTime?: number;
  notes?: string;
}

export interface CreateWorkoutInput {
  name: string;
  description?: string;
  exercises: ExerciseInput[];
}

export interface UpdateWorkoutInput {
  workoutId: string;
  name?: string;
  exercises: ExerciseInput[];
}

function normalize(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

async function resolveExerciseIdMap(db: D1Database, userId: string): Promise<Map<string, string>> {
  const { results } = await db
    .prepare("SELECT id, name FROM exercises WHERE user_id IS NULL OR user_id = ?")
    .bind(userId)
    .all<{ id: string; name: string }>();

  const map = new Map<string, string>();
  for (const ex of results) {
    map.set(ex.id.toLowerCase(), ex.id);
    map.set(normalize(ex.id), ex.id);
    map.set(normalize(ex.name), ex.id);
  }
  return map;
}

/** Os modelos às vezes mandam nome em vez de id: resolve pelo catálogo e descarta o que não existir */
function toExerciseRows(exercises: ExerciseInput[] | undefined, exerciseMap: Map<string, string>) {
  const withDefaults = (e: ExerciseInput, exerciseId: string) => ({
    exerciseId,
    targetSets: Number(e.targetSets) || 3,
    targetRepsMin: Number(e.targetRepsMin) || 8,
    targetRepsMax: Number(e.targetRepsMax) || 12,
    restTime: Number(e.restTime) ?? 90,
    notes: e.notes,
  });

  const valid = (exercises || [])
    .map((e) =>
      withDefaults(
        e,
        exerciseMap.get(e.exerciseId.toLowerCase()) ?? exerciseMap.get(normalize(e.exerciseId)) ?? e.exerciseId,
      ),
    )
    .filter((e) => exerciseMap.has(e.exerciseId.toLowerCase()) || exerciseMap.has(normalize(e.exerciseId)));

  const rows = valid.length > 0 ? valid : (exercises || []).map((e) => withDefaults(e, e.exerciseId));
  return rows.map((e, i) => ({ ...e, order: i + 1 }));
}

/** Executores das ferramentas para um usuário; cada treino criado ou alterado entra em `actions` */
export async function createCoachToolExecutors(db: D1Database, userId: string, actions: CoachAction[]) {
  const exerciseMap = await resolveExerciseIdMap(db, userId);

  const createWorkout = async (input: CreateWorkoutInput) => {
    const id = await createWorkoutRecord(db, userId, {
      name: input.name,
      description: input.description,
      exercises: toExerciseRows(input.exercises, exerciseMap),
    });
    actions.push({ type: "workout_created", workoutId: id, name: input.name });
    return `Treino "${input.name}" criado com sucesso no banco de dados (id: ${id}).`;
  };

  const updateWorkout = async (input: UpdateWorkoutInput) => {
    const existing = await db
      .prepare("SELECT name FROM workouts WHERE id = ? AND user_id = ? AND archived_at IS NULL")
      .bind(input.workoutId, userId)
      .first<{ name: string }>();
    if (!existing) return `Erro: treino ${input.workoutId} não encontrado para este usuário.`;
    const name = input.name ?? existing.name;

    await updateWorkoutRecord(db, input.workoutId, {
      name,
      exercises: toExerciseRows(input.exercises, exerciseMap),
    });
    actions.push({ type: "workout_updated", workoutId: input.workoutId, name });
    return `Treino "${name}" atualizado com sucesso.`;
  };

  /** Despacha uma chamada de função do Gemini pelo nome */
  const run = async (name: string, args: unknown) => {
    if (name === "create_workout") return createWorkout(args as CreateWorkoutInput);
    if (name === "update_workout") return updateWorkout(args as UpdateWorkoutInput);
    return `Ferramenta desconhecida: ${name}`;
  };

  return { createWorkout, updateWorkout, run };
}

const exerciseItemSchema = (idDescription: string) => ({
  type: "OBJECT",
  properties: {
    exerciseId: { type: "STRING", description: idDescription },
    targetSets: { type: "INTEGER", description: "Número de séries" },
    targetRepsMin: { type: "INTEGER", description: "Mínimo de repetições" },
    targetRepsMax: { type: "INTEGER", description: "Máximo de repetições" },
    restTime: { type: "INTEGER", description: "Descanso em segundos" },
    notes: { type: "STRING", description: "Observação opcional de execução" },
  },
  required: ["exerciseId"],
});

/** Declarações no formato do Gemini (generateContent e Live API) */
export const GEMINI_COACH_FUNCTIONS = [
  {
    name: "create_workout",
    description: "Cria um novo treino do zero para o usuário e salva no banco de dados.",
    parameters: {
      type: "OBJECT",
      properties: {
        name: { type: "STRING", description: "Nome do treino (ex: Treino A - Peito e Tríceps)" },
        description: { type: "STRING", description: "Descrição ou foco" },
        exercises: {
          type: "ARRAY",
          description: "Lista de exercícios",
          items: exerciseItemSchema("Id do exercício, deve vir do catálogo fornecido"),
        },
      },
      required: ["name", "exercises"],
    },
  },
  {
    name: "update_workout",
    description:
      "Substitui a lista de exercícios de um treino existente do usuário. Envie a lista completa (mantidos + alterados), não apenas o que mudou.",
    parameters: {
      type: "OBJECT",
      properties: {
        workoutId: { type: "STRING", description: "ID do treino" },
        name: { type: "STRING", description: "Novo nome opcional" },
        exercises: {
          type: "ARRAY",
          description: "Lista completa de exercícios que substituirá a anterior",
          items: exerciseItemSchema("Id do exercício"),
        },
      },
      required: ["workoutId", "exercises"],
    },
  },
];
