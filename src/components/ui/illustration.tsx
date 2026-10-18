import Image from "next/image";
import { cn } from "@/lib/utils";
import type { MuscleGroup } from "@/lib/types";

/*
 * Ilustrações 3D do Treinai (grafite + verde neon), estilo "objeto solto" como os serviços da Uber.
 * Os arquivos em /public/illustrations têm fundo preto: `mix-blend-screen` faz o preto sumir
 * sobre as superfícies escuras do app, sobrando só o objeto e o brilho.
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
  // Nutrição
  | "water";

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
  return (
    <Image
      src={`/illustrations/${name}.jpg`}
      alt=""
      aria-hidden
      width={size}
      height={size}
      priority={priority}
      // max-w-none: o reset do Tailwind (max-width: 100%) encolhia só a largura dentro de caixas menores
      className={cn("max-w-none shrink-0 select-none mix-blend-screen", className)}
      style={{ width: size, height: size }}
      draggable={false}
    />
  );
}
