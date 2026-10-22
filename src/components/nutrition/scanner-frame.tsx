import { cn } from "@/lib/utils";

const CORNERS = [
  "left-0 top-0 rounded-tl-2xl border-l-[3px] border-t-[3px]",
  "right-0 top-0 rounded-tr-2xl border-r-[3px] border-t-[3px]",
  "bottom-0 left-0 rounded-bl-2xl border-b-[3px] border-l-[3px]",
  "bottom-0 right-0 rounded-br-2xl border-b-[3px] border-r-[3px]",
];

/**
 * Moldura de scanner por cima da câmera ou da foto: cantos em verde neon e uma linha que varre
 * de cima a baixo (parada para quem pediu menos movimento). Ocupa todo o elemento pai, que deve ser relative.
 */
export function ScannerFrame({ scanning = true, className }: { scanning?: boolean; className?: string }) {
  return (
    <div aria-hidden className={cn("pointer-events-none absolute inset-0", className)}>
      {CORNERS.map((corner) => (
        <span
          key={corner}
          className={cn(
            "absolute h-9 w-9 border-primary drop-shadow-[0_0_6px_color-mix(in_oklch,var(--primary),transparent_30%)]",
            corner,
          )}
        />
      ))}
      {scanning && (
        <div className="absolute inset-x-3 top-0 h-full overflow-hidden rounded-xl">
          {/* Rastro em degradê acima da linha, como o feixe de um scanner */}
          <div className="absolute inset-x-0 top-0 h-16 -translate-y-full bg-gradient-to-b from-transparent to-primary/25 motion-safe:animate-[scan-line_2.4s_ease-in-out_infinite] motion-reduce:top-1/2">
            <div className="absolute inset-x-0 bottom-0 h-0.5 bg-primary shadow-[0_0_12px_2px_var(--primary)]" />
          </div>
        </div>
      )}
    </div>
  );
}
