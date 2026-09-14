/** Espelha src/lib/calculations.ts do app Next.js — mantido isolado de propósito. */
export function estimateOneRepMax(weight: number, reps: number): number {
  if (reps <= 0 || weight <= 0) return 0;
  if (reps === 1) return weight;
  return weight * (1 + reps / 30);
}

export function setVolume(weight: number, reps: number): number {
  return weight * reps;
}
