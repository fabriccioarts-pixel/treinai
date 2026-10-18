import { XpIcon } from "@/components/ui/app-icon";
import { cn } from "@/lib/utils";
import type { LevelInfo } from "@/lib/gamification";

/** Selo do nível + barra de XP até o próximo */
export function LevelBar({ level, xpIntoLevel, xpForNextLevel, className }: LevelInfo & { className?: string }) {
  const pct = Math.min(100, Math.round((xpIntoLevel / Math.max(1, xpForNextLevel)) * 100));
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <span
        className="tabular flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-base font-bold text-primary ring-1 ring-primary/30"
        aria-label={`Nível ${level}`}
      >
        {level}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2 text-xs">
          <span className="font-semibold text-foreground">Nível {level}</span>
          <span className="tabular flex items-center gap-1 text-muted-foreground">
            <XpIcon className="h-3 w-3" />
            {xpIntoLevel}/{xpForNextLevel} XP
          </span>
        </div>
        <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted" aria-hidden>
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary/60 to-primary transition-[width] duration-700"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  );
}
