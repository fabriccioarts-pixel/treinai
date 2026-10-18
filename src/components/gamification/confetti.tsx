"use client";

import { useEffect, useRef } from "react";

const COLORS = ["#5BE36B", "#F5C542", "#FFFFFF", "#8FF59A", "#E8B730"];
const PIECES = 90;
const DURATION_MS = 2600;

interface Piece {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  rotation: number;
  spin: number;
  color: string;
}

/**
 * Chuva de confete em canvas, sem dependências. Dispara toda vez que `fireKey` muda
 * (e na montagem, se `fireKey` já vier preenchido). Respeita "reduzir movimento".
 */
export function Confetti({ fireKey }: { fireKey: string | number | null }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (fireKey === null || fireKey === "") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = window.innerWidth;
    const height = window.innerHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    // Duas rajadas, dos cantos de baixo para o centro
    const pieces: Piece[] = Array.from({ length: PIECES }, (_, i) => {
      const fromLeft = i % 2 === 0;
      return {
        x: fromLeft ? width * 0.1 : width * 0.9,
        y: height * 0.75,
        vx: (fromLeft ? 1 : -1) * (2 + Math.random() * 5),
        vy: -(9 + Math.random() * 7),
        size: 5 + Math.random() * 6,
        rotation: Math.random() * Math.PI,
        spin: (Math.random() - 0.5) * 0.3,
        color: COLORS[i % COLORS.length],
      };
    });

    const start = performance.now();
    let frame = 0;
    const draw = (t: number) => {
      const elapsed = t - start;
      ctx.clearRect(0, 0, width, height);
      ctx.globalAlpha = Math.max(0, 1 - Math.max(0, elapsed - DURATION_MS * 0.6) / (DURATION_MS * 0.4));
      for (const p of pieces) {
        p.vy += 0.32;
        p.vx *= 0.99;
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.spin;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        ctx.restore();
      }
      if (elapsed < DURATION_MS) frame = requestAnimationFrame(draw);
      else ctx.clearRect(0, 0, width, height);
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [fireKey]);

  return <canvas ref={canvasRef} aria-hidden className="pointer-events-none fixed inset-0 z-[60] h-full w-full" />;
}
