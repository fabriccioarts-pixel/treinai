import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  className?: string;
  titleClassName?: string;
  plainTitle?: boolean;
}

export function PageHeader({
  title,
  subtitle,
  action,
  className,
  titleClassName,
  plainTitle = false,
}: PageHeaderProps) {
  return (
    <header
      className={cn(
        "mb-6 flex items-start justify-between gap-4 animate-in fade-in slide-in-from-bottom-2 duration-500",
        className
      )}
    >
      <div>
        <h1
          className={cn(
            plainTitle
              ? "text-2xl font-bold tracking-tight text-foreground"
              : "gradient-text text-2xl font-bold tracking-tight",
            titleClassName
          )}
        >
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>
        )}
      </div>
      {action}
    </header>
  );
}
