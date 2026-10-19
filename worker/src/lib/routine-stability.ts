import { newId, nowIso } from "./id";

/*
 * Estabilidade da rotina: trocar o treino toda hora impede a sobrecarga progressiva
 * (repetir os mesmos exercícios e subir carga/reps), que é o que gera resultado.
 * Recomendação usual: manter a mesma divisão por 4 a 8 semanas antes de trocar.
 */

const DAY_MS = 86_400_000;
/** Janela recomendada sem trocas */
export const RECOMMENDED_DAYS = 28;
/** Os primeiros dias da conta são de montagem do treino (onboarding, ajustes iniciais): não contam */
const SETUP_GRACE_DAYS = 3;

export type ChangeKind = "criado" | "alterado" | "removido";

/**
 * Registra a mudança depois que o treino já foi salvo. Nunca derruba a operação principal:
 * se a tabela ainda não existir (migração 0012 pendente), só deixa de registrar.
 */
export async function recordWorkoutChange(db: D1Database, userId: string, workoutId: string, kind: ChangeKind) {
  await db
    .prepare("INSERT INTO workout_changes (id, user_id, workout_id, kind, changed_at) VALUES (?, ?, ?, ?, ?)")
    .bind(newId(), userId, workoutId, kind, nowIso())
    .run()
    .catch(() => {});
}

export interface RoutineStability {
  /** "ok": pode mudar sem aviso; "atencao": mudou há pouco; "alerta": várias trocas no último mês */
  level: "ok" | "atencao" | "alerta";
  daysSinceLastChange: number | null;
  changesLast28Days: number;
  sessionsSinceLastChange: number;
  recommendedDays: number;
}

export async function getRoutineStability(db: D1Database, userId: string): Promise<RoutineStability> {
  const user = await db.prepare("SELECT created_at FROM users WHERE id = ?").bind(userId).first<{ created_at: string }>();
  // created_at pode vir em ISO (gravado pelo app) ou no formato do SQLite "YYYY-MM-DD HH:MM:SS" (UTC)
  const raw = user?.created_at ?? "";
  const parsed = new Date(raw.includes("T") ? raw : `${raw.replace(" ", "T")}Z`).getTime();
  const createdAt = Number.isNaN(parsed) ? 0 : parsed;
  const graceEnd = new Date(createdAt + SETUP_GRACE_DAYS * DAY_MS).toISOString();
  const windowStart = new Date(Date.now() - RECOMMENDED_DAYS * DAY_MS).toISOString();
  const since = graceEnd > windowStart ? graceEnd : windowStart;

  const recent = await db
    .prepare(
      `SELECT COUNT(DISTINCT substr(changed_at, 1, 10)) AS days_with_changes, MAX(changed_at) AS last_change
       FROM workout_changes WHERE user_id = ? AND changed_at >= ?`
    )
    .bind(userId, since)
    .first<{ days_with_changes: number; last_change: string | null }>();

  if (!recent?.last_change) {
    return {
      level: "ok",
      daysSinceLastChange: null,
      changesLast28Days: 0,
      sessionsSinceLastChange: 0,
      recommendedDays: RECOMMENDED_DAYS,
    };
  }

  const sessions = await db
    .prepare("SELECT COUNT(*) AS n FROM workout_sessions WHERE user_id = ? AND finished_at IS NOT NULL AND started_at >= ?")
    .bind(userId, recent.last_change)
    .first<{ n: number }>();

  // Montar vários treinos no mesmo dia (A/B/C) é uma troca só: contamos dias com mudança
  const changes = recent.days_with_changes;
  return {
    level: changes >= 3 ? "alerta" : "atencao",
    daysSinceLastChange: Math.floor((Date.now() - new Date(recent.last_change).getTime()) / DAY_MS),
    changesLast28Days: changes,
    sessionsSinceLastChange: sessions?.n ?? 0,
    recommendedDays: RECOMMENDED_DAYS,
  };
}

/** Texto para o contexto do Théo, com a regra de como ele deve reagir a pedidos de troca */
export function formatStabilityForCoach(s: RoutineStability): string {
  const status =
    s.level === "ok"
      ? "Rotina estável: nenhuma troca de treino nas últimas 4 semanas."
      : `Última mudança no treino há ${s.daysSinceLastChange} dia(s); ${s.changesLast28Days} dia(s) com trocas nas últimas 4 semanas; ${s.sessionsSinceLastChange} treino(s) feitos desde a última mudança.`;
  return `${status}
REGRA SOBRE TROCAR O TREINO: resultado vem de repetir os mesmos exercícios e aumentar carga ou repetições por 4 a 8 semanas. Se o usuário pedir para trocar, refazer ou montar outro treino e a rotina NÃO estiver estável, avise antes, com carinho e em 1–2 frases, que trocar com frequência atrapalha a evolução, e sugira manter o treino atual (ajustar carga, ordem ou um exercício pontual é ok). Só faça a troca completa se ele confirmar ou se houver motivo real: dor ou lesão, falta de equipamento, mudança de objetivo ou estagnação depois de 6 a 8 semanas.`;
}
