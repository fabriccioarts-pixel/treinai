import { formatStabilityForCoach, getRoutineStability } from "./routine-stability";
import { loadProfileWithTargets, type ProfileWithTargets } from "./profile";
import { computeLevel } from "./badges";
import { loadWeeklyMissions } from "./missions";
import { loadStreak } from "./streak-shields";
import { loadTotalXp } from "./xp";

const GOAL_LABEL: Record<string, string> = {
  hipertrofia: "hipertrofia",
  emagrecimento: "emagrecimento",
  "ganho-massa": "ganho de massa",
  enfase: "ênfase em um grupo muscular",
};

const ACTIVITY_LABEL: Record<string, string> = {
  sedentario: "sedentária (fica sentado a maior parte do dia)",
  leve: "leve (anda e fica em pé parte do dia)",
  moderado: "moderada (em pé/andando a maior parte do dia)",
  intenso: "intensa (trabalho físico pesado)",
};

function formatProfile(plan: ProfileWithTargets | null): string {
  if (!plan) {
    return "O usuário ainda não preencheu o perfil corporal (sem peso, altura, metas de calorias e de água).";
  }
  const { profile: p, targets: t } = plan;
  const lines = [
    `- Objetivo: ${GOAL_LABEL[p.goal] ?? p.goal}${p.emphasis ? ` (${p.emphasis})` : ""}; treina ${p.trainingDays} dias por semana`,
    `- ${p.ageYears} anos, ${p.heightCm} cm, ${p.weightKg} kg${p.bodyFatPct !== null ? `, ${p.bodyFatPct}% de gordura` : ""}${p.targetWeightKg ? `; peso desejado ${p.targetWeightKg} kg` : ""}`,
    `- Rotina fora da academia: ${ACTIVITY_LABEL[p.activityLevel] ?? p.activityLevel}`,
    `- TMB ${t.bmr} kcal; gasto diário estimado ${t.tdee} kcal (treino ≈ ${t.exerciseKcalPerDay} kcal/dia, ${t.exerciseSource === "real" ? "medido pelos treinos registrados" : "estimado pelos dias informados"})`,
    `- Meta diária: ${t.targetKcal} kcal (${t.adjustmentKcal >= 0 ? "+" : ""}${t.adjustmentKcal} kcal em relação ao gasto), proteína ${t.proteinG} g, carboidrato ${t.carbsG} g, gordura ${t.fatG} g`,
    `- Meta de água de hoje: ${(plan.waterTodayMl / 1000).toFixed(1)} L`,
  ];
  if (t.deficitBlockedReason) {
    lines.push(
      "- ATENÇÃO: a meta de calorias ficou em manutenção, sem déficit, por segurança (menor de idade ou restrição de saúde informada). Não sugira dieta restritiva e recomende acompanhamento com nutricionista ou médico.",
    );
  }
  return lines.join("\n");
}

