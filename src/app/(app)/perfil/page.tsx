import {
  Dumbbell,
  SlidersHorizontal,
  Download,
  Info,
  ChevronRight,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
    <div className="space-y-8">
      <PageHeader title="Perfil" />

      <Card className="flex-row items-center gap-4 p-4">
        <ProfileAvatarEditor name={name} hasAvatar={user?.hasAvatar ?? false} />
        <div>
          <p className="font-semibold text-foreground">{name}</p>
          <p className="text-sm text-muted-foreground">{email}</p>
        </div>
      </Card>

      <Card className="divide-y divide-border p-0">
        {SETTINGS_ITEMS.map(({ label, icon: Icon }) => (
          <div
            key={label}
            className="flex items-center gap-3 px-4 py-3.5 text-muted-foreground"
          >
            <Icon className="h-4.5 w-4.5" />
            <span className="flex-1 text-sm font-medium">{label}</span>
            <Badge variant="secondary" className="font-normal">
              Em breve
            </Badge>
            <ChevronRight className="h-4 w-4" />
          </div>
        ))}
      </Card>

      <SignOutButton />
    </div>
  );
}
