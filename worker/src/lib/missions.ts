import { awardXp } from "./xp";
import { localDate } from "./nutrition";
import { loadProfileWithTargets } from "./profile";

/*
 * Missões da semana (segunda a domingo, no fuso do usuário). Toda semana: "treinar N vezes"
 * + 2 missões sorteadas de forma estável por semana e usuário. O progresso é calculado a partir
 * dos dados reais; ao completar, a missão concede XP uma única vez (xp_events "missao").
 */

const DEFAULT_TIME_ZONE = "America/Sao_Paulo";
const DAY_MS = 86_400_000;
const MAIN_GROUPS = ["peito", "costas", "pernas", "ombros", "biceps", "triceps", "abdomen"];

export interface Mission {
  key: string;
  title: string;
  description: string;
  progress: number;
  target: number;
  /** Unidade mostrada no progresso ("treinos", "dias", "kg"...) */
  unit: string;
  xp: number;
  completed: boolean;
}

export interface WeeklyMissions {
  weekKey: string;
  /** Dias que faltam para a semana acabar, contando hoje */
  daysLeft: number;
  missions: Mission[];
  /** Missões completadas nesta chamada (para celebrar) */
  justCompleted: Mission[];
}

interface WeekData {
  sessions: number;
  muscleGroups: number;
  loadPrs: number;
  waterDays: number;
  mealDays: number;
  volume: number;
  lastWeekVolume: number;
}

type MissionDef = Omit<Mission, "progress" | "completed"> & { progressOf: (d: WeekData) => number };

