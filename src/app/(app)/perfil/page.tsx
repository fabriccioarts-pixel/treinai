import {
  Dumbbell,
  SlidersHorizontal,
  Download,
  Info,
  ChevronRight,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { ProfileAvatarEditor } from "@/components/profile/profile-avatar-editor";
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
  const { user } = session?.user?.id
    ? await workerApi.getUser(session.user.id).catch(() => ({ user: null }))
    : { user: null };

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
              <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary tracking-wide shrink-0">
                Atleta
              </span>
            </div>
            <p className="text-xs text-muted-foreground truncate mt-0.5">{email}</p>
          </div>
        </div>
      </div>

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
