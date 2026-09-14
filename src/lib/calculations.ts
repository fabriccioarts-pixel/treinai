/**
 * Regras de cálculo centralizadas (carga, volume, 1RM).
 * Mantidas isoladas para que a fórmula de 1RM possa ser trocada no futuro
 * sem afetar quem a consome.
 */

/**
 * 1RM estimado via fórmula de Epley. Não é uma medição real de força.
 */
export function estimateOneRepMax(weight: number, reps: number): number {
  if (reps <= 0 || weight <= 0) return 0;
  if (reps === 1) return weight;
  return weight * (1 + reps / 30);
}

export function setVolume(weight: number, reps: number): number {
  return weight * reps;
}

export function totalVolume(sets: { weight: number; reps: number }[]): number {
  return sets.reduce((sum, set) => sum + setVolume(set.weight, set.reps), 0);
}
