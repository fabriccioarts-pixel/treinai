import Link from "next/link";
import { Flag, Trophy, Flame, Medal, Star, Dumbbell, Target, ChevronRight, type LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";

const ICONS: Record<string, LucideIcon> = { Flag, Trophy, Flame, Medal, Star, Dumbbell, Target };

interface BadgeVM {
  key: string;
  label: string;
  icon: string;
  unlocked: boolean;
}

export function BadgeSummary({ badges }: { badges: BadgeVM[] }) {
  const unlocked = badges.filter((b) => b.unlocked);
  const preview = badges.slice(0, 5);

  return (
    <Link href="/perfil/conquistas">
      <Card className="flex-row items-center gap-3 p-4 transition-colors hover:bg-muted/30">
        <div className="flex -space-x-2">
          {preview.map((badge) => {
            const Icon = ICONS[badge.icon] ?? Trophy;
            return (
              <div
                key={badge.key}
                className={`flex h-8 w-8 items-center justify-center rounded-full ring-2 ring-card ${
                  badge.unlocked ? "bg-gold/20 text-gold" : "bg-muted text-muted-foreground/40"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
              </div>
            );
          })}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">Conquistas</p>
          <p className="text-xs text-muted-foreground">
            {unlocked.length} de {badges.length} desbloqueadas
          </p>
        </div>
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
      </Card>
    </Link>
  );
}
