import { createWorkoutRecord, updateWorkoutRecord } from "./workout-mutations";
import {
  MEAL_TYPES,
  logWaterRecord,
  mealTypeByHour,
  saveMealRecord,
  waterTotalMl,
  type MealType,
} from "./meal-mutations";
import { analyzeMeal, type MealEstimate } from "./meal-analysis";
import { userTimeZone } from "./nutrition";
import { loadProfileWithTargets } from "./profile";
import type { CoachAction } from "./coach-conversations";

/** Descrições dos campos de método, compartilhadas pelo Gemini e pelo Claude */
export const SUPERSET_GROUP_DESCRIPTION =
  "Conjugado: dê o mesmo número aos exercícios feitos em sequência sem descanso (2 = bi-set, 3 = tri-set, 4+ = série gigante). Eles precisam estar seguidos na lista. Omita para exercício sozinho. O descanso do último do grupo vale para a volta inteira.";
export const TECHNIQUE_DESCRIPTION =
  "Técnica de intensidade opcional: drop-set, rest-pause, piramide-crescente, piramide-decrescente, falha, parciais (parciais alongadas no fim), isometria (pausa na contração) ou cadencia (descida lenta). Omita para séries normais.";

/*
 * Ferramentas do Théo (treino, refeição e água), compartilhadas pelo chat de texto
 * e pela conversa por voz.
 */

const MEAL_LABEL: Record<MealType, string> = { cafe: "café da manhã", almoco: "almoço", lanche: "lanche", jantar: "jantar" };
const WATER_MIN_ML = 50;
const WATER_MAX_ML = 2000;

/** Hora cheia agora no fuso do usuário (0–23) */
function localHour(timeZone: string): number {
  return Number(new Intl.DateTimeFormat("en-GB", { timeZone, hour: "2-digit", hourCycle: "h23" }).format(new Date()));
}

const liters = (ml: number) => `${(ml / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} L`;

interface ExerciseInput {
  exerciseId: string;
  targetSets?: number;
  targetRepsMin?: number;
  targetRepsMax?: number;
  restTime?: number;
  notes?: string;
  supersetGroup?: number;
  technique?: string;
}

export interface CreateWorkoutInput {
  name: string;
  description?: string;
  exercises: ExerciseInput[];
}

export interface LogMealInput {
  description: string;
  mealType?: string;
}

