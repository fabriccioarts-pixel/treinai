import Image from "next/image";
import { cn } from "@/lib/utils";
import type { MuscleGroup } from "@/lib/types";

/*
 * Ilustrações 3D do Treinai (grafite + verde neon), estilo "objeto solto" como os serviços da Uber.
 * As antigas em /public/illustrations são JPG com fundo preto: `mix-blend-screen` faz o preto sumir
 * sobre as superfícies escuras do app. As novas são PNG com fundo transparente e dispensam o efeito.
 */
export type IllustrationName =
  // Áreas do app
  | "home"
  | "workouts"
  | "new-workout"
  | "first-workout"
  | "in-progress"
  | "complete"
  | "theo"
  | "progress"
  | "pr"
  | "photos"
  | "goals"
  | "profile"
  | "achievements"
  // Objetivos do onboarding
  | "hypertrophy"
  | "fat-loss"
  | "mass-gain"
  | "focus"
  // Grupos musculares e recuperação
  | "chest"
  | "back"
  | "legs"
  | "shoulders"
  | "arms"
  | "abs"
  | "cardio"
  | "recovery"
  | "volume"
  // Assinatura
  | "trial"
  // Nutrição
  | "water"
  | "meal-plan";

export const MUSCLE_ILLUSTRATION: Record<MuscleGroup, IllustrationName> = {
  peito: "chest",
  costas: "back",
  pernas: "legs",
  ombros: "shoulders",
  biceps: "arms",
  triceps: "arms",
  abdomen: "abs",
  cardio: "cardio",
};

/** Já em PNG transparente; as demais ainda são JPG com fundo preto */
const TRANSPARENT: ReadonlySet<IllustrationName> = new Set(["meal-plan", "volume", "trial"]);

export function Illustration({
  name,
  size = 96,
  className,
  priority,
}: {
  name: IllustrationName;
  size?: number;
  className?: string;
  priority?: boolean;
}) {
  const transparent = TRANSPARENT.has(name);
  return (
    <Image
      src={`/illustrations/${name}.${transparent ? "png" : "jpg"}`}
      alt=""
      aria-hidden
      width={size}
      height={size}
      priority={priority}
      // max-w-none: o reset do Tailwind (max-width: 100%) encolhia só a largura dentro de caixas menores
      className={cn("max-w-none shrink-0 select-none", !transparent && "mix-blend-screen", className)}
      style={{ width: size, height: size }}
      draggable={false}
    />
  );
}
