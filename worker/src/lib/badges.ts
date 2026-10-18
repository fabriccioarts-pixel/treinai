import { newId, nowIso } from "./id";
import { loadStreak } from "./streak-shields";
import { loadTotalXp } from "./xp";

/** Segue a moldura da arte: verde (entrada, sem nível) → prata → ouro → lendária (ouro com coroa) */
export type BadgeTier = "prata" | "ouro" | "lendaria";

export interface BadgeDef {
  key: string;
  label: string;
  description: string;
  icon: string; // nome do ícone lucide-react usado no front
  /** Conquistas em níveis da mesma família (ex.: 10, 50 e 100 treinos) */
  tier?: BadgeTier;
  /** Secreta: aparece como "???" até ser desbloqueada */
  hidden?: boolean;
}

export const BADGE_CATALOG: BadgeDef[] = [
  { key: "primeiro-treino", label: "Primeiro treino", description: "Concluiu o primeiro treino.", icon: "Flag" },
  { key: "primeiro-pr", label: "Primeiro PR", description: "Bateu o primeiro recorde pessoal.", icon: "Trophy" },
  { key: "primeira-meta", label: "Meta batida", description: "Alcançou sua primeira meta de carga.", icon: "Target" },
  { key: "sequencia-7", label: "Uma semana em chamas", description: "7 dias seguidos de treino.", icon: "Flame" },
  { key: "sequencia-30", label: "Hábito formado", description: "30 dias seguidos de treino.", icon: "Flame", tier: "ouro" },
  { key: "sequencia-90", label: "Inabalável", description: "90 dias seguidos de treino.", icon: "Flame", tier: "lendaria" },
  { key: "treinos-10", label: "Dez treinos", description: "Concluiu 10 treinos.", icon: "Medal" },
  { key: "treinos-50", label: "Cinquenta treinos", description: "Concluiu 50 treinos.", icon: "Medal", tier: "prata" },
  { key: "treinos-100", label: "Cem treinos", description: "Concluiu 100 treinos.", icon: "Medal", tier: "ouro" },
  { key: "prs-5", label: "Colecionador de PRs", description: "5 recordes pessoais batidos.", icon: "Star", tier: "prata" },
  { key: "prs-20", label: "Máquina de PRs", description: "20 recordes pessoais batidos.", icon: "Star", tier: "ouro" },
  { key: "prs-50", label: "Lenda dos recordes", description: "50 recordes pessoais batidos.", icon: "Star", tier: "lendaria" },
  { key: "volume-1t", label: "Uma tonelada", description: "1.000 kg levantados no total.", icon: "Dumbbell", tier: "prata" },
  { key: "volume-10t", label: "Dez toneladas", description: "10.000 kg levantados no total.", icon: "Dumbbell", tier: "ouro" },
  { key: "volume-100t", label: "Cem toneladas", description: "100.000 kg levantados no total.", icon: "Dumbbell", tier: "lendaria" },
  { key: "agua-7", label: "Hidratado", description: "Bateu a meta de água em 7 dias.", icon: "Droplet", tier: "prata" },
  { key: "agua-30", label: "Fonte de energia", description: "Bateu a meta de água em 30 dias.", icon: "Droplet", tier: "ouro" },
  { key: "missoes-1", label: "Missão cumprida", description: "Completou a primeira missão da semana.", icon: "ScrollText" },
  { key: "missoes-10", label: "Caçador de missões", description: "Completou 10 missões da semana.", icon: "ScrollText", tier: "prata" },
  { key: "missoes-30", label: "Mestre das missões", description: "Completou 30 missões da semana.", icon: "ScrollText", tier: "ouro" },
  { key: "dobrou-carga", label: "Dobrou a carga", description: "Dobrou a carga de algum exercício desde o primeiro registro.", icon: "TrendingUp" },
  { key: "corpo-completo", label: "Corpo completo", description: "Treinou peito, costas, pernas, ombros, bíceps e tríceps em 7 dias.", icon: "PersonStanding" },
  { key: "nivel-10", label: "Nível 10", description: "Chegou ao nível 10.", icon: "Zap" },
  { key: "madrugador", label: "Madrugador", description: "Treinou antes das 7h da manhã.", icon: "Sunrise", hidden: true },
  { key: "coruja", label: "Coruja", description: "Treinou depois das 22h.", icon: "Moon", hidden: true },
  { key: "salvo-pelo-escudo", label: "Salvo pelo escudo", description: "Um escudo salvou sua constância.", icon: "Shield", hidden: true },
];

const UPPER_LOWER_GROUPS = ["peito", "costas", "pernas", "ombros", "biceps", "triceps"];
const DEFAULT_TIME_ZONE = "America/Sao_Paulo";

