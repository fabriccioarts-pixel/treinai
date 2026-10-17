"use client";

import { useEffect, useRef, useState, type ReactNode, type Ref } from "react";
import { MotionConfig } from "framer-motion";
import { cn } from "@/lib/utils";

/*
 * Base das simulações em celular da landing page: moldura, detecção de visibilidade e loop
 * de roteiro. As simulações rodam sempre (inclusive com "reduzir movimento"): são só aparições
 * suaves, sem piscar nem girar. O estado inicial de cada uma deve ser a cena final completa,
 * igual no servidor e no navegador, para não haver hydration mismatch.
 */

export type Sleep = (ms: number) => Promise<void>;

export const EASE_OUT = [0.16, 1, 0.3, 1] as const;

/** Visível quando ao menos `threshold` da altura está na tela (checagem direta de posição) */
export function useVisible(ref: React.RefObject<HTMLElement | null>, threshold = 0.3) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const check = () => {
      const r = ref.current?.getBoundingClientRect();
      if (!r || r.height === 0) return;
      const shown = Math.min(r.bottom, window.innerHeight) - Math.max(r.top, 0);
      setVisible(shown > r.height * threshold);
    };
    check();
    const id = window.setInterval(check, 400);
    return () => window.clearInterval(id);
  }, [ref, threshold]);
  return visible;
}

/** Repete o roteiro enquanto `active`; ao sair da tela o loop é cancelado e recomeça ao voltar */
export function useScenario(active: boolean, run: (sleep: Sleep) => Promise<void>) {
  const runRef = useRef(run);
  useEffect(() => {
    runRef.current = run;
  });
  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    const sleep: Sleep = (ms) =>
      new Promise((resolve, reject) =>
        setTimeout(() => (cancelled ? reject(new Error("cancelled")) : resolve()), ms),
      );
    (async () => {
      while (!cancelled) await runRef.current(sleep);
    })().catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [active]);
}

export function PhoneFrame({
  children,
  className,
  ref,
}: {
  children: ReactNode;
  className?: string;
  ref?: Ref<HTMLDivElement>;
}) {
  return (
    <MotionConfig reducedMotion="never">
      <div ref={ref} className={cn("mx-auto w-full max-w-[22rem]", className)}>
        <div className="overflow-hidden rounded-[2.25rem] border border-border bg-background p-2 shadow-[0_40px_80px_-40px_rgb(0_0_0/0.9),inset_0_1px_0_oklch(1_0_0/0.06)]">
          <div className="flex h-[33.5rem] flex-col overflow-hidden rounded-[1.8rem] border border-border/60 bg-background">
            {children}
          </div>
        </div>
      </div>
    </MotionConfig>
  );
}
