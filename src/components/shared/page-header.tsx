import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Illustration, type IllustrationName } from "@/components/ui/illustration";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  /** Ilustração 3D exibida à direita do título */
  illustration?: IllustrationName;
  className?: string;
  titleClassName?: string;
  /** Mantido por compatibilidade: o título é sempre sólido */
  plainTitle?: boolean;
}

export function PageHeader({ title, subtitle, action, illustration, className, titleClassName }: PageHeaderProps) {
  return (
    <header
      className={cn(
        "mb-6 flex items-center justify-between gap-4 animate-in fade-in slide-in-from-bottom-2 duration-500",
        className
      )}
    >
      <div className="min-w-0">
        <h1 className={cn("text-2xl font-bold tracking-tight text-foreground", titleClassName)}>{title}</h1>
        {subtitle && <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {(illustration || action) && (
        <div className="flex shrink-0 items-center gap-2">
          {illustration && <Illustration name={illustration} size={84} priority className="-my-4" />}
          {action}
        </div>
      )}
    </header>
  );
}
