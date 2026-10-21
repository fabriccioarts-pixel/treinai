"use client";

import { useEffect, useState } from "react";
import { useReducedMotion } from "framer-motion";

/** Sobe de 0 até `to` desacelerando no fim; com "reduzir movimento", já mostra o valor final */
export function useCountUp(to: number, duration = 1100): number {
  const reduceMotion = useReducedMotion();
  const [value, setValue] = useState(reduceMotion ? to : 0);
  useEffect(() => {
    if (reduceMotion) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sem animação, o valor final vem direto
      setValue(to);
      return;
    }
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      setValue(to * (1 - Math.pow(1 - t, 3)));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [to, duration, reduceMotion]);
  return value;
}

export function CountUp({ to, decimals = 0, prefix = "", suffix = "" }: { to: number; decimals?: number; prefix?: string; suffix?: string }) {
  const value = useCountUp(to);
  const text = value.toLocaleString("pt-BR", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  return (
    <span className="tabular" aria-label={`${prefix}${to.toLocaleString("pt-BR", { maximumFractionDigits: decimals })}${suffix}`}>
      {prefix}
      {text}
      {suffix}
    </span>
  );
}
