import type { IconComponent } from "@/components/ui/app-icon";
import type { ReactNode } from "react";

interface EmptyStateProps {
  icon: IconComponent;
  title: string;
  description: string;
  action?: ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex gap-3 rounded-xl border border-dashed border-border px-4 py-4">
      <Icon className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">{description}</p>
        {action && <div className="mt-3 [&>*]:mt-0">{action}</div>}
      </div>
    </div>
  );
}