export async function buildCoachContext(db: D1Database, userId: string): Promise<string> {
  const { results: exercises } = await db
    .prepare(
      `SELECT id, name, muscle_group, equipment FROM exercises
       WHERE user_id IS NULL OR user_id = ? ORDER BY muscle_group, name`
    )
    .bind(userId)
    .all<{ id: string; name: string; muscle_group: string; equipment: string }>();

  const { results: workouts } = await db
    .prepare("SELECT id, name, description FROM workouts WHERE user_id = ? AND archived_at IS NULL ORDER BY created_at DESC")
    .bind(userId)
    .all<{ id: string; name: string; description: string | null }>();

  const { results: workoutExercises } = await db
    .prepare(
      `SELECT we.workout_id, we.exercise_id, e.name AS exercise_name, we.order_index,
              we.target_sets, we.target_reps_min, we.target_reps_max, we.rest_time, we.notes
       FROM workout_exercises we
       JOIN exercises e ON e.id = we.exercise_id
       JOIN workouts w ON w.id = we.workout_id
       WHERE w.user_id = ? AND w.archived_at IS NULL
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

  const plan = await loadProfileWithTargets(db, userId);
  const eatenToday = plan
    ? await db
        .prepare(
          `SELECT COUNT(*) AS meals, COALESCE(SUM(kcal), 0) AS kcal, COALESCE(SUM(protein_g), 0) AS protein
           FROM meals WHERE user_id = ? AND local_date = ?`
        )
        .bind(userId, plan.today)
        .first<{ meals: number; kcal: number; protein: number }>()
        .catch(() => null)
    : null;
  const waterToday = plan
    ? await db
        .prepare("SELECT COALESCE(SUM(amount_ml), 0) AS ml FROM water_logs WHERE user_id = ? AND local_date = ?")
        .bind(userId, plan.today)
        .first<{ ml: number }>()
        .catch(() => null)
    : null;

  // Consumo de hoje sempre explícito, inclusive quando é zero: sem essa linha o modelo
  // confundia a meta com o consumido e dizia que o usuário já tinha batido as metas
  const consumedText = plan
    ? `\n\nCONSUMO REGISTRADO HOJE (${plan.today} — o que o usuário de fato registrou; não confunda com as metas acima):
- Refeições: ${eatenToday?.meals ?? 0}, ${Math.round(eatenToday?.kcal ?? 0)} kcal de ${plan.targets.targetKcal} kcal da meta, ${Math.round(eatenToday?.protein ?? 0)} g de proteína (estimativas)
- Água: ${((waterToday?.ml ?? 0) / 1000).toFixed(1)} L de ${(plan.waterTodayMl / 1000).toFixed(1)} L da meta
- Só diga que uma meta foi batida se o consumido acima for maior ou igual à meta. Valor zero significa que nada foi registrado ainda.`
    : "";

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

  return `PERFIL E PLANO NUTRICIONAL (calculado pelo app — use estes números, não recalcule):
${formatProfile(plan)}${consumedText}

CATÁLOGO DE EXERCÍCIOS DISPONÍVEIS (use somente estes ids):
${catalogText}

TREINOS ATUAIS DO USUÁRIO:
${workoutsText || "O usuário ainda não tem nenhum treino."}

ESTABILIDADE DA ROTINA:
${await stabilityText(db, userId)}

RECORDES PESSOAIS RECENTES (carga):
${prsText}

ÚLTIMOS TREINOS CONCLUÍDOS:
${sessionsText}${await gamificationText(db, userId)}`;
}

/** Tabela nova (migração 0012): se ainda não existir, o Théo segue sem essa informação */
async function stabilityText(db: D1Database, userId: string): Promise<string> {
  try {
    return formatStabilityForCoach(await getRoutineStability(db, userId));
  } catch {
    return "Sem informação sobre trocas recentes de treino.";
  }
}

/**
 * Nível, escudos e missões da semana: o Théo é o "mestre do jogo" e usa isso para motivar
 * (comemorar conquistas, lembrar o que falta para fechar uma missão).
 */
async function gamificationText(db: D1Database, userId: string): Promise<string> {
  try {
    const [xp, streak, week] = await Promise.all([
      loadTotalXp(db, userId),
      loadStreak(db, userId),
      loadWeeklyMissions(db, userId),
    ]);
    const { level, xpIntoLevel, xpForNextLevel } = computeLevel(xp);
    const missions = week.missions
      .map(
        (m) =>
          `- ${m.title} (${m.description}): ${m.progress.toLocaleString("pt-BR")}/${m.target.toLocaleString("pt-BR")} ${m.unit}, vale ${m.xp} XP${m.completed ? " — CONCLUÍDA" : ""}`,
      )
      .join("\n");
    return `

GAMIFICAÇÃO (use para motivar; comemore conquistas e diga quanto falta para fechar missões, sem inventar números):
- Nível ${level} (${xpIntoLevel}/${xpForNextLevel} XP para o próximo), ${xp} XP no total
- Constância: ${streak.streakDays} dias; escudos guardados: ${streak.shields} (cada escudo salva a constância num dia perdido; ganha 1 a cada 7 dias seguidos)
- Missões da semana (faltam ${week.daysLeft} dia(s) para acabar):
${missions}
- XP extra: meta de água do dia +15, 3 refeições registradas no dia +10, dia dentro da meta de calorias +20`;
  } catch {
    return "";
  }
}
