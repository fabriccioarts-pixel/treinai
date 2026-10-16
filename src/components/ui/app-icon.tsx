import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

/*
 * Ícones de identidade do Treinai (traço chanfrado e inclinado).
 * Cada PNG em /public/icons é branco com fundo transparente e é usado como máscara:
 * o ícone pinta com `currentColor`, então segue as classes text-* como um ícone do lucide.
 * Ícones de função (setas, X, +, ✓, lixeira…) continuam vindo do lucide-react.
 */
export type AppIconName =
  | "home"
  | "workout"
  | "progress"
  | "profile"
  | "pr"
  | "goal"
  | "streak"
  | "photo"
  | "sets"
  | "rest"
  | "start"
  | "trend"
  | "ai"
  | "frequency"
  | "xp"
  | "focus";

export interface AppIconProps {
  className?: string;
  style?: CSSProperties;
  /** Aceito só por compatibilidade com o lucide; a espessura do traço é fixa na arte */
  strokeWidth?: number;
  "aria-label"?: string;
}

/** Tipo aceito por props `icon` (lucide ou ícone próprio) */
export type IconComponent = React.ComponentType<AppIconProps>;

export function AppIcon({ name, className, style, "aria-label": label }: AppIconProps & { name: AppIconName }) {
  const url = `url(/icons/${name}.png)`;
  return (
    <span
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cn("inline-block h-6 w-6 shrink-0 bg-current", className)}
      style={{
        maskImage: url,
        WebkitMaskImage: url,
        maskSize: "contain",
        WebkitMaskSize: "contain",
        maskRepeat: "no-repeat",
        WebkitMaskRepeat: "no-repeat",
        maskPosition: "center",
        WebkitMaskPosition: "center",
        ...style,
      }}
    />
  );
}

function makeIcon(name: AppIconName, displayName: string) {
  function Icon(props: AppIconProps) {
    return <AppIcon name={name} {...props} />;
  }
  Icon.displayName = displayName;
  return Icon;
}

export const HomeIcon = makeIcon("home", "HomeIcon");
export const WorkoutIcon = makeIcon("workout", "WorkoutIcon");
export const ProgressIcon = makeIcon("progress", "ProgressIcon");
export const ProfileIcon = makeIcon("profile", "ProfileIcon");
export const PrIcon = makeIcon("pr", "PrIcon");
export const GoalIcon = makeIcon("goal", "GoalIcon");
export const StreakIcon = makeIcon("streak", "StreakIcon");
export const PhotoIcon = makeIcon("photo", "PhotoIcon");
export const SetsIcon = makeIcon("sets", "SetsIcon");
export const RestIcon = makeIcon("rest", "RestIcon");
export const StartIcon = makeIcon("start", "StartIcon");
export const TrendIcon = makeIcon("trend", "TrendIcon");
export const AiIcon = makeIcon("ai", "AiIcon");
export const FrequencyIcon = makeIcon("frequency", "FrequencyIcon");
export const XpIcon = makeIcon("xp", "XpIcon");
export const FocusIcon = makeIcon("focus", "FocusIcon");
