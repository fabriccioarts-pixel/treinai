"use client";

import { useOptimistic, useState, useTransition } from "react";
import { Camera, PencilLine, Trash2 } from "lucide-react";
import { deleteMealAction } from "@/app/actions/nutrition-actions";
import { MEAL_TYPE_LABEL, formatKcal, type MealsToday } from "@/lib/nutrition";

export function MealList({ meals }: { meals: MealsToday["meals"] }) {
  const [, startTransition] = useTransition();
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [visibleMeals, removeMeal] = useOptimistic(meals, (current, id: string) => current.filter((m) => m.id !== id));

  if (visibleMeals.length === 0) return null;

  return (
    <ul className="divide-y divide-border/60">
      {visibleMeals.map((meal) => {
        const SourceIcon = meal.source === "foto" ? Camera : PencilLine;
        const confirming = confirmingId === meal.id;
        return (
          <li key={meal.id} className="flex items-center gap-3 py-2.5">
            <SourceIcon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground">
                {MEAL_TYPE_LABEL[meal.mealType]}
                <span className="tabular ml-1.5 font-normal text-muted-foreground">{formatKcal(Math.round(meal.kcal))} kcal</span>
              </p>
              <p className="truncate text-xs text-muted-foreground">{meal.items.map((i) => i.name).join(", ")}</p>
            </div>
            {confirming ? (
              <button
                type="button"
                onClick={() =>
                  startTransition(async () => {
                    removeMeal(meal.id);
                    setConfirmingId(null);
                    await deleteMealAction(meal.id);
                  })
                }
                className="shrink-0 rounded-full bg-destructive/10 px-3 py-1.5 text-xs font-semibold text-destructive"
              >
                Apagar
              </button>
            ) : (
              <button
                type="button"
                aria-label={`Apagar ${MEAL_TYPE_LABEL[meal.mealType]}`}
                onClick={() => setConfirmingId(meal.id)}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground/60 hover:bg-muted/40 hover:text-foreground"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}
