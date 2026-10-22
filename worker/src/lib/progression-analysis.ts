/**
 * Análise de progressão por exercício e volume por grupo muscular nas últimas 8 semanas.
 * Base: séries completadas (sets.completed = 1) de sessões finalizadas.
 * Métrica central: 1RM estimado (Epley w × (1 + r/30)) para comparar sessões com
 * reps diferentes. O Théo usa esse resumo para falar com números reais, não achismo.
 */

const WINDOW_DAYS = 56;
const MIN_SESSIONS = 2;
const MAX_EXERCISES_SHOWN = 8;

export type ProgressionStatus = "progredindo" | "estavel" | "estagnado" | "regredindo";

export interface ExerciseProgression {
  exerciseId: string;
  exerciseName: string;
  muscleGroup: string;
  sessions: number;
  latestWeight: number;
  latestReps: number;
  latestE1rm: number;
  previousBestE1rm: number;
  trendPct: number;
  status: ProgressionStatus;
  weeksSinceLastPr: number | null;
  avgRpeRecent: number | null;
  lastSessionAt: string;
}

export interface MuscleGroupVolume {
  muscleGroup: string;
  effectiveSetsPerWeek: number;
}

export interface ProgressionReport {
  exercises: ExerciseProgression[];
  weeklyVolume: MuscleGroupVolume[];
}

interface SetRow {
  exercise_id: string;
  exercise_name: string;
  muscle_group: string;
  session_id: string;
  started_at: string;
  weight: number;
  reps: number;
  rpe: number | null;
}

interface PrRow {
  exercise_id: string;
  achieved_at: string;
}

function epley(weight: number, reps: number): number {
  if (reps <= 0 || weight <= 0) return 0;
  return weight * (1 + reps / 30);
}

export async function buildProgressionReport(db: D1Database, userId: string): Promise<ProgressionReport> {
  const cutoff = new Date(Date.now() - WINDOW_DAYS * 86400000).toISOString();

  const { results: setRows } = await db
    .prepare(
      `SELECT s.exercise_id, e.name AS exercise_name, e.muscle_group,
              s.session_id, ws.started_at,
              s.weight, s.reps, s.rpe
       FROM sets s
       JOIN workout_sessions ws ON ws.id = s.session_id
       JOIN exercises e ON e.id = s.exercise_id
       WHERE ws.user_id = ?
         AND s.completed = 1
         AND ws.finished_at IS NOT NULL
         AND ws.started_at >= ?
       ORDER BY s.exercise_id, ws.started_at`
    )
    .bind(userId, cutoff)
    .all<SetRow>();

  const { results: prRows } = await db
    .prepare(
      `SELECT exercise_id, MAX(achieved_at) AS achieved_at
       FROM personal_records
       WHERE user_id = ? AND type = 'carga'
       GROUP BY exercise_id`
    )
    .bind(userId)
    .all<PrRow>();

  const lastPrByExercise = new Map(prRows.map((p) => [p.exercise_id, p.achieved_at]));

  type SessionAgg = { startedAt: string; bestE1rm: number; bestWeight: number; bestReps: number; rpes: number[] };
  type ExerciseAgg = { name: string; muscleGroup: string; sessions: Map<string, SessionAgg> };
  const byExercise = new Map<string, ExerciseAgg>();

  for (const r of setRows) {
    let ex = byExercise.get(r.exercise_id);
    if (!ex) {
      ex = { name: r.exercise_name, muscleGroup: r.muscle_group, sessions: new Map() };
      byExercise.set(r.exercise_id, ex);
    }
    let sess = ex.sessions.get(r.session_id);
    if (!sess) {
      sess = { startedAt: r.started_at, bestE1rm: 0, bestWeight: 0, bestReps: 0, rpes: [] };
      ex.sessions.set(r.session_id, sess);
    }
    const e1 = epley(r.weight, r.reps);
    if (e1 > sess.bestE1rm) {
      sess.bestE1rm = e1;
      sess.bestWeight = r.weight;
      sess.bestReps = r.reps;
    }
    if (typeof r.rpe === "number") sess.rpes.push(r.rpe);
  }

  const now = Date.now();
  const exercises: ExerciseProgression[] = [];
  for (const [exerciseId, ex] of byExercise) {
    const sessions = [...ex.sessions.values()].sort((a, b) => a.startedAt.localeCompare(b.startedAt));
    if (sessions.length < MIN_SESSIONS) continue;

    const latest = sessions[sessions.length - 1];
    const previous = sessions.slice(-4, -1);
    const previousBest = previous.length ? Math.max(...previous.map((s) => s.bestE1rm)) : latest.bestE1rm;
    const trendPct = previousBest > 0 ? (latest.bestE1rm - previousBest) / previousBest : 0;

    const recent3 = sessions.slice(-3);
    let stagnationDelta: number | null = null;
    if (recent3.length === 3) {
      const min = Math.min(...recent3.map((s) => s.bestE1rm));
      const max = Math.max(...recent3.map((s) => s.bestE1rm));
      stagnationDelta = min > 0 ? (max - min) / min : null;
    }

    let status: ProgressionStatus;
    if (trendPct <= -0.02) status = "regredindo";
    else if (trendPct >= 0.02) status = "progredindo";
    else if (stagnationDelta !== null && stagnationDelta < 0.01) status = "estagnado";
    else status = "estavel";

    const rpes = sessions.slice(-3).flatMap((s) => s.rpes);
    const avgRpe = rpes.length ? rpes.reduce((a, b) => a + b, 0) / rpes.length : null;

    const prAt = lastPrByExercise.get(exerciseId);
    const weeksSinceLastPr = prAt
      ? Math.floor((now - new Date(prAt).getTime()) / (7 * 86400000))
      : null;

    exercises.push({
      exerciseId,
      exerciseName: ex.name,
      muscleGroup: ex.muscleGroup,
      sessions: sessions.length,
      latestWeight: latest.bestWeight,
      latestReps: latest.bestReps,
      latestE1rm: Math.round(latest.bestE1rm * 10) / 10,
      previousBestE1rm: Math.round(previousBest * 10) / 10,
      trendPct: Math.round(trendPct * 1000) / 10,
      status,
      weeksSinceLastPr,
      avgRpeRecent: avgRpe !== null ? Math.round(avgRpe * 10) / 10 : null,
      lastSessionAt: latest.startedAt,
    });
  }

  const twoWeeksAgo = new Date(now - 14 * 86400000).toISOString();
  const volumeMap = new Map<string, number>();
  for (const r of setRows) {
    if (r.started_at < twoWeeksAgo) continue;
    volumeMap.set(r.muscle_group, (volumeMap.get(r.muscle_group) ?? 0) + 1);
  }
  const weeklyVolume: MuscleGroupVolume[] = [...volumeMap.entries()]
    .map(([muscleGroup, totalSets]) => ({
      muscleGroup,
      effectiveSetsPerWeek: Math.round(totalSets / 2),
    }))
    .sort((a, b) => b.effectiveSetsPerWeek - a.effectiveSetsPerWeek);

  return { exercises, weeklyVolume };
}

