import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { SubpageHeader } from "@/components/shared/subpage-header";
import { Card } from "@/components/ui/card";
import pkg from "../../../../../package.json";

export const metadata: Metadata = { title: "Sobre o Treinai" };

const SECTIONS = [
  {
    title: "O que é",
    body: [
      "O Treinai registra seus treinos série a série, detecta recordes sozinho e acompanha sua constância, sua alimentação e sua hidratação.",
      "O Théo, seu personal, monta e ajusta treinos e responde dúvidas com base no que você realmente registrou.",
    ],
  },
  {
    title: "Sobre o Théo",
    body: [
      "O Théo é uma inteligência artificial com a personalidade de um treinador. Ele pode errar.",
      "Ele não substitui médico, nutricionista ou educador físico. Com dor, lesão ou condição de saúde, procure um profissional antes de mudar o treino.",
    ],
  },
  {
    title: "Seus dados",
    body: [
      "Treinos, séries, conversas com o Théo e fotos de treino ficam guardados na sua conta, em servidores seguros. As fotos de treino só aparecem para você.",
      "Fotos de refeição são usadas só para estimar os nutrientes e não são guardadas.",
      "Os dados de corpo e saúde (peso, altura, rotina) só são salvos com o seu consentimento e podem ser apagados a qualquer momento em Corpo e plano.",
    ],
  },
  {
    title: "Créditos",
    body: [
      "Vídeos de demonstração criados a partir das fotos do free-exercise-db, de domínio público.",
    ],
  },
];

const LINKS = [
  { href: "/perfil/exportar", label: "Exportar meus dados" },
  { href: "/perfil/plano", label: "Corpo e plano" },
];

export default function SobrePage() {
  return (
    <div className="space-y-6">
      <SubpageHeader title="Sobre o Treinai" fallbackHref="/perfil" />

      <div className="flex flex-col items-center py-2 text-center">
        <Image src="/logo-icon.png" alt="" width={64} height={64} className="h-16 w-16 rounded-2xl" />
        <p className="mt-3 text-lg font-bold tracking-tight text-foreground">Treinai</p>
        <p className="tabular text-sm text-muted-foreground">Versão {pkg.version}</p>
      </div>

      {SECTIONS.map((s) => (
        <section key={s.title}>
          <h2 className="mb-2 px-1 text-sm font-semibold text-muted-foreground">{s.title}</h2>
          <Card className="gap-3 p-4">
            {s.body.map((p) => (
              <p key={p} className="text-sm leading-relaxed text-foreground">
                {p}
              </p>
            ))}
          </Card>
        </section>
      ))}

      <Card className="divide-y divide-border/50 p-0">
        {LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="group flex items-center justify-between px-4 py-3.5 text-sm font-medium text-foreground transition-colors hover:bg-muted/30"
          >
            {l.label}
            <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden />
          </Link>
        ))}
      </Card>
    </div>
  );
}
