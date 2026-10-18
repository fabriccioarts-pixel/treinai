/** Tipos da gamificação (espelham as respostas do worker em /gamification) */

/** Segue a moldura da arte: verde (entrada, sem nível) → prata → ouro → lendária (ouro com coroa) */
export type BadgeTier = "prata" | "ouro" | "lendaria";

export interface LevelInfo {
  level: number;
  xpIntoLevel: number;
  xpForNextLevel: number;
}

export interface Mission {
  key: string;
  title: string;
  description: string;
  progress: number;
  target: number;
  unit: string;
  xp: number;
  completed: boolean;
}

export interface Gamification extends LevelInfo {
  xp: number;
  missions: {
    weekKey: string;
    daysLeft: number;
    missions: Mission[];
    justCompleted: Mission[];
  };
  shields: {
    available: number;
    max: number;
    every: number;
    usedTotal: number;
    justUsed: number;
    nextIn: number;
  };
  recentXp: { source: string; amount: number; label: string; createdAt: string }[];
  newBadges: { key: string; label: string; description: string; icon: string; tier?: BadgeTier }[];
}

export interface SessionSummary {
  workoutName: string;
  durationSeconds: number;
  sets: number;
  exercises: number;
  volumeKg: number;
  prs: { exerciseName: string; weight: number; reps: number }[];
  xpGained: number;
  xpBreakdown: { label: string; amount: number }[];
  levelBefore: LevelInfo;
  levelAfter: LevelInfo;
  badges: { key: string; label: string; description: string; icon: string; tier?: BadgeTier }[];
  streakDays: number;
}

export const TIER_LABEL: Record<BadgeTier, string> = { prata: "Prata", ouro: "Ouro", lendaria: "Lendária" };

/** Cor de cada nível de conquista, igual à moldura da arte */
export const TIER_COLOR: Record<BadgeTier, string> = {
  prata: "oklch(0.82 0.01 250)",
  ouro: "var(--gold)",
  lendaria: "var(--gold)",
};

/** Worker antigo pode mandar níveis que não existem mais ("bronze"): nesses casos não mostra etiqueta */
export function isBadgeTier(tier: unknown): tier is BadgeTier {
  return typeof tier === "string" && tier in TIER_LABEL;
}
