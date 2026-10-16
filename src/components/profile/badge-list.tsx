import { Card } from "@/components/ui/card";
import { ShareButton } from "@/components/shared/share-button";
import { formatDate } from "@/lib/format";
import { BadgeIcon } from "./badge-icon";

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
        return (
          <Card
            key={badge.key}
            className={`flex-row items-center gap-3 p-3.5 ${badge.unlocked ? "ring-1 ring-gold/25" : ""}`}
          >
            <BadgeIcon badgeKey={badge.key} unlocked={badge.unlocked} size={56} />
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
