import Link from "next/link";
import { ArrowLeft, Zap } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { BadgeList } from "@/components/profile/badge-list";
import { ShareButton } from "@/components/shared/share-button";
import { auth } from "@/auth";
import { workerApi } from "@/lib/worker-api";

export default async function ConquistasPage() {
  const session = await auth();
  const userId = session!.user.id;

  const { badges, level, xp } = await workerApi.getBadges(userId).catch(() => ({
    badges: [],
    level: 1,
    xp: 0,
  }));

  const unlockedCount = badges.filter((b) => b.unlocked).length;

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <Link
          href="/perfil"
          aria-label="Voltar"
          className={buttonVariants({ variant: "ghost", size: "icon" })}
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Conquistas</h1>
          <p className="text-sm text-muted-foreground">
            {unlockedCount} de {badges.length} desbloqueadas · Nível {level}
          </p>
        </div>
        <ShareButton
          iconOnly
          title="Minhas conquistas no Treinai"
          text={`💪 Já desbloqueei ${unlockedCount} de ${badges.length} conquistas e estou no nível ${level} no Treinai! (${xp} XP)`}
          className="rounded-full border border-border/60 p-2.5"
        />
      </div>

      <div className="mb-5 flex items-center gap-2 rounded-2xl bg-primary/10 px-4 py-3 text-sm text-primary">
        <Zap className="h-4 w-4 shrink-0" />
        <span>{xp} XP acumulados no total</span>
      </div>

      <BadgeList badges={badges} />
    </div>
  );
}
