import { Flag, Trophy, Flame, Medal, Star, Dumbbell, Target, type LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";

const ICONS: Record<string, LucideIcon> = { Flag, Trophy, Flame, Medal, Star, Dumbbell, Target };

export interface BadgeVM {
  key: string;
  label: string;
  description: string;
  icon: string;
  unlocked: boolean;
}

export function BadgeGrid({ badges }: { badges: BadgeVM[] }) {
  return (
    <div className="grid grid-cols-4 gap-2.5">
      {badges.map((badge) => {
        const Icon = ICONS[badge.icon] ?? Trophy;
        return (
          <Card
            key={badge.key}
            title={`${badge.label} — ${badge.description}`}
            className={`items-center gap-1.5 p-3 text-center ${
              badge.unlocked ? "ring-1 ring-gold/30" : "opacity-40"
            }`}
          >
            <div
              className={`flex h-9 w-9 items-center justify-center rounded-full ${
                badge.unlocked ? "bg-gold/15 text-gold" : "bg-muted text-muted-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
            </div>
            <p className="line-clamp-2 text-[10px] font-medium leading-tight text-foreground">
              {badge.label}
            </p>
          </Card>
        );
      })}
    </div>
  );
}
