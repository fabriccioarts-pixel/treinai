import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Illustration, type IllustrationName } from "@/components/ui/illustration";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  /** Ilustração 3D exibida à esquerda, colada ao título */
  illustration?: IllustrationName;
  /** Linha extra abaixo do cabeçalho, na largura toda (ex.: frase do dia na home) */
  note?: ReactNode;
  className?: string;
  titleClassName?: string;
  /** Mantido por compatibilidade: o título é sempre sólido */
  plainTitle?: boolean;
}

export function PageHeader({ title, subtitle, action, illustration, note, className, titleClassName }: PageHeaderProps) {
  return (
    <header className={cn("mb-6 animate-in fade-in slide-in-from-bottom-2 duration-500", className)}>
      <div className="flex items-center justify-between gap-4">
      <div className="flex min-w-0 items-center gap-3">
        {illustration && <Illustration name={illustration} size={56} priority className="-my-2 -ml-2 shrink-0" />}
        <div className="min-w-0">
          <h1 className={cn("text-2xl font-bold tracking-tight text-foreground", titleClassName)}>{title}</h1>
          {subtitle && <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>}
        </div>
      </div>
      {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
      </div>
      {note}
    </header>
  );
}
