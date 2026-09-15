import { Hono } from "hono";

export const statsRoutes = new Hono<{ Bindings: Env }>();

interface SessionRow {
  id: string;
  started_at: string;
  finished_at: string | null;
}

interface SetRow {
  session_id: string;
  weight: number;
  reps: number;
}

interface PrRow {
  id: string;
  exercise_id: string;
  exercise_name: string;
  type: string;
  weight: number;
  reps: number;
  estimated_one_rep_max: number;
  achieved_at: string;
}

const DAY_MS = 86_400_000;

statsRoutes.get("/", async (c) => {
  const userId = c.req.query("userId");
  if (!userId) return c.json({ error: "missing_userId" }, 400);

  const now = Date.now();
  const sixWeeksAgoIso = new Date(now - 42 * DAY_MS).toISOString();

  const { results: sessions } = await c.env.DB.prepare(
    `SELECT id, started_at, finished_at FROM workout_sessions
     WHERE user_id = ? AND finished_at IS NOT NULL AND started_at >= ?
     ORDER BY started_at DESC`
  )
    .bind(userId, sixWeeksAgoIso)
    .all<SessionRow>();

  let sets: SetRow[] = [];
  if (sessions.length > 0) {
    const placeholders = sessions.map(() => "?").join(",");
    const { results } = await c.env.DB.prepare(
      `SELECT session_id, weight, reps FROM sets
       WHERE completed = 1 AND session_id IN (${placeholders})`
    )
      .bind(...sessions.map((s) => s.id))
      .all<SetRow>();
    sets = results;
  }

  const { results: prs } = await c.env.DB.prepare(
    `SELECT pr.id, pr.exercise_id, e.name AS exercise_name, pr.type, pr.weight, pr.reps,
            pr.estimated_one_rep_max, pr.achieved_at
     FROM personal_records pr
     JOIN exercises e ON e.id = pr.exercise_id
     WHERE pr.user_id = ?
     ORDER BY pr.achieved_at ASC`
  )
    .bind(userId)
    .all<PrRow>();

  const sessionById = new Map(sessions.map((s) => [s.id, s]));
  const daysAgo = (iso: string) => Math.floor((now - new Date(iso).getTime()) / DAY_MS);

  // --- Volume da semana / treinos da semana ---
  const sessionsThisWeek = sessions.filter((s) => daysAgo(s.started_at) < 7);
  const sessionIdsThisWeek = new Set(sessionsThisWeek.map((s) => s.id));
  const weeklyVolumeKg = sets
    .filter((s) => sessionIdsThisWeek.has(s.session_id))
    .reduce((sum, s) => sum + s.weight * s.reps, 0);

  // --- Sequência de treinos (dias consecutivos com treino concluído) ---
  const finishedDates = new Set(
    sessions.map((s) => new Date(s.finished_at ?? s.started_at).toISOString().slice(0, 10))
  );
  let streakDays = 0;
  for (let d = 0; d < 60; d++) {
    const day = new Date(now - d * DAY_MS).toISOString().slice(0, 10);
    if (finishedDates.has(day)) streakDays++;
    else if (d > 0) break;
    else continue; // hoje pode ainda não ter treino sem quebrar a sequência de ontem
  }

  // --- PRs (contamos apenas o tipo "carga" como um PR de destaque) ---
  const loadPRs = prs.filter((p) => p.type === "carga");
  const recentPRsCount = loadPRs.filter((p) => daysAgo(p.achieved_at) < 7).length;
  const newPRsThisMonth = loadPRs.filter((p) => daysAgo(p.achieved_at) < 30).length;
  const recentPRs = [...loadPRs]
    .sort((a, b) => (a.achieved_at < b.achieved_at ? 1 : -1))
    .slice(0, 3)
    .map((p) => ({
      id: p.id,
      exerciseId: p.exercise_id,
      exerciseName: p.exercise_name,
      weight: p.weight,
      reps: p.reps,
      achievedAt: p.achieved_at,
    }));

  // --- Frequência do mês ---
  const frequencyThisMonth = sessions.filter((s) => daysAgo(s.started_at) < 30).length;

  // --- Volume semanal (últimas 6 semanas) ---
  const weeklyVolumeSeries = Array.from({ length: 6 }, (_, i) => {
    const bucketIndex = 5 - i; // 0 = últimos 7 dias
    const labelDate = new Date(now - bucketIndex * 7 * DAY_MS);
    return {
      week: labelDate.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
      volume: 0,
      bucketIndex,
    };
  });
  for (const set of sets) {
    const session = sessionById.get(set.session_id);
    if (!session) continue;
    const bucket = Math.floor(daysAgo(session.started_at) / 7);
    if (bucket < 0 || bucket > 5) continue;
    const entry = weeklyVolumeSeries.find((b) => b.bucketIndex === bucket);
    if (entry) entry.volume += set.weight * set.reps;
  }

  // --- Exercícios que mais evoluíram (1RM estimado: primeiro vs. último registro) ---
  const oneRmByExercise = new Map<string, { name: string; first: PrRow; last: PrRow }>();
  for (const p of prs) {
    if (p.type !== "1rm") continue;
    const entry = oneRmByExercise.get(p.exercise_id);
    if (!entry) {
      oneRmByExercise.set(p.exercise_id, { name: p.exercise_name, first: p, last: p });
    } else {
      entry.last = p;
    }
  }
  const topMovers = [...oneRmByExercise.entries()]
    .map(([exerciseId, { name, first, last }]) => ({
      exerciseId,
      label: name,
      changePct: first.estimated_one_rep_max > 0
        ? Math.round(
            ((last.estimated_one_rep_max - first.estimated_one_rep_max) / first.estimated_one_rep_max) * 100
          )
        : 0,
    }))
    .filter((m) => m.changePct > 0)
    .sort((a, b) => b.changePct - a.changePct)
    .slice(0, 3);

  // --- Evolução de carga do exercício mais registrado recentemente (gráfico do Início) ---
  let loadTrend: { exerciseName: string; series: { date: string; weight: number }[] } | null = null;
  if (loadPRs.length > 0) {
    const topExerciseId = loadPRs[loadPRs.length - 1].exercise_id;
    const series = loadPRs
      .filter((p) => p.exercise_id === topExerciseId)
      .map((p) => ({
        date: new Date(p.achieved_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
        weight: p.weight,
      }));
    loadTrend = { exerciseName: loadPRs[loadPRs.length - 1].exercise_name, series };
  }

  return c.json({
    workoutsThisWeek: sessionsThisWeek.length,
    weeklyVolumeKg,
    recentPRsCount,
    streakDays,
    frequencyThisMonth,
    newPRsThisMonth,
    recentPRs,
    weeklyVolumeSeries: weeklyVolumeSeries.map(({ week, volume }) => ({ week, volume })),
    topMovers,
    loadTrend,
  });
});
