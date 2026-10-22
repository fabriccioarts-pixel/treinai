import type { PointerEvent } from "react";

/** Passa a posição do mouse para o elemento .spotlight sob ele; a luz em si é o ::before em globals.css */
export function trackSpotlight(e: PointerEvent) {
  if (e.pointerType !== "mouse") return;
  const el = (e.target as HTMLElement).closest<HTMLElement>(".spotlight");
  if (!el) return;
  const r = el.getBoundingClientRect();
  el.style.setProperty("--mx", `${e.clientX - r.left}px`);
  el.style.setProperty("--my", `${e.clientY - r.top}px`);
}
