export async function buildCoachContext(db: D1Database, userId: string): Promise<string> {
  const { results: exercises } = await db
    .prepare(
      `SELECT id, name, muscle_group, equipment FROM exercises
       WHERE user_id IS NULL OR user_id = ? ORDER BY muscle_group, name`
    )
    .bind(userId)
    .all<{ id: string; name: string; muscle_group: string; equipment: string }>();

  const { results: workouts } = await db
    .prepare("SELECT id, name, description FROM workouts WHERE user_id = ? ORDER BY created_at DESC")
    .bind(userId)
    .all<{ id: string; name: string; description: string | null }>();

  const { results: workoutExercises } = await db
    .prepare(
      `SELECT we.workout_id, we.exercise_id, e.name AS exercise_name, we.order_index,
              we.target_sets, we.target_reps_min, we.target_reps_max, we.rest_time, we.notes
       FROM workout_exercises we
       JOIN exercises e ON e.id = we.exercise_id
       JOIN workouts w ON w.id = we.workout_id
       WHERE w.user_id = ?
       ORDER BY we.workout_id, we.order_index`
    )
    .bind(userId)
    .all<{
      workout_id: string;
      exercise_id: string;
      exercise_name: string;
      order_index: number;
      target_sets: number;
      target_reps_min: number;
      target_reps_max: number;
      rest_time: number;
      notes: string | null;
    }>();

  const { results: prs } = await db
    .prepare(
      `SELECT pr.exercise_id, e.name AS exercise_name, pr.weight, pr.reps, pr.achieved_at
       FROM personal_records pr
       JOIN exercises e ON e.id = pr.exercise_id
       WHERE pr.user_id = ? AND pr.type = 'carga'
       ORDER BY pr.achieved_at DESC LIMIT 15`
    )
    .bind(userId)
    .all<{ exercise_id: string; exercise_name: string; weight: number; reps: number; achieved_at: string }>();

  const { results: sessions } = await db
    .prepare(
      `SELECT ws.started_at, ws.finished_at, w.name AS workout_name
       FROM workout_sessions ws
       JOIN workouts w ON w.id = ws.workout_id
       WHERE ws.user_id = ? AND ws.finished_at IS NOT NULL
       ORDER BY ws.started_at DESC LIMIT 10`
    )
    .bind(userId)
    .all<{ started_at: string; finished_at: string; workout_name: string }>();

  const catalogText = exercises
    .map((e) => `- ${e.id} | ${e.name} | ${e.muscle_group} | ${e.equipment}`)
    .join("\n");

  const workoutsText = workouts
    .map((w) => {
      const items = workoutExercises
        .filter((we) => we.workout_id === w.id)
        .map(
          (we) =>
            `  ${we.order_index}. ${we.exercise_name} (id: ${we.exercise_id}) — ${we.target_sets}x${we.target_reps_min}-${we.target_reps_max}, descanso ${we.rest_time}s${we.notes ? `, obs: ${we.notes}` : ""}`
        )
        .join("\n");
      return `Treino "${w.name}" (id: ${w.id})${w.description ? ` — ${w.description}` : ""}\n${items}`;
    })
    .join("\n\n");

  const prsText = prs.length
    ? prs.map((p) => `- ${p.exercise_name}: ${p.weight}kg x ${p.reps} reps (${p.achieved_at.slice(0, 10)})`).join("\n")
    : "Nenhum PR registrado ainda.";

  const sessionsText = sessions.length
    ? sessions
        .map((s) => `- ${s.workout_name} em ${s.started_at.slice(0, 10)}`)
        .join("\n")
    : "Nenhum treino concluído ainda.";

  return `CATÁLOGO DE EXERCÍCIOS DISPONÍVEIS (use somente estes ids):
${catalogText}

TREINOS ATUAIS DO USUÁRIO:
${workoutsText || "O usuário ainda não tem nenhum treino."}

RECORDES PESSOAIS RECENTES (carga):
${prsText}

ÚLTIMOS TREINOS CONCLUÍDOS:
${sessionsText}`;
}
