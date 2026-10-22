import type { Metadata } from "next";
import { SubpageHeader } from "@/components/shared/subpage-header";
import { InstallGuide } from "@/components/install/install-guide";

export const metadata: Metadata = { title: "Instalar o app" };

export default function InstalarPage() {
  return (
    <div className="space-y-6">
      <SubpageHeader
        title="Instalar o app"
        subtitle="Coloque o Treinai na tela inicial e abra como um app, sem passar pela loja."
        fallbackHref="/perfil"
      />
      <InstallGuide />
    </div>
  );
}
