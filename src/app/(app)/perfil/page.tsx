import {
  Dumbbell,
  SlidersHorizontal,
  Download,
  Info,
  ChevronRight,
  Zap,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { ProfileAvatarEditor } from "@/components/profile/profile-avatar-editor";
import { BadgeSummary } from "@/components/profile/badge-summary";
import { auth } from "@/auth";
import { workerApi } from "@/lib/worker-api";

const SETTINGS_ITEMS = [
  { label: "Biblioteca de exercícios", icon: Dumbbell },
  { label: "Preferências", icon: SlidersHorizontal },
  { label: "Exportar dados", icon: Download },
  { label: "Sobre o Treinai", icon: Info },
];

export default async function PerfilPage() {
  const session = await auth();
  const name = session?.user?.name ?? "Usuário";
  const email = session?.user?.email ?? "";
  const userId = session?.user?.id;

  const [{ user }, badgesResult] = await Promise.all([
    userId ? workerApi.getUser(userId).catch(() => ({ user: null })) : Promise.resolve({ user: null }),
    userId
      ? workerApi.getBadges(userId).catch(() => ({ badges: [], xp: 0, level: 1, xpIntoLevel: 0, xpForNextLevel: 100 }))
      : Promise.resolve({ badges: [], xp: 0, level: 1, xpIntoLevel: 0, xpForNextLevel: 100 }),
  ]);

  const levelProgressPct = Math.min(
    100,
    Math.round((badgesResult.xpIntoLevel / badgesResult.xpForNextLevel) * 100)
  );

  return (
    <div className="space-y-6">
      <PageHeader title="Perfil" plainTitle />

      {/* User profile card */}
      <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-card/60 p-5 backdrop-blur-xl shadow-xs transition-all">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/25 to-transparent" />
        <div className="flex items-center gap-4">
          <ProfileAvatarEditor name={name} hasAvatar={user?.hasAvatar ?? false} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="font-semibold text-foreground tracking-tight text-base truncate">
                {name}
              </p>
              <span className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary tracking-wide shrink-0">
                <Zap className="h-2.5 w-2.5" />
                Nível {badgesResult.level}
              </span>
            </div>
            <p className="text-xs text-muted-foreground truncate mt-0.5">{email}</p>
          </div>
        </div>

        <div className="mt-4 space-y-1">
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${levelProgressPct}%` }}
            />
          </div>
          <p className="tabular text-[11px] text-muted-foreground">
            {badgesResult.xpIntoLevel} / {badgesResult.xpForNextLevel} XP para o nível {badgesResult.level + 1}
          </p>
        </div>
      </div>

      <BadgeSummary badges={badgesResult.badges} />

      {/* Menu / Settings List */}
      <div className="overflow-hidden rounded-2xl border border-border/60 bg-card/60 backdrop-blur-xl shadow-xs divide-y divide-border/40">
        {SETTINGS_ITEMS.map(({ label, icon: Icon }) => (
          <div
            key={label}
            className="group flex items-center gap-3.5 px-4 py-3.5 text-muted-foreground transition-colors hover:bg-secondary/30 hover:text-foreground"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border/50 bg-secondary/50 text-muted-foreground transition-colors group-hover:border-primary/30 group-hover:bg-primary/10 group-hover:text-primary">
              <Icon className="h-4 w-4" />
            </div>
            <span className="flex-1 text-sm font-medium text-foreground/90">
              {label}
            </span>
            <span className="rounded-full border border-border/50 bg-secondary/60 px-2.5 py-0.5 text-[10px] font-medium tracking-wide text-muted-foreground">
              Em breve
            </span>
            <ChevronRight className="h-4 w-4 text-muted-foreground/40 transition-transform group-hover:translate-x-0.5 group-hover:text-muted-foreground" />
          </div>
        ))}
      </div>

      {/* Sign Out Button */}
      <div className="pt-2">
        <SignOutButton />
      </div>
    </div>
  );
}
