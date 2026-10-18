import type { ReactNode } from "react";
import { BackButton } from "@/components/shared/back-button";

/** Cabeçalho das telas internas: voltar no canto esquerdo, título e uma linha de contexto */
export function SubpageHeader({
  title,
  subtitle,
  fallbackHref,
  children,
}: {
  title: string;
  subtitle?: string;
  /** Para onde o voltar leva quando não há tela anterior do app (link direto) */
  fallbackHref: string;
  children?: ReactNode;
}) {
  return (
    <header className="flex items-center gap-2">
      <BackButton fallbackHref={fallbackHref} className="-ml-2" />
      <div className="min-w-0 flex-1">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {children}
    </header>
  );
}
