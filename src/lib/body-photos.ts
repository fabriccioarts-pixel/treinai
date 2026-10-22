/*
 * Fotos do corpo e análise do shape (worker: routes/body.ts, lib/body-analysis.ts).
 * Tipos e textos compartilhados pelas telas e pelas ações do servidor.
 */

export const BODY_POSES = ["frente", "lado", "costas"] as const;
export type BodyPose = (typeof BODY_POSES)[number];

export const POSE_LABEL: Record<BodyPose, string> = {
  frente: "Frente",
  lado: "Lado",
  costas: "Costas",
};

/** Como fazer cada pose, mostrado na câmera */
export const POSE_HINT: Record<BodyPose, string> = {
  frente: "De frente, braços soltos ao lado do corpo, pés na largura do quadril",
  lado: "De lado (perfil direito), braços soltos, olhando para a frente",
  costas: "De costas, braços soltos ao lado do corpo, pés na largura do quadril",
};

/** Guia de como tirar as fotos: o que muda de uma foto para outra tem que ser o corpo, não a foto */
export const PHOTO_GUIDE = [
  { title: "Mesmo lugar e mesma luz", text: "Parede lisa, luz de frente (janela ou lâmpada no teto). Evite contraluz." },
  { title: "Mesmo horário", text: "De manhã, antes de comer e de treinar. O corpo muda bastante ao longo do dia." },
  { title: "Roupa justa", text: "Roupa de treino justa, top ou sunga. Roupa larga esconde o que a foto quer mostrar." },
  { title: "Celular na altura do umbigo", text: "Apoie o celular a uns 2 metros, reto, com o corpo inteiro no quadro. Use o temporizador." },
  { title: "Postura relaxada", text: "Sem contrair nem encolher a barriga. Os mesmos pés e braços em toda foto." },
  { title: "A cada 2 a 4 semanas", text: "Mudanças aparecem devagar. Tirar toda semana só gera ansiedade." },
] as const;

export interface BodyConsent {
  photos: string | null;
  ai: string | null;
  adult: string | null;
}

export interface BodyPhoto {
  id: string;
  pose: BodyPose;
  takenOn: string;
  createdAt: string;
}

export interface BodyAnalysisResult {
  summary: string;
  strengths: string[];
  focusAreas: { muscle: string; reason: string }[];
  postureNote: string;
  workout: {
    name: string;
    description: string;
    exercises: {
      exerciseId: string;
      targetSets: number;
      targetRepsMin: number;
      targetRepsMax: number;
      restTime: number;
      notes: string;
    }[];
  };
  confidence: "alta" | "media" | "baixa";
  note: string;
}

export interface BodyAnalysis {
  id: string;
  takenOn: string;
  createdAt: string;
  workoutId: string | null;
  result: BodyAnalysisResult;
}

export interface BodyOverview {
  consent: BodyConsent;
  photos: BodyPhoto[];
  analyses: BodyAnalysis[];
}

/** Fotos agrupadas por dia (um "registro"), mais recente primeiro */
export function groupByDay(photos: BodyPhoto[]) {
  const days = new Map<string, Partial<Record<BodyPose, BodyPhoto>>>();
  for (const p of photos) {
    const day = days.get(p.takenOn) ?? {};
    day[p.pose] ??= p;
    days.set(p.takenOn, day);
  }
  return [...days.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([takenOn, poses]) => ({ takenOn, poses }));
}

export function bodyPhotoUrl(id: string) {
  return `/api/corpo/${id}`;
}
