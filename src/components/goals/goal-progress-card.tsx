"use client";

import { useTransition } from "react";
import { CheckCircle2, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { MUSCLE_GROUP_COLOR } from "@/lib/muscle-colors";
import { MUSCLE_GROUP_LABEL } from "@/lib/muscle-groups";
import type { MuscleGroup } from "@/lib/types";
import { deleteGoalAction } from "@/app/actions/goal-actions";

export interface GoalVM {
  id: string;
  exerciseId: string;
  exerciseName: string;
  muscleGroup: string;
  targetWeight: number;
  targetReps: number;
  startingWeight: number;
  currentWeight: number;
  progressPct: number;
  deadline: string | null;
  achievedAt: string | null;
}

function formatKg(n: number) {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

export function GoalProgressCard({ goal }: { goal: GoalVM }) {
  const [pending, startTransition] = useTransition();
  const color = MUSCLE_GROUP_COLOR[goal.muscleGroup as MuscleGroup] ?? "var(--primary)";
  const achieved = Boolean(goal.achievedAt);

  return (
    <Card
      className={`relative gap-2.5 overflow-hidden p-4 ${achieved ? "ring-1 ring-gold/40" : ""}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{MUSCLE_GROUP_LABEL[goal.muscleGroup as MuscleGroup] ?? goal.muscleGroup}</p>
          <p className="truncate font-medium text-foreground">{goal.exerciseName}</p>
        </div>
        {achieved ? (
          <span className="flex shrink-0 items-center gap-1 rounded-full bg-gold/15 px-2 py-0.5 text-[11px] font-semibold text-gold">
            <CheckCircle2 className="h-3 w-3" />
            Batida!
          </span>
        ) : (
          <button
            type="button"
            aria-label="Remover meta"
            disabled={pending}
            onClick={() => startTransition(async () => { await deleteGoalAction(goal.id); })}
            className="shrink-0 text-muted-foreground/60 hover:text-destructive"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="flex items-end justify-between">
        <p className="tabular text-sm text-muted-foreground">
          <span className="text-lg font-bold text-foreground">{formatKg(goal.currentWeight)}</span>
          {" / "}
          {formatKg(goal.targetWeight)} kg
        </p>
        <p className="tabular text-xs font-semibold text-muted-foreground">{goal.progressPct}%</p>
      </div>

      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${goal.progressPct}%`, background: achieved ? "var(--gold)" : color }}
        />
      </div>
    </Card>
  );
}
