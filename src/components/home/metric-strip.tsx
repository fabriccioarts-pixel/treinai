interface Metric {
  label: string;
  value: string;
  unit?: string;
  /** Cor de identificação da métrica (cada métrica tem a sua, sempre a mesma) */
  color: string;
}

export function MetricStrip({ metrics }: { metrics: Metric[] }) {
  return (
    <div className="grid grid-cols-3 divide-x divide-border rounded-2xl border border-border bg-card shadow-[inset_0_1px_0_oklch(1_0_0/0.05)]">
      {metrics.map((m) => (
        <div key={m.label} className="min-w-0 px-4 py-3.5">
          <p className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: m.color }} />
            <span className="truncate">{m.label}</span>
          </p>
          <p className="mt-1 flex items-baseline gap-1">
            <span className="tabular text-2xl font-bold tracking-tight text-foreground">{m.value}</span>
            {m.unit && <span className="text-xs text-muted-foreground">{m.unit}</span>}
          </p>
        </div>
      ))}
    </div>
  );
}
