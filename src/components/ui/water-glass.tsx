"use client";

import { useId } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

/*
 * Copo de água desenhado em SVG: trapézio de cantos arredondados (boca mais larga que o fundo).
 * Vazio: cinza discreto. Cheio: água azul que sobe ao encher e ondula sem parar (onda azul na frente,
 * branca atrás, em sentidos opostos). Com "reduzir movimento", a água aparece parada.
 */

// viewBox 40×48: boca de 3 a 37 no topo, fundo de 7 a 33
const GLASS =
  "M4.5 2h31a1.6 1.6 0 0 1 1.6 1.8l-3.6 40.6a1.8 1.8 0 0 1-1.8 1.6H8.3a1.8 1.8 0 0 1-1.8-1.6L2.9 3.8A1.6 1.6 0 0 1 4.5 2Z";

/** Período da onda (crista + vale), em unidades do viewBox */
const PERIOD = 22;

/** Superfície ondulada em `y`, larga o bastante para deslizar um período inteiro sem mostrar a ponta */
function wavePath(y: number, amplitude: number): string {
  let d = `M${-PERIOD * 2} ${y}`;
  for (let x = -PERIOD * 2; x < 40 + PERIOD * 2; x += PERIOD / 2) {
    d += ` q${PERIOD / 4} ${x % PERIOD === 0 ? -amplitude : amplitude} ${PERIOD / 2} 0`;
  }
  return `${d} V52 H${-PERIOD * 2} Z`;
}

const FRONT = wavePath(11, 2.4);
const BACK = wavePath(9.5, 2);

export function WaterGlass({ full, delay = 0, className }: { full: boolean; delay?: number; className?: string }) {
  const clipId = useId();
  const reduceMotion = useReducedMotion();
  // Onda contínua em CSS (globals.css): roda sempre, mesmo quando o quiz desliga as animações de entrada
  const wave = (name: string, duration: number) =>
    full ? { animation: `${name} ${duration}s linear ${-delay}s infinite` } : undefined;

  return (
    <svg viewBox="0 0 40 48" className={cn("h-14 w-auto overflow-visible", className)} aria-hidden>
      <defs>
        <clipPath id={clipId}>
          <path d={GLASS} />
        </clipPath>
      </defs>
      {/* Corpo do copo */}
      <path d={GLASS} className={cn("transition-colors duration-300", full ? "fill-sky-950/60" : "fill-muted/70")} />
      {/* Água: sobe de baixo para cima ao encher; dentro, as ondas deslizam */}
      <g clipPath={`url(#${clipId})`}>
        <motion.g
          initial={false}
          animate={{ y: full ? 0 : 40, opacity: full ? 1 : 0 }}
          transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 220, damping: 24 }}
        >
          <path d={BACK} className="water-wave fill-white/80" style={wave("water-wave-back", 3.2)} />
          <path d={FRONT} className="water-wave fill-sky-400" style={wave("water-wave", 2.2)} />
        </motion.g>
      </g>
      {/* Contorno: claro quando cheio, quase invisível quando vazio */}
      <path
        d={GLASS}
        fill="none"
        strokeWidth={1.6}
        strokeLinejoin="round"
        className={cn("transition-colors duration-300", full ? "stroke-sky-300" : "stroke-foreground/10")}
      />
    </svg>
  );
}
