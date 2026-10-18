import type { MuscleGroup } from "./types";

const TIME_ZONE = "America/Sao_Paulo";

export interface ExerciseSummary {
  exerciseId: string;
  name: string;
  muscleGroup: MuscleGroup;
  bestWeight: number;
  lastRecordAt: string;
}

/** Um item por exercício a partir dos PRs de carga: maior carga e data do recorde mais recente */
export function summarizeExercises(
  prs: { exercise_id: string; exercise_name: string; muscle_group: string; weight: number; achieved_at: string }[],
): ExerciseSummary[] {
  const byExercise = new Map<string, ExerciseSummary>();
  for (const pr of prs) {
    const entry = byExercise.get(pr.exercise_id);
    if (!entry) {
      byExercise.set(pr.exercise_id, {
        exerciseId: pr.exercise_id,
        name: pr.exercise_name,
        muscleGroup: pr.muscle_group as MuscleGroup,
        bestWeight: pr.weight,
        lastRecordAt: pr.achieved_at,
      });
      continue;
    }
    entry.bestWeight = Math.max(entry.bestWeight, pr.weight);
    if (pr.achieved_at > entry.lastRecordAt) entry.lastRecordAt = pr.achieved_at;
  }
  return [...byExercise.values()].sort((a, b) => b.lastRecordAt.localeCompare(a.lastRecordAt));
}

export interface ExerciseSession {
  sessionId: string;
  /** ISO do primeiro registro da sessão, para formatar a data de outros jeitos */
  startedAt: string;
  /** Data do treino no fuso do app, "dd/mm/aaaa" */
  date: string;
  /** "dd/mm", para o eixo do gráfico */
  shortDate: string;
  sets: { weight: number; reps: number }[];
  maxWeight: number;
  volume: number;
}

const dateFormat = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: TIME_ZONE,
});

/** Agrupa as séries por sessão, em ordem cronológica (mais antiga primeiro) */
export function groupSetsBySession(
  sets: { session_id: string; set_number: number; weight: number; reps: number; created_at: string }[],
): ExerciseSession[] {
  const bySession = new Map<string, { startedAt: string; sets: typeof sets }>();
  for (const set of sets) {
    const entry = bySession.get(set.session_id);
    if (!entry) bySession.set(set.session_id, { startedAt: set.created_at, sets: [set] });
    else {
      entry.sets.push(set);
      if (set.created_at < entry.startedAt) entry.startedAt = set.created_at;
    }
  }

  return [...bySession.entries()]
    .sort(([, a], [, b]) => a.startedAt.localeCompare(b.startedAt))
    .map(([sessionId, { startedAt, sets: sessionSets }]) => {
      // Ordem em que as séries foram feitas: o set_number antigo podia repetir (1, 2, 1, 2, 3) na mesma sessão
      const ordered = [...sessionSets].sort(
        (a, b) => a.created_at.localeCompare(b.created_at) || a.set_number - b.set_number,
      );
      const date = dateFormat.format(new Date(startedAt));
      return {
        sessionId,
        startedAt,
        date,
        shortDate: date.slice(0, 5),
        sets: ordered.map((s) => ({ weight: s.weight, reps: s.reps })),
        maxWeight: Math.max(...ordered.map((s) => s.weight)),
        volume: ordered.reduce((sum, s) => sum + s.weight * s.reps, 0),
      };
    });
}

export interface StrengthGain {
  exerciseId: string;
  name: string;
  /** Carga do primeiro registro do exercício (o primeiro PR de carga é a primeira série feita) */
  fromKg: number;
  /** Maior carga já registrada */
  toKg: number;
  gainKg: number;
}

/** Exercícios que mais ganharam carga, em kg reais (não 1RM estimado), do maior ganho para o menor */
export function topStrengthGains(
  prs: { exercise_id: string; exercise_name: string; weight: number; achieved_at: string }[],
  limit = 3,
): StrengthGain[] {
  const byExercise = new Map<string, { name: string; first: { weight: number; at: string }; best: number }>();
  for (const pr of prs) {
    const entry = byExercise.get(pr.exercise_id);
    if (!entry) {
      byExercise.set(pr.exercise_id, { name: pr.exercise_name, first: { weight: pr.weight, at: pr.achieved_at }, best: pr.weight });
      continue;
    }
    if (pr.achieved_at < entry.first.at) entry.first = { weight: pr.weight, at: pr.achieved_at };
    entry.best = Math.max(entry.best, pr.weight);
  }
  return [...byExercise.entries()]
    .map(([exerciseId, e]) => ({
      exerciseId,
      name: e.name,
      fromKg: e.first.weight,
      toKg: e.best,
      gainKg: e.best - e.first.weight,
    }))
    .filter((g) => g.gainKg > 0)
    .sort((a, b) => b.gainKg - a.gainKg)
    .slice(0, limit);
}
