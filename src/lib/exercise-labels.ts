import type { Equipment, ExerciseType } from "./types";

export const EQUIPMENT_LABEL: Record<Equipment, string> = {
  barra: "Barra",
  halteres: "Halteres",
  maquina: "Máquina",
  cabo: "Cabo / polia",
  "peso-corporal": "Peso corporal",
  outro: "Outro",
};

export const EXERCISE_TYPE_LABEL: Record<ExerciseType, string> = {
  composto: "Composto",
  isolado: "Isolado",
  cardio: "Cardio",
};

/** Uma linha explicando o tipo, para quem não conhece o termo */
export const EXERCISE_TYPE_HINT: Record<ExerciseType, string> = {
  composto: "Trabalha várias articulações e grupos musculares ao mesmo tempo.",
  isolado: "Foca em um músculo, com movimento em uma só articulação.",
  cardio: "Condicionamento e gasto calórico.",
};
