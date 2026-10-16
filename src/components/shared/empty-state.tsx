import {
  WorkoutIcon,
  ProgressIcon,
  TrendIcon,
  PrIcon,
  PhotoIcon,
  GoalIcon,
  type IconComponent,
} from "@/components/ui/app-icon";
import { Illustration, type IllustrationName } from "@/components/ui/illustration";
import type { ReactNode } from "react";

interface EmptyStateProps {
  icon: IconComponent;
  /** Ilustração 3D; se omitida, é escolhida a partir do ícone quando houver uma equivalente */
  illustration?: IllustrationName;
  title: string;
  description: string;
  action?: ReactNode;
}

const ILLUSTRATION_BY_ICON = new Map<IconComponent, IllustrationName>([
  [WorkoutIcon, "workouts"],
  [ProgressIcon, "progress"],
  [TrendIcon, "progress"],
  [PrIcon, "pr"],
  [PhotoIcon, "photos"],
  [GoalIcon, "goals"],
]);

export function EmptyState({ icon: Icon, illustration, title, description, action }: EmptyStateProps) {
  const art = illustration ?? ILLUSTRATION_BY_ICON.get(Icon);

  return (
    <div className="flex items-center gap-4 rounded-xl border border-dashed border-border px-4 py-4">
      {art ? (
        <Illustration name={art} size={72} className="-my-2 -ml-1" />
      ) : (
        <Icon className="h-5 w-5 shrink-0 self-start text-muted-foreground" />
      )}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">{description}</p>
        {action && <div className="mt-3 [&>*]:mt-0">{action}</div>}
      </div>
    </div>
  );
}
