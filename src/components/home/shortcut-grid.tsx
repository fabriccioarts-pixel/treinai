import Link from "next/link";
import { Illustration, type IllustrationName } from "@/components/ui/illustration";

const SHORTCUTS: { href: string; label: string; art: IllustrationName }[] = [
  { href: "/treinos/novo", label: "Novo treino", art: "new-workout" },
  // O Théo já tem aba própria na navegação; aqui entra um destino sem atalho
  { href: "/progresso/prs", label: "Recordes", art: "pr" },
  { href: "/progresso/fotos", label: "Fotos", art: "photos" },
  { href: "/progresso#metas", label: "Metas", art: "goals" },
];

/** Atalhos ilustrados em círculos, no estilo dos stories: anel em degradê verde e o nome embaixo */
export function ShortcutGrid() {
  return (
    <nav aria-label="Atalhos" data-tour="atalhos" className="grid grid-cols-4 gap-2">
      {SHORTCUTS.map((s) => (
        <Link key={s.href} href={s.href} className="group flex flex-col items-center gap-1.5 rounded-2xl py-1 outline-none">
          {/* Anel: o degradê fica no fundo e o círculo escuro por cima deixa só a borda à mostra */}
          <span className="rounded-full bg-gradient-to-tr from-primary via-primary/70 to-gold p-[2.5px] shadow-[0_0_18px_-6px_var(--primary)] transition-transform duration-300 ease-out group-hover:scale-105 group-focus-visible:ring-3 group-focus-visible:ring-ring/50">
            <span className="flex h-[68px] w-[68px] items-center justify-center rounded-full border-[3px] border-background bg-card">
              <Illustration name={s.art} size={52} />
            </span>
          </span>
          <span className="text-xs font-semibold text-foreground">{s.label}</span>
        </Link>
      ))}
    </nav>
  );
}
