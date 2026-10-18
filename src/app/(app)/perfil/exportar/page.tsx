import type { Metadata } from "next";
import { FileJson, FileSpreadsheet } from "lucide-react";
import { SubpageHeader } from "@/components/shared/subpage-header";
import { Card } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";

export const metadata: Metadata = { title: "Exportar dados · Treinai" };

const OPTIONS = [
  {
    href: "/api/exportar?formato=csv",
    icon: FileSpreadsheet,
    title: "Planilha de séries",
    format: "CSV",
    description: "Uma linha por série: data, treino, exercício, carga e repetições. Abre no Excel e no Google Planilhas.",
    cta: "Baixar planilha",
  },
  {
    href: "/api/exportar?formato=json",
    icon: FileJson,
    title: "Todos os dados",
    format: "JSON",
    description: "Treinos, sessões com séries, recordes, metas, conquistas e perfil corporal, num arquivo só.",
    cta: "Baixar arquivo completo",
  },
];

export default function ExportarPage() {
  return (
    <div className="space-y-6">
      <SubpageHeader title="Exportar dados" subtitle="Uma cópia do que você registrou no Treinai" fallbackHref="/perfil" />

      <div className="space-y-3">
        {OPTIONS.map(({ href, icon: Icon, title, format, description, cta }) => (
          <Card key={href} className="gap-4 p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Icon className="h-5 w-5" aria-hidden />
              </div>
              <div className="min-w-0">
                <p className="text-base font-semibold text-foreground">
                  {title} <span className="text-sm font-medium text-muted-foreground">· {format}</span>
                </p>
                <p className="mt-1 text-sm text-muted-foreground">{description}</p>
              </div>
            </div>
            {/* Link normal com download: o navegador baixa sem sair da página */}
            <a href={href} download className={buttonVariants({ variant: "outline", className: "h-11 w-full" })}>
              {cta}
            </a>
          </Card>
        ))}
      </div>

      <div className="space-y-2 px-1 text-sm text-muted-foreground">
        <p>O arquivo é gerado na hora e pode levar alguns segundos se você tem muitos treinos.</p>
        <p>Fotos de treino e o histórico de refeições e água ainda não entram na exportação.</p>
      </div>
    </div>
  );
}
