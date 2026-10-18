import { Card } from "@/components/ui/card";
import { ShareButton } from "@/components/shared/share-button";
import { formatDate } from "@/lib/format";
import { isBadgeTier, TIER_COLOR, TIER_LABEL, type BadgeTier } from "@/lib/gamification";
import { BadgeIcon } from "./badge-icon";

export interface BadgeVM {
  key: string;
  label: string;
  description: string;
  icon: string;
  tier?: BadgeTier;
  /** Secreta: nome e descrição ficam escondidos até desbloquear */
  hidden?: boolean;
  unlocked: boolean;
  achievedAt: string | null;
}

export function BadgeList({ badges }: { badges: BadgeVM[] }) {
  return (
    <div className="space-y-2">
      {badges.map((badge) => {
        const secret = badge.hidden && !badge.unlocked;
        return (
          <Card
            key={badge.key}
            className={`flex-row items-center gap-3 p-3.5 ${badge.unlocked ? "ring-1 ring-gold/25" : ""}`}
          >
            <BadgeIcon
              badgeKey={secret ? "secreta" : badge.key}
              icon={secret ? undefined : badge.icon}
              tier={badge.tier}
              unlocked={badge.unlocked}
              size={56}
            />
            <div className="min-w-0 flex-1">
              <p className={`flex items-center gap-2 text-sm font-semibold ${badge.unlocked ? "text-foreground" : "text-muted-foreground"}`}>
                {secret ? "Conquista secreta" : badge.label}
                {isBadgeTier(badge.tier) && !secret && (
                  <span
                    className="rounded-full px-1.5 py-px text-[10px] font-semibold tracking-wide uppercase"
                    style={{
                      color: TIER_COLOR[badge.tier],
                      background: `color-mix(in oklch, ${TIER_COLOR[badge.tier]} 14%, transparent)`,
                    }}
                  >
                    {TIER_LABEL[badge.tier]}
                  </span>
                )}
              </p>
              <p className="text-xs text-muted-foreground">
                {secret ? "??? Continue treinando para descobrir." : badge.description}
              </p>
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