function addDays(date: string, days: number): string {
  return new Date(Date.parse(`${date}T12:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);
}

/** Hash simples e estável para sortear as missões da semana */
function hash(text: string): number {
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function rotatingPool(data: WeekData): MissionDef[] {
  const volumeTarget =
    data.lastWeekVolume > 0 ? Math.max(500, Math.round((data.lastWeekVolume * 1.05) / 100) * 100) : 3000;
  return [
    {
      key: "agua",
      title: "Hidratação em dia",
      description: "Bata a meta de água em 4 dias da semana",
      target: 4,
      unit: "dias",
      xp: 50,
      progressOf: (d) => d.waterDays,
    },
    {
      key: "refeicoes",
      title: "Diário em dia",
      description: "Registre 3 refeições por dia em 3 dias",
      target: 3,
      unit: "dias",
      xp: 40,
      progressOf: (d) => d.mealDays,
    },
    {
      key: "recorde",
      title: "Supere-se",
      description: "Bata um recorde de carga em qualquer exercício",
      target: 1,
      unit: "recorde",
      xp: 40,
      progressOf: (d) => d.loadPrs,
    },
    {
      key: "grupos",
      title: "Corpo inteiro",
      description: "Treine 4 grupos musculares diferentes",
      target: 4,
      unit: "grupos",
      xp: 40,
      progressOf: (d) => d.muscleGroups,
    },
    {
      key: "volume",
      title: data.lastWeekVolume > 0 ? "Mais que a semana passada" : "Primeiras toneladas",
      description: `Levante ${volumeTarget.toLocaleString("pt-BR")} kg somando a semana`,
      target: volumeTarget,
      unit: "kg",
      xp: 50,
      progressOf: (d) => Math.round(d.volume),
    },
  ];
}

async function loadWeekData(
  db: D1Database,
  userId: string,
  timeZone: string,
  weekStart: string,
  weekEnd: string,
): Promise<WeekData> {
  const lastWeekStart = addDays(weekStart, -7);
  // Margem de 1 dia nas consultas em UTC; o filtro fino é pela data local
  const sinceIso = new Date(Date.parse(`${lastWeekStart}T00:00:00Z`) - DAY_MS).toISOString();

  const [sessionsRes, prsRes, xpRes] = await Promise.all([
    db
      .prepare(
        `SELECT id, finished_at FROM workout_sessions
         WHERE user_id = ? AND finished_at IS NOT NULL AND finished_at >= ?`,
      )
      .bind(userId, sinceIso)
      .all<{ id: string; finished_at: string }>(),
    db
      .prepare("SELECT achieved_at FROM personal_records WHERE user_id = ? AND type = 'carga' AND achieved_at >= ?")
      .bind(userId, sinceIso)
      .all<{ achieved_at: string }>(),
    db
      .prepare("SELECT source, ref FROM xp_events WHERE user_id = ? AND source IN ('agua', 'refeicoes') AND ref >= ?")
      .bind(userId, weekStart)
      .all<{ source: string; ref: string }>()
      .catch(() => ({ results: [] as { source: string; ref: string }[] })),
  ]);

  const local = (iso: string) => localDate(timeZone, new Date(iso));
  const inRange = (date: string, from: string, to: string) => date >= from && date <= to;
  const thisWeek = sessionsRes.results.filter((s) => inRange(local(s.finished_at), weekStart, weekEnd));
  const lastWeek = sessionsRes.results.filter((s) => inRange(local(s.finished_at), lastWeekStart, addDays(weekStart, -1)));

  const sessionIds = [...thisWeek, ...lastWeek].map((s) => s.id);
  let sets: { session_id: string; weight: number; reps: number; muscle_group: string }[] = [];
  if (sessionIds.length > 0) {
    const { results } = await db
      .prepare(
        `SELECT st.session_id, st.weight, st.reps, e.muscle_group FROM sets st
         JOIN exercises e ON e.id = st.exercise_id
         WHERE st.completed = 1 AND st.session_id IN (${sessionIds.map(() => "?").join(",")})`,
      )
      .bind(...sessionIds)
      .all<{ session_id: string; weight: number; reps: number; muscle_group: string }>();
    sets = results;
  }

  const thisWeekIds = new Set(thisWeek.map((s) => s.id));
  const volumeOf = (ids: Set<string>) =>
    sets.filter((s) => ids.has(s.session_id)).reduce((sum, s) => sum + s.weight * s.reps, 0);
  const groups = new Set(
    sets.filter((s) => thisWeekIds.has(s.session_id) && MAIN_GROUPS.includes(s.muscle_group)).map((s) => s.muscle_group),
  );
  const weekXp = xpRes.results.filter((e) => inRange(e.ref, weekStart, weekEnd));

  return {
    sessions: thisWeek.length,
    muscleGroups: groups.size,
    loadPrs: prsRes.results.filter((p) => inRange(local(p.achieved_at), weekStart, weekEnd)).length,
    waterDays: weekXp.filter((e) => e.source === "agua").length,
    mealDays: weekXp.filter((e) => e.source === "refeicoes").length,
    volume: volumeOf(thisWeekIds),
    lastWeekVolume: volumeOf(new Set(lastWeek.map((s) => s.id))),
  };
}

/** Missões da semana atual, com progresso; concede o XP das que acabaram de ser completadas */
export async function loadWeeklyMissions(db: D1Database, userId: string): Promise<WeeklyMissions> {
  const plan = await loadProfileWithTargets(db, userId);
  const timeZone = plan?.profile.timezone ?? DEFAULT_TIME_ZONE;
  const today = localDate(timeZone);
  const weekday = (new Date(`${today}T12:00:00Z`).getUTCDay() + 6) % 7; // 0 = segunda
  const weekStart = addDays(today, -weekday);
  const weekEnd = addDays(weekStart, 6);

  const data = await loadWeekData(db, userId, timeZone, weekStart, weekEnd);
  const trainingTarget = Math.min(6, Math.max(2, plan?.profile.trainingDays ?? 3));
  const fixed: MissionDef = {
    key: "treinos",
    title: "Constância na semana",
    description: `Conclua ${trainingTarget} treinos até domingo`,
    target: trainingTarget,
    unit: "treinos",
    xp: 60,
    progressOf: (d) => d.sessions,
  };
  const pool = rotatingPool(data);
  const seed = hash(`${weekStart}:${userId}`);
  const first = pool[seed % pool.length];
  const rest = pool.filter((m) => m.key !== first.key);
  const second = rest[Math.floor(seed / pool.length) % rest.length];

  const missions: Mission[] = [fixed, first, second].map(({ progressOf, ...def }) => {
    const progress = progressOf(data);
    return { ...def, progress: Math.min(progress, def.target), completed: progress >= def.target };
  });

  const justCompleted: Mission[] = [];
  for (const mission of missions.filter((m) => m.completed)) {
    if (await awardXp(db, userId, "missao", `${weekStart}:${mission.key}`, mission.xp, `Missão: ${mission.title}`)) {
      justCompleted.push(mission);
    }
  }

  return { weekKey: weekStart, daysLeft: 7 - weekday, missions, justCompleted };
}
