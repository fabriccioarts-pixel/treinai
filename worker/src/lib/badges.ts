import { newId, nowIso } from "./id";

export interface BadgeDef {
  key: string;
  label: string;
  description: string;
  icon: string; // nome do ícone lucide-react usado no front
}

export const BADGE_CATALOG: BadgeDef[] = [
  { key: "primeiro-treino", label: "Primeiro treino", description: "Concluiu o primeiro treino.", icon: "Flag" },
  { key: "primeiro-pr", label: "Primeiro PR", description: "Bateu o primeiro recorde pessoal.", icon: "Trophy" },
  { key: "sequencia-7", label: "Uma semana em chamas", description: "7 dias seguidos de treino.", icon: "Flame" },
  { key: "sequencia-30", label: "Hábito formado", description: "30 dias seguidos de treino.", icon: "Flame" },
  { key: "treinos-10", label: "Dez treinos", description: "Concluiu 10 treinos.", icon: "Medal" },
  { key: "treinos-50", label: "Cinquenta treinos", description: "Concluiu 50 treinos.", icon: "Medal" },
  { key: "treinos-100", label: "Cem treinos", description: "Concluiu 100 treinos.", icon: "Medal" },
  { key: "prs-5", label: "Colecionador de PRs", description: "5 recordes pessoais batidos.", icon: "Star" },
  { key: "prs-20", label: "Máquina de PRs", description: "20 recordes pessoais batidos.", icon: "Star" },
  { key: "volume-1t", label: "Uma tonelada", description: "1.000 kg levantados no total.", icon: "Dumbbell" },
  { key: "volume-10t", label: "Dez toneladas", description: "10.000 kg levantados no total.", icon: "Dumbbell" },
  { key: "primeira-meta", label: "Meta batida", description: "Alcançou sua primeira meta de carga.", icon: "Target" },
];

interface UserAggregates {
  finishedSessions: number;
  prCount: number;
  totalVolume: number;
  streakDays: number;
  goalsAchieved: number;
}

function metBy(key: string, agg: UserAggregates): boolean {
  switch (key) {
    case "primeiro-treino":
      return agg.finishedSessions >= 1;
    case "primeiro-pr":
      return agg.prCount >= 1;
    case "sequencia-7":
      return agg.streakDays >= 7;
    case "sequencia-30":
      return agg.streakDays >= 30;
    case "treinos-10":
      return agg.finishedSessions >= 10;
    case "treinos-50":
      return agg.finishedSessions >= 50;
    case "treinos-100":
      return agg.finishedSessions >= 100;
    case "prs-5":
      return agg.prCount >= 5;
    case "prs-20":
      return agg.prCount >= 20;
    case "volume-1t":
      return agg.totalVolume >= 1000;
    case "volume-10t":
      return agg.totalVolume >= 10000;
    case "primeira-meta":
      return agg.goalsAchieved >= 1;
    default:
      return false;
  }
}

/**
 * Calcula os agregados do usuário e desbloqueia badges novas. Retorna as
 * badges recém-desbloqueadas nesta chamada (para celebrar no front).
 */
export async function evaluateBadges(db: D1Database, userId: string): Promise<BadgeDef[]> {
  const [sessionsRow, prRow, volumeRow, goalsRow, existing] = await Promise.all([
    db
      .prepare("SELECT COUNT(*) AS n FROM workout_sessions WHERE user_id = ? AND finished_at IS NOT NULL")
      .bind(userId)
      .first<{ n: number }>(),
    db
      .prepare("SELECT COUNT(*) AS n FROM personal_records WHERE user_id = ? AND type = 'carga'")
      .bind(userId)
      .first<{ n: number }>(),
    db
      .prepare(
        `SELECT COALESCE(SUM(s.weight * s.reps), 0) AS total FROM sets s
         JOIN workout_sessions ws ON ws.id = s.session_id
         WHERE ws.user_id = ? AND s.completed = 1`
      )
      .bind(userId)
      .first<{ total: number }>(),
    db
      .prepare("SELECT COUNT(*) AS n FROM load_goals WHERE user_id = ? AND achieved_at IS NOT NULL")
      .bind(userId)
      .first<{ n: number }>(),
    db.prepare("SELECT badge_key FROM user_badges WHERE user_id = ?").bind(userId).all<{ badge_key: string }>(),
  ]);

  const { results: finishedSessions } = await db
    .prepare(
      "SELECT finished_at FROM workout_sessions WHERE user_id = ? AND finished_at IS NOT NULL ORDER BY finished_at DESC"
    )
    .bind(userId)
    .all<{ finished_at: string }>();

  const streakDays = computeStreak(finishedSessions.map((s) => s.finished_at));

  const agg: UserAggregates = {
    finishedSessions: sessionsRow?.n ?? 0,
    prCount: prRow?.n ?? 0,
    totalVolume: volumeRow?.total ?? 0,
    streakDays,
    goalsAchieved: goalsRow?.n ?? 0,
  };

  const alreadyUnlocked = new Set(existing.results.map((r) => r.badge_key));
  const newlyUnlocked: BadgeDef[] = [];
  const inserts = [];

  for (const badge of BADGE_CATALOG) {
    if (alreadyUnlocked.has(badge.key)) continue;
    if (metBy(badge.key, agg)) {
      newlyUnlocked.push(badge);
      inserts.push(
        db
          .prepare("INSERT INTO user_badges (id, user_id, badge_key, achieved_at) VALUES (?, ?, ?, ?)")
          .bind(newId(), userId, badge.key, nowIso())
      );
    }
  }

  if (inserts.length) await db.batch(inserts);
  return newlyUnlocked;
}

function computeStreak(finishedDatesIso: string[]): number {
  const DAY_MS = 86_400_000;
  const now = Date.now();
  const finishedDates = new Set(finishedDatesIso.map((d) => new Date(d).toISOString().slice(0, 10)));
  let streak = 0;
  for (let d = 0; d < 400; d++) {
    const day = new Date(now - d * DAY_MS).toISOString().slice(0, 10);
    if (finishedDates.has(day)) streak++;
    else if (d > 0) break;
  }
  return streak;
}

/** Nível simples derivado de XP acumulado (sem contador separado — sempre consistente). */
export function computeLevel(xp: number): { level: number; xpIntoLevel: number; xpForNextLevel: number } {
  const XP_PER_LEVEL_BASE = 100;
  let level = 1;
  let remaining = xp;
  let threshold = XP_PER_LEVEL_BASE;
  while (remaining >= threshold) {
    remaining -= threshold;
    level++;
    threshold = Math.round(XP_PER_LEVEL_BASE * (1 + level * 0.25));
  }
  return { level, xpIntoLevel: remaining, xpForNextLevel: threshold };
}
