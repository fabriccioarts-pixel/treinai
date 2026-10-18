"use client";

import { useOptimistic, useTransition } from "react";
import { Droplet, Undo2 } from "lucide-react";
import { logWaterAction, undoWaterAction } from "@/app/actions/nutrition-actions";
import { formatLiters } from "@/lib/nutrition";
import { Illustration } from "@/components/ui/illustration";
import { cn } from "@/lib/utils";

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
  const done = targetMl > 0 && totalMl >= targetMl;
  const last = optimisticEntries.at(-1);

  function add(amountMl: number) {
    // Toque curto confirma o registro sem precisar olhar para o anel
    if ("vibrate" in navigator) navigator.vibrate(10);
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
      className="relative overflow-hidden rounded-2xl border border-border bg-card p-4 shadow-[inset_0_1px_0_oklch(1_0_0/0.05)]"
    >
      <div className="relative flex items-center gap-4">
        {/* Squeeze no canto direito; com a meta batida ela ganha brilho */}
        <Illustration
          name="water"
          size={96}
          className={cn(
            "pointer-events-none absolute -right-2 top-1/2 -translate-y-1/2 transition-[filter,opacity] duration-500",
            done ? "opacity-100 drop-shadow-[0_0_14px_var(--primary)]" : "opacity-80",
          )}
        />
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
  
        <div className="relative min-w-0 flex-1 pr-16">
          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Água hoje</p>
          <p className="tabular mt-0.5 text-lg font-bold text-foreground">
            {formatLiters(totalMl)}
            <span className="ml-1 text-sm font-medium text-muted-foreground">de {formatLiters(targetMl)}</span>
          </p>
          {done && <p className="text-xs text-primary">Meta batida. Boa!</p>}
        </div>
      </div>

      {/* Linha própria e largura total: botões neutros, com o verde do app só na gota e no toque */}
      <div className="relative mt-4 grid grid-cols-[1fr_1fr_auto] gap-2">
        {QUICK_AMOUNTS.map((ml) => (
          <button
            key={ml}
            type="button"
            onClick={() => add(ml)}
            aria-label={`Registrar ${ml} ml de água`}
            className="tabular flex h-11 items-center justify-center gap-1.5 rounded-xl bg-secondary/60 text-sm font-semibold text-foreground ring-1 ring-border/70 transition-[background-color,box-shadow,transform] ring-inset hover:bg-primary/10 hover:ring-primary/40 active:scale-[0.97]"
          >
            <Droplet className="h-4 w-4 text-primary" fill="currentColor" aria-hidden />+{ml} ml
          </button>
        ))}
        <button
          type="button"
          onClick={undo}
          disabled={!last || pending}
          aria-label="Desfazer último registro de água"
          title="Desfazer"
          className="flex h-11 w-11 items-center justify-center rounded-xl bg-muted text-foreground transition-[background-color,transform] hover:bg-muted/70 active:scale-[0.97] disabled:opacity-35"
        >
          <Undo2 className="h-4 w-4" />
        </button>
      </div>
    </section>
  );
}
