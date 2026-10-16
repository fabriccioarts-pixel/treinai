import Image from "next/image";
import { Lock } from "lucide-react";
import { PrIcon } from "@/components/ui/app-icon";
import { cn } from "@/lib/utils";

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
]);

/**
 * Ícone 3D da conquista. A arte tem fundo preto, então usamos `mix-blend-screen`:
 * o preto some e só o brilho do emblema aparece sobre o card escuro.
 * Bloqueada = mesma arte em cinza, apagada, com cadeado por cima.
 */
export function BadgeIcon({
  badgeKey,
  unlocked,
  size = 44,
  showLock = true,
  className,
}: {
  badgeKey: string;
  unlocked: boolean;
  size?: number;
  showLock?: boolean;
  className?: string;
}) {
  if (!BADGE_ART.has(badgeKey)) {
    return (
      <div
        className={cn("flex items-center justify-center", unlocked ? "text-gold" : "text-muted-foreground/50", className)}
        style={{ width: size, height: size }}
      >
        <PrIcon className="h-1/2 w-1/2" />
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
