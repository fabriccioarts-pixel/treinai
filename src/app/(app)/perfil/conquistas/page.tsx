import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Shield } from "lucide-react";
import { LevelBar } from "@/components/gamification/level-bar";
import { XpIcon } from "@/components/ui/app-icon";
import { buttonVariants } from "@/components/ui/button";
import { BadgeList } from "@/components/profile/badge-list";
import { ShareButton } from "@/components/shared/share-button";
import { auth } from "@/auth";
import { workerApi } from "@/lib/worker-api";
import { Illustration } from "@/components/ui/illustration";

export default async function ConquistasPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  const [{ badges, level, xp, xpIntoLevel, xpForNextLevel }, gamification] = await Promise.all([
    workerApi.getBadges(userId).catch(() => ({
      badges: [],
      level: 1,
      xp: 0,
      xpIntoLevel: 0,
      xpForNextLevel: 100,
    })),
    workerApi.getGamification(userId).catch(() => null),
  ]);

  const unlockedCount = badges.filter((b) => b.unlocked).length;
  // Desbloqueadas primeiro; as secretas ainda fechadas vão para o fim, para instigar
  const ordered = [...badges].sort(
    (a, b) => Number(b.unlocked) - Number(a.unlocked) || Number(!!a.hidden) - Number(!!b.hidden),
  );
  const shields = gamification?.shields;

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
        <Illustration name="achievements" size={48} priority className="-my-2 -mx-1" />
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

      <div className="mb-5 space-y-4 rounded-2xl border border-border bg-card p-4">
        <LevelBar level={level} xpIntoLevel={xpIntoLevel} xpForNextLevel={xpForNextLevel} />
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <XpIcon className="h-3.5 w-3.5 shrink-0 text-primary" />
          {xp} XP no total. Ganhe XP treinando, batendo recordes, cumprindo missões, batendo a meta de água (+15),
          registrando as refeições do dia (+10) e ficando dentro da meta de calorias (+20).
        </p>
        {shields && (
          <div className="flex items-start gap-2 border-t border-border pt-3 text-xs text-muted-foreground">
            <Shield
              className={`mt-px h-3.5 w-3.5 shrink-0 ${shields.available > 0 ? "fill-primary/25 text-primary" : ""}`}
            />
            <span>
              <span className="font-semibold text-foreground">
                {shields.available}/{shields.max} {shields.max === 1 ? "escudo" : "escudos"}
              </span>
              . Você ganha um a cada {shields.every} dias seguidos de treino. Num dia perdido, o escudo segura sua
              constância automaticamente.
              {shields.available < shields.max && ` Próximo em ${shields.nextIn} ${shields.nextIn === 1 ? "dia" : "dias"}.`}
            </span>
          </div>
        )}
      </div>

      <BadgeList badges={ordered} />
    </div>
  );
}
