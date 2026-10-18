import type { Metadata } from "next";
import { SubpageHeader } from "@/components/shared/subpage-header";
import { PreferencesForm } from "@/components/profile/preferences-form";

export const metadata: Metadata = { title: "Preferências · Treinai" };

export default function PreferenciasPage() {
  return (
    <div className="space-y-6">
      <SubpageHeader title="Preferências" subtitle="Como o app se comporta no seu treino" fallbackHref="/perfil" />
      <PreferencesForm />
    </div>
  );
}
