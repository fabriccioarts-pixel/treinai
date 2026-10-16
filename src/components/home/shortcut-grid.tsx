import Link from "next/link";
import { Illustration, type IllustrationName } from "@/components/ui/illustration";

const SHORTCUTS: { href: string; label: string; art: IllustrationName }[] = [
  { href: "/treinos/novo", label: "Novo treino", art: "new-workout" },
  { href: "/theo", label: "Théo", art: "theo" },
  { href: "/progresso/fotos", label: "Fotos", art: "photos" },
  { href: "/progresso#metas", label: "Metas", art: "goals" },
];

/** Atalhos ilustrados, no espírito da grade de serviços da Uber */
export function ShortcutGrid() {
  return (
    <nav aria-label="Atalhos" className="grid grid-cols-4 gap-2">
      {SHORTCUTS.map((s) => (
        <Link
          key={s.href}
          href={s.href}
          className="group flex flex-col items-center gap-1 rounded-xl border border-border bg-card px-1 pt-2 pb-2.5 shadow-[inset_0_1px_0_oklch(1_0_0/0.05)] transition-colors hover:border-primary/40"
        >
          <Illustration
            name={s.art}
            size={60}
            className="transition-transform duration-300 ease-out group-hover:-translate-y-0.5 group-hover:scale-105"
          />
          <span className="text-xs font-semibold text-foreground">{s.label}</span>
        </Link>
      ))}
    </nav>
  );
}
