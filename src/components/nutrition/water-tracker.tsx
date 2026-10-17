"use client";

import { useOptimistic, useTransition } from "react";
import { Undo2 } from "lucide-react";
import { logWaterAction, undoWaterAction } from "@/app/actions/nutrition-actions";
import { formatLiters } from "@/lib/nutrition";

interface WaterEntry {
  id: string;
  amountMl: number;
}

const QUICK_AMOUNTS = [250, 500];
const RING_RADIUS = 30;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;

type Change = { type: "add"; amountMl: number } | { type: "remove"; id: string };

export function WaterTracker({ entries, targetMl }: { entries: WaterEntry[]; targetMl: number }) {
  const [pending, startTransition] = useTransition();
  const [optimisticEntries, applyChange] = useOptimistic(entries, (current, change: Change) =>
    change.type === "add"
      ? [...current, { id: `pending-${current.length}`, amountMl: change.amountMl }]
      : current.filter((e) => e.id !== change.id),
  );

  const totalMl = optimisticEntries.reduce((sum, e) => sum + e.amountMl, 0);
  const progress = Math.min(1, targetMl > 0 ? totalMl / targetMl : 0);
  const done = totalMl >= targetMl;
  const last = optimisticEntries.at(-1);

  function add(amountMl: number) {
    startTransition(async () => {
      applyChange({ type: "add", amountMl });
      await logWaterAction(amountMl);
    });
  }

  function undo() {
    if (!last || last.id.startsWith("pending-")) return;
    startTransition(async () => {
      applyChange({ type: "remove", id: last.id });
      await undoWaterAction(last.id);
    });
  }

  return (
    <section
      aria-label="Água de hoje"
      className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4 shadow-[inset_0_1px_0_oklch(1_0_0/0.05)]"
    >
      <div className="relative h-[72px] w-[72px] shrink-0">
        <svg viewBox="0 0 72 72" className="h-full w-full -rotate-90" aria-hidden>
          <circle cx="36" cy="36" r={RING_RADIUS} fill="none" strokeWidth="7" className="stroke-muted" />
          <circle
            cx="36"
            cy="36"
            r={RING_RADIUS}
            fill="none"
            strokeWidth="7"
            strokeLinecap="round"
            stroke="var(--chart-4)"
            strokeDasharray={RING_LENGTH}
            strokeDashoffset={RING_LENGTH * (1 - progress)}
            className="transition-[stroke-dashoffset] duration-500"
          />
        </svg>
        <span className="tabular absolute inset-0 flex items-center justify-center text-xs font-bold text-foreground">
          {Math.round(progress * 100)}%
        </span>
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Água hoje</p>
        <p className="tabular mt-0.5 text-lg font-bold text-foreground">
          {formatLiters(totalMl)}
          <span className="ml-1 text-sm font-medium text-muted-foreground">de {formatLiters(targetMl)}</span>
        </p>
        {done && <p className="text-xs text-primary">Meta batida. Boa!</p>}

        <div className="mt-2 flex items-center gap-2">
          {QUICK_AMOUNTS.map((ml) => (
            <button
              key={ml}
              type="button"
              onClick={() => add(ml)}
              className="tabular rounded-full border border-border/60 bg-secondary/50 px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:border-primary/40 hover:bg-primary/10 active:scale-95"
            >
              +{ml} ml
            </button>
          ))}
          <button
            type="button"
            onClick={undo}
            disabled={!last || pending}
            aria-label="Desfazer último registro de água"
            className="ml-auto flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground disabled:opacity-30"
          >
            <Undo2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </section>
  );
}
