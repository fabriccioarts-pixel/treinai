import { Flag, Trophy, Flame, Medal, Star, Dumbbell, Target, Lock, type LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { ShareButton } from "@/components/shared/share-button";
import { formatDate } from "@/lib/format";

const ICONS: Record<string, LucideIcon> = { Flag, Trophy, Flame, Medal, Star, Dumbbell, Target };

export interface BadgeVM {
  key: string;
  label: string;
  description: string;
  icon: string;
  unlocked: boolean;
  achievedAt: string | null;
}

export function BadgeList({ badges }: { badges: BadgeVM[] }) {
  return (
    <div className="space-y-2">
      {badges.map((badge) => {
        const Icon = ICONS[badge.icon] ?? Trophy;
        return (
          <Card
            key={badge.key}
            className={`flex-row items-center gap-3 p-3.5 ${badge.unlocked ? "ring-1 ring-gold/25" : ""}`}
          >
            <div
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${
                badge.unlocked ? "bg-gold/15 text-gold" : "bg-muted text-muted-foreground/50"
              }`}
            >
              {badge.unlocked ? <Icon className="h-5 w-5" /> : <Lock className="h-4 w-4" />}
            </div>
            <div className="min-w-0 flex-1">
              <p className={`text-sm font-semibold ${badge.unlocked ? "text-foreground" : "text-muted-foreground"}`}>
                {badge.label}
              </p>
              <p className="text-xs text-muted-foreground">{badge.description}</p>
              {badge.unlocked && badge.achievedAt && (
                <p className="tabular mt-0.5 text-[11px] text-gold/80">
                  Desbloqueada em {formatDate(badge.achievedAt.slice(0, 10))}
                </p>
              )}
            </div>
            {badge.unlocked && (
              <ShareButton
                iconOnly
                title="Conquista no Treinai"
                text={`🏆 Desbloqueei a conquista "${badge.label}" no Treinai — ${badge.description}`}
                className="shrink-0 p-2"
              />
            )}
          </Card>
        );
      })}
    </div>
  );
}