const STATUS_LABEL: Record<ProgressionStatus, string> = {
  progredindo: "progredindo",
  estavel: "estável",
  estagnado: "estagnado",
  regredindo: "regredindo",
};

const MUSCLE_LABEL: Record<string, string> = {
  peito: "Peito",
  costas: "Costas",
  pernas: "Pernas",
  ombros: "Ombros",
  biceps: "Bíceps",
  triceps: "Tríceps",
  abdomen: "Abdômen",
};

// Faixas MEV/MAV/MRV adaptadas das referências Renaissance Periodization (Israetel),
// um pouco mais conservadoras para público geral natural. Volume direto por músculo,
// sem contar compostos como sinergistas.
const VOLUME_REF: Record<string, { mev: number; mav: [number, number]; mrv: number }> = {
  peito: { mev: 8, mav: [12, 18], mrv: 22 },
  costas: { mev: 10, mav: [14, 20], mrv: 25 },
  pernas: { mev: 10, mav: [14, 20], mrv: 25 },
  ombros: { mev: 8, mav: [12, 18], mrv: 22 },
  biceps: { mev: 6, mav: [10, 16], mrv: 20 },
  triceps: { mev: 6, mav: [10, 16], mrv: 20 },
  abdomen: { mev: 0, mav: [6, 14], mrv: 20 },
};

function classifyVolume(muscleGroup: string, sets: number): string {
  const ref = VOLUME_REF[muscleGroup];
  if (!ref) return `${sets} séries/semana`;
  if (sets < ref.mev) return `${sets} séries/semana — abaixo do MEV (~${ref.mev}): pouco estímulo`;
  if (sets > ref.mrv) return `${sets} séries/semana — acima do MRV (~${ref.mrv}): risco de não recuperar`;
  if (sets >= ref.mav[0] && sets <= ref.mav[1]) return `${sets} séries/semana — na faixa MAV (ideal)`;
  if (sets < ref.mav[0]) return `${sets} séries/semana — entre MEV e MAV, dá para subir`;
  return `${sets} séries/semana — perto do MRV`;
}

export function formatProgressionForCoach(report: ProgressionReport): string {
  if (report.exercises.length === 0) {
    return "Sem séries completadas suficientes nas últimas 8 semanas para analisar progressão.";
  }

  const order: Record<ProgressionStatus, number> = {
    regredindo: 0,
    estagnado: 1,
    progredindo: 2,
    estavel: 3,
  };
  const picked = [...report.exercises]
    .sort((a, b) => order[a.status] - order[b.status] || b.sessions - a.sessions)
    .slice(0, MAX_EXERCISES_SHOWN);

  const lines = picked.map((e) => {
    const parts = [
      `${e.exerciseName} (${e.muscleGroup}): ${e.latestWeight}kg × ${e.latestReps} reps, e1RM ${e.latestE1rm}kg em ${e.sessions} sessões`,
      `${STATUS_LABEL[e.status]} (${e.trendPct >= 0 ? "+" : ""}${e.trendPct}% vs. melhor recente)`,
    ];
    if (e.avgRpeRecent !== null) parts.push(`RPE médio ${e.avgRpeRecent}`);
    if (e.weeksSinceLastPr !== null) {
      parts.push(e.weeksSinceLastPr === 0 ? "PR nesta semana" : `último PR há ${e.weeksSinceLastPr} sem.`);
    }
    return `- ${parts.join("; ")}`;
  });

  const volumeLines = report.weeklyVolume.length
    ? report.weeklyVolume
        .map((v) => `- ${MUSCLE_LABEL[v.muscleGroup] ?? v.muscleGroup}: ${classifyVolume(v.muscleGroup, v.effectiveSetsPerWeek)}`)
        .join("\n")
    : "- Sem séries nas últimas 2 semanas.";

  return `Por exercício (últimas 8 semanas, séries completadas; e1RM = carga × (1 + reps/30)):
${lines.join("\n")}

Volume semanal por grupo muscular (média das últimas 2 semanas, séries diretas, sem contar compostos como sinergistas):
${volumeLines}`;
}