export interface LogWaterInput {
  amountMl: number;
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
    supersetGroup: Number(e.supersetGroup) || null,
    technique: e.technique ?? null,
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

/** Executores das ferramentas para um usuário; cada treino criado/alterado ou registro de nutrição entra em `actions` */
export async function createCoachToolExecutors(
  db: D1Database,
  userId: string,
  actions: CoachAction[],
  /** Chave de IA (Gemini ou Anthropic) usada só pelo log_meal para estimar a refeição; sem ela a ferramenta avisa o erro */
  apiKey?: string,
) {
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

  /** Estima a refeição descrita (mesma análise da foto do prato) e salva; o usuário corrige ou apaga na tela inicial */
  const logMeal = async (input: LogMealInput) => {
    const description = String(input.description ?? "").trim().slice(0, 500);
    if (description.length < 2) return "Erro: faltou dizer o que o usuário comeu. Pergunte e tente de novo.";
    if (!apiKey) return "Erro: o registro de refeições pelo chat não está disponível agora. Peça para o usuário registrar pela tela inicial.";

    const mealType = (MEAL_TYPES as readonly string[]).includes(input.mealType ?? "")
      ? (input.mealType as MealType)
      : mealTypeByHour(localHour(await userTimeZone(db, userId)));

    let estimate: MealEstimate;
    try {
      estimate = await analyzeMeal(apiKey, { kind: "text", text: description });
    } catch (err) {
      console.error(JSON.stringify({ message: "coach log_meal failed", error: err instanceof Error ? err.message : String(err) }));
      return "Erro: não consegui estimar essa refeição agora. Nada foi salvo; sugira registrar pela foto do prato na tela inicial.";
    }
    if (estimate.items.length === 0) {
      return `Não identifiquei alimentos nessa descrição (${estimate.note}). Nada foi salvo; peça mais detalhes ao usuário.`;
    }

    const items = estimate.items.slice(0, 30);
    const saved = await saveMealRecord(db, userId, { mealType, source: "texto", items });
    actions.push({
      type: "meal_logged",
      mealId: saved.id,
      mealType,
      kcal: saved.totals.kcal,
      proteinG: saved.totals.proteinG,
      items: items.slice(0, 8).map((i) => i.name),
    });
    const list = items.map((i) => `${i.name} ${i.grams} g (${i.kcal} kcal)`).join("; ");
    return `Refeição salva como ${MEAL_LABEL[mealType]} (estimativa, confiança ${estimate.confidence}): ${list}. Total: ${saved.totals.kcal} kcal, ${saved.totals.proteinG} g de proteína, ${saved.totals.carbsG} g de carboidrato e ${saved.totals.fatG} g de gordura. ${estimate.note} O usuário pode corrigir ou apagar na tela inicial do app.`;
  };

  const logWater = async (input: LogWaterInput) => {
    const amountMl = Math.round(Number(input.amountMl));
    if (!Number.isFinite(amountMl) || amountMl < WATER_MIN_ML || amountMl > WATER_MAX_ML) {
      return `Erro: cada registro de água vai de ${WATER_MIN_ML} a ${WATER_MAX_ML} ml. Nada foi salvo; confirme a quantidade com o usuário.`;
    }
    const saved = await logWaterRecord(db, userId, amountMl);
    const [totalMl, plan] = await Promise.all([waterTotalMl(db, userId, saved.date), loadProfileWithTargets(db, userId)]);
    const targetMl = plan?.waterTodayMl ?? null;
    actions.push({ type: "water_logged", logId: saved.id, amountMl, totalMl, targetMl });
    return `Registrado: ${amountMl} ml de água. Hoje: ${liters(totalMl)}${targetMl ? ` de ${liters(targetMl)} da meta` : ""}.`;
  };

  /** Despacha uma chamada de função do Gemini pelo nome */
  const run = async (name: string, args: unknown) => {
    if (name === "create_workout") return createWorkout(args as CreateWorkoutInput);
    if (name === "update_workout") return updateWorkout(args as UpdateWorkoutInput);
    if (name === "log_meal") return logMeal(args as LogMealInput);
    if (name === "log_water") return logWater(args as LogWaterInput);
    return `Ferramenta desconhecida: ${name}`;
  };

  return { createWorkout, updateWorkout, logMeal, logWater, run };
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
    supersetGroup: { type: "INTEGER", description: SUPERSET_GROUP_DESCRIPTION },
    // Sem enum aqui: valor fora da lista vira série normal em normalizeWorkoutExercises
    technique: { type: "STRING", description: TECHNIQUE_DESCRIPTION },
  },
  required: ["exerciseId"],
});

/** Descrições das ferramentas de nutrição, compartilhadas pelo Gemini e pelo Claude */
export const LOG_MEAL_DESCRIPTION =
  "Registra uma refeição que o usuário JÁ comeu, a partir da descrição dele: estima porções, calorias e macros e salva no diário de hoje. Não use para perguntas sobre comida, planos ou o que ele ainda vai comer.";
export const LOG_MEAL_TEXT_DESCRIPTION =
  "O que o usuário comeu, com as quantidades que ele disse (ex.: 'arroz, feijão, um filé de frango grelhado e salada'). Não invente alimentos.";
export const LOG_MEAL_TYPE_DESCRIPTION =
  "cafe, almoco, lanche ou jantar. Omita se o usuário não disser: o app escolhe pelo horário.";
export const LOG_WATER_DESCRIPTION =
  "Registra água que o usuário JÁ bebeu, em ml (um copo ≈ 250 ml, uma garrafinha ≈ 500 ml). Cada registro vai de 50 a 2000 ml; para mais, faça mais de um registro.";

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
  {
    name: "log_meal",
    description: LOG_MEAL_DESCRIPTION,
    parameters: {
      type: "OBJECT",
      properties: {
        description: { type: "STRING", description: LOG_MEAL_TEXT_DESCRIPTION },
        mealType: { type: "STRING", enum: [...MEAL_TYPES], description: LOG_MEAL_TYPE_DESCRIPTION },
      },
      required: ["description"],
    },
  },
  {
    name: "log_water",
    description: LOG_WATER_DESCRIPTION,
    parameters: {
      type: "OBJECT",
      properties: {
        amountMl: { type: "INTEGER", description: "Quantidade em ml" },
      },
      required: ["amountMl"],
    },
  },
];
