import { PrIcon } from "@/components/ui/app-icon";

interface PrRow {
  id: string;
  exerciseName: string;
  weight: number;
  reps: number;
  date: string;
}

export function RecentPrs({ prs }: { prs: PrRow[] }) {
  return (
    <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
      {prs.map((pr) => (
        <li key={pr.id} className="flex items-center gap-3 px-4 py-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gold/12 text-gold">
            <PrIcon className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">{pr.exerciseName}</p>
            <p className="tabular text-xs text-muted-foreground">
              <span className="font-semibold text-gold">{pr.weight} kg</span> × {pr.reps} reps
            </p>
          </div>
          <span className="tabular shrink-0 text-xs text-muted-foreground">{pr.date}</span>
        </li>
      ))}
    </ul>
  );
}