interface UserAggregates {
  finishedSessions: number;
  prCount: number;
  totalVolume: number;
  streakDays: number;
  goalsAchieved: number;
  waterGoalDays: number;
  missionsCompleted: number;
  doubledLoad: boolean;
  fullBodyWeek: boolean;
  level: number;
  earlyBird: boolean;
  nightOwl: boolean;
  shieldsUsed: number;
}

function metBy(key: string, agg: UserAggregates): boolean {
  switch (key) {
    case "sequencia-90":
      return agg.streakDays >= 90;
    case "prs-50":
      return agg.prCount >= 50;
    case "volume-100t":
      return agg.totalVolume >= 100_000;
    case "agua-7":
      return agg.waterGoalDays >= 7;
    case "agua-30":
      return agg.waterGoalDays >= 30;
    case "missoes-1":
      return agg.missionsCompleted >= 1;
    case "missoes-10":
      return agg.missionsCompleted >= 10;
    case "missoes-30":
      return agg.missionsCompleted >= 30;
    case "dobrou-carga":
      return agg.doubledLoad;
    case "corpo-completo":
      return agg.fullBodyWeek;
    case "nivel-10":
      return agg.level >= 10;
    case "madrugador":
      return agg.earlyBird;
    case "coruja":
      return agg.nightOwl;
    case "salvo-pelo-escudo":
      return agg.shieldsUsed >= 1;
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

  const weekAgoIso = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const [streak, totalXp, startedRes, loadPrsRes, recentGroupsRes, xpCounts, tzRow] = await Promise.all([
    loadStreak(db, userId),
    loadTotalXp(db, userId),
    db
      .prepare("SELECT started_at FROM workout_sessions WHERE user_id = ? AND finished_at IS NOT NULL")
      .bind(userId)
      .all<{ started_at: string }>(),
    db
      .prepare(
        "SELECT exercise_id, weight FROM personal_records WHERE user_id = ? AND type = 'carga' ORDER BY achieved_at ASC"
      )
      .bind(userId)
      .all<{ exercise_id: string; weight: number }>(),
    db
      .prepare(
        `SELECT DISTINCT e.muscle_group FROM sets st
         JOIN workout_sessions ws ON ws.id = st.session_id
         JOIN exercises e ON e.id = st.exercise_id
         WHERE ws.user_id = ? AND st.completed = 1 AND ws.finished_at >= ?`
      )
      .bind(userId, weekAgoIso)
      .all<{ muscle_group: string }>(),
    db
      .prepare(
        "SELECT source, COUNT(*) AS n FROM xp_events WHERE user_id = ? AND source IN ('agua', 'missao') GROUP BY source"
      )
      .bind(userId)
      .all<{ source: string; n: number }>()
      .catch(() => ({ results: [] as { source: string; n: number }[] })),
    db.prepare("SELECT timezone FROM user_profiles WHERE user_id = ?").bind(userId).first<{ timezone: string }>(),
  ]);

  // Hora local de início de cada treino, para as conquistas secretas de horário
  const hourFormat = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    hourCycle: "h23",
    timeZone: tzRow?.timezone ?? DEFAULT_TIME_ZONE,
  });
  const startHours = startedRes.results.map((s) =>
    Number(hourFormat.format(new Date(s.started_at.includes("T") ? s.started_at : `${s.started_at.replace(" ", "T")}Z`)))
  );

  // Primeiro recorde de carga x maior carga, por exercício
  const firstLoad = new Map<string, number>();
  const maxLoad = new Map<string, number>();
  for (const pr of loadPrsRes.results) {
    if (!firstLoad.has(pr.exercise_id)) firstLoad.set(pr.exercise_id, pr.weight);
    maxLoad.set(pr.exercise_id, Math.max(maxLoad.get(pr.exercise_id) ?? 0, pr.weight));
  }
  const doubledLoad = [...firstLoad].some(([id, first]) => first > 0 && (maxLoad.get(id) ?? 0) >= first * 2);
  const recentGroups = new Set(recentGroupsRes.results.map((r) => r.muscle_group));
  const xpCount = (source: string) => xpCounts.results.find((r) => r.source === source)?.n ?? 0;

  const agg: UserAggregates = {
    finishedSessions: sessionsRow?.n ?? 0,
    prCount: prRow?.n ?? 0,
    totalVolume: volumeRow?.total ?? 0,
    streakDays: streak.streakDays,
    goalsAchieved: goalsRow?.n ?? 0,
    waterGoalDays: xpCount("agua"),
    missionsCompleted: xpCount("missao"),
    doubledLoad,
    fullBodyWeek: UPPER_LOWER_GROUPS.every((g) => recentGroups.has(g)),
    level: computeLevel(totalXp).level,
    earlyBird: startHours.some((h) => h >= 4 && h < 7),
    nightOwl: startHours.some((h) => h >= 22),
    shieldsUsed: streak.shieldsUsedTotal,
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
