import Image from "next/image";
import {
  Droplet,
  Dumbbell,
  Flag,
  Flame,
  Lock,
  Medal,
  Moon,
  PersonStanding,
  ScrollText,
  Shield,
  Star,
  Sunrise,
  Target,
  TrendingUp,
  Trophy,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { PrIcon } from "@/components/ui/app-icon";
import { cn } from "@/lib/utils";
import { isBadgeTier, TIER_COLOR, type BadgeTier } from "@/lib/gamification";

/** Conquistas com arte própria em /public/badges/<key>.png */
const BADGE_ART = new Set([
  "primeiro-treino",
  "primeiro-pr",
  "sequencia-7",
  "sequencia-30",
  "treinos-10",
  "treinos-50",
  "treinos-100",
  "prs-5",
  "prs-20",
  "volume-1t",
  "volume-10t",
  "primeira-meta",
  "sequencia-90",
  "prs-50",
  "volume-100t",
  "agua-7",
  "agua-30",
  "missoes-1",
  "missoes-10",
  "missoes-30",
  "dobrou-carga",
  "corpo-completo",
  "nivel-10",
  "madrugador",
  "coruja",
  "salvo-pelo-escudo",
]);

/**
 * Ícone 3D da conquista. A arte tem fundo preto, então usamos `mix-blend-screen`:
 * o preto some e só o brilho do emblema aparece sobre o card escuro.
 * Bloqueada = mesma arte em cinza, apagada, com cadeado por cima.
 */
/** Ícone do emblema para conquistas sem arte própria (nome vindo do catálogo do worker) */
const FALLBACK_ICONS: Record<string, LucideIcon> = {
  Flame,
  Medal,
  Star,
  Dumbbell,
  Droplet,
  ScrollText,
  TrendingUp,
  PersonStanding,
  Zap,
  Sunrise,
  Moon,
  Shield,
  Target,
  Trophy,
  Flag,
};

export function BadgeIcon({
  badgeKey,
  unlocked,
  icon,
  tier,
  size = 44,
  showLock = true,
  className,
}: {
  badgeKey: string;
  unlocked: boolean;
  /** Nome do ícone lucide, usado quando a conquista não tem arte própria */
  icon?: string;
  tier?: BadgeTier;
  size?: number;
  showLock?: boolean;
  className?: string;
}) {
  if (!BADGE_ART.has(badgeKey)) {
    const Icon = icon ? FALLBACK_ICONS[icon] : undefined;
    const color = isBadgeTier(tier) ? TIER_COLOR[tier] : "var(--gold)";
    return (
      <div
        className={cn(
          "relative flex shrink-0 items-center justify-center rounded-full",
          !unlocked && "opacity-40 grayscale",
          className,
        )}
        style={{
          width: size,
          height: size,
          color,
          background: `radial-gradient(circle at 35% 30%, color-mix(in oklch, ${color} 35%, transparent), color-mix(in oklch, ${color} 8%, transparent) 70%)`,
          boxShadow: `inset 0 0 0 ${Math.max(1.5, size / 28)}px color-mix(in oklch, ${color} 70%, transparent)`,
        }}
      >
        {Icon ? (
          <Icon style={{ width: size * 0.46, height: size * 0.46 }} strokeWidth={2.2} />
        ) : (
          <PrIcon className="h-1/2 w-1/2" />
        )}
        {!unlocked && showLock && (
          <Lock
            className="absolute -bottom-0.5 -right-0.5 rounded-full bg-card p-0.5 text-muted-foreground"
            style={{ width: size * 0.36, height: size * 0.36 }}
          />
        )}
      </div>
    );
  }

  return (
    <div className={cn("relative shrink-0", className)} style={{ width: size, height: size }}>
      <Image
        src={`/badges/${badgeKey}.png`}
        alt=""
        width={size}
        height={size}
        className={cn(
          "h-full w-full mix-blend-screen",
          !unlocked && "opacity-30 grayscale",
        )}
      />
      {!unlocked && showLock && (
        <Lock
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-muted-foreground"
          style={{ width: size * 0.3, height: size * 0.3 }}
        />
      )}
    </div>
  );
}
