import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { BadgeIcon } from "./badge-icon";

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
        <div className="flex -space-x-1.5">
          {preview.map((badge) => (
            <BadgeIcon
              key={badge.key}
              badgeKey={badge.key}
              unlocked={badge.unlocked}
              size={34}
              showLock={false}
            />
          ))}
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
