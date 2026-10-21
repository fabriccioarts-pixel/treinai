/**
 * Métodos de treino: conjugados (exercícios seguidos sem descanso) e técnicas de intensidade.
 * Os ids das técnicas espelham TECHNIQUES em worker/src/lib/workout-mutations.ts.
 */

export type Technique =
  | "drop-set"
  | "rest-pause"
  | "piramide-crescente"
  | "piramide-decrescente"
  | "falha"
  | "parciais"
  | "isometria"
  | "cadencia";

export const TECHNIQUES: { id: Technique; label: string; hint: string }[] = [
  {
    id: "drop-set",
    label: "Drop-set",
    hint: "Na última série, ao chegar perto da falha, tire 20–30% da carga e continue sem descanso. Repita 1–2 vezes.",
  },
  {
    id: "rest-pause",
    label: "Rest-pause",
    hint: "Na última série, vá até perto da falha, respire 15–20s e faça mais repetições com a mesma carga. Repita 2–3 vezes.",
  },
  {
    id: "piramide-crescente",
    label: "Pirâmide crescente",
    hint: "Suba a carga a cada série e faça menos repetições (ex.: 12, 10, 8).",
  },
  {
    id: "piramide-decrescente",
    label: "Pirâmide decrescente",
    hint: "Comece com a carga mais pesada e alivie a cada série, fazendo mais repetições.",
  },
  {
    id: "falha",
    label: "Até a falha",
    hint: "Leve a última série até não conseguir fazer mais uma repetição com boa técnica.",
  },
  {
    id: "parciais",
    label: "Parciais alongadas",
    hint: "Quando não sair mais a repetição completa, faça 3–5 parciais na parte alongada do movimento.",
  },
  {
    id: "isometria",
    label: "Isometria",
    hint: "Segure 2–3s na posição de maior contração em cada repetição.",
  },
  {
    id: "cadencia",
    label: "Descida lenta",
    hint: "Desça em 3–4s controlando a carga e suba com força.",
  },
];

const TECHNIQUE_BY_ID = new Map(TECHNIQUES.map((t) => [t.id, t]));

export function techniqueInfo(id: string | null | undefined) {
  return id ? (TECHNIQUE_BY_ID.get(id as Technique) ?? null) : null;
}

/** Nome do conjugado pelo tamanho: 2 = bi-set, 3 = tri-set, 4+ = série gigante */
export function supersetLabel(size: number) {
  if (size <= 2) return "Bi-set";
  if (size === 3) return "Tri-set";
  return "Série gigante";
}

/**
 * Agrupa a lista do treino (já na ordem de execução) em blocos: exercícios seguidos com o
 * mesmo superset_group formam um conjugado; os demais ficam sozinhos.
 */
export function toExerciseBlocks<T extends { superset_group?: number | null }>(exercises: T[]): T[][] {
  const blocks: T[][] = [];
  for (const exercise of exercises) {
    const last = blocks.at(-1);
    const group = exercise.superset_group ?? null;
    if (last && group !== null && last[0].superset_group === group) last.push(exercise);
    else blocks.push([exercise]);
  }
  return blocks;
}
