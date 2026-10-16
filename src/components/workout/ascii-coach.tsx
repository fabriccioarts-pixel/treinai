"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

/*
 * Busto do personal em ASCII, gerado a partir de uma imagem.
 *
 * Pipeline por quadro:
 *  1. A imagem (pré-processada em tons de cinza com níveis normalizados) é copiada
 *     para um canvas de trabalho, onde desenhamos as pálpebras (piscar) e a boca (fala).
 *  2. O canvas de trabalho é redesenhado, linha a linha, num canvas de amostragem com
 *     1 pixel por célula de caractere. Cada linha é deslocada/esticada para simular a
 *     respiração (ombros e cabeça sobem, peito alarga).
 *  3. A luminância de cada célula vira um caractere, pintado com a cor primária.
 *
 * Coordenadas abaixo são normalizadas (0–1) em relação à imagem.
 */
const COACH_IMAGE = {
  // Versão reduzida (480px) do coach-bust.png: o ASCII não usa mais resolução que isso
  src: "/coach-bust.jpg",
  eyes: [
    { x: 0.423, y: 0.252, rx: 0.032, ry: 0.01 },
    { x: 0.581, y: 0.252, rx: 0.032, ry: 0.01 },
  ],
  mouth: { x: 0.504, y: 0.391, rx: 0.042, ry: 0.016 } as
    | { x: number; y: number; rx: number; ry: number }
    | undefined,
  /** Altura (0–1) onde o pescoço encontra os ombros */
  neckY: 0.485,
};

const RAMP = " .,:;i1tfLCG08@";
// Quadros por segundo por perfil de aparelho (celular/aparelho modesto anima com menos quadros)
const FPS = { bust: 30, bustLowPower: 20, icon: 20, iconLowPower: 12 };
const BREATH_PERIOD = 4; // segundos
const BREATH_RISE = 0.02; // fração da altura da imagem
const BREATH_WIDEN = 0.028; // fração da largura
const HEAD_SWAY = 0.008; // balanço lateral da cabeça (fração da largura)
const SCAN_PERIOD = 5; // segundos entre passagens da faixa de varredura
const EDGE_FADE = 0.16; // fração da largura da imagem dissolvida em cada lateral

type Eye = (typeof COACH_IMAGE.eyes)[number];

function smoothstep(a: number, b: number, x: number) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

/* Converte para cinza e estica os níveis (percentis 2%–98%) para dar contraste ao ASCII */
function prepareSource(img: HTMLImageElement) {
  const h = Math.min(480, img.naturalHeight);
  const w = Math.round((img.naturalWidth / img.naturalHeight) * h);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0, w, h);
  const imgData = ctx.getImageData(0, 0, w, h);
  const d = imgData.data;

  const lum = new Float32Array(w * h);
  const hist = new Uint32Array(256);
  for (let i = 0; i < lum.length; i++) {
    const a = d[i * 4 + 3] / 255;
    const l = (0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2]) * a;
    lum[i] = l;
    hist[Math.round(l)]++;
  }
  const pct = (p: number) => {
    let acc = 0;
    for (let v = 0; v < 256; v++) {
      acc += hist[v];
      if (acc >= lum.length * p) return v;
    }
    return 255;
  };
  const lo = pct(0.02);
  const hi = Math.max(lo + 1, pct(0.98));
  for (let i = 0; i < lum.length; i++) {
    const n = Math.min(1, Math.max(0, (lum[i] - lo) / (hi - lo)));
    const v = Math.round(Math.pow(n, 0.9) * 255);
    d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = v;
    d[i * 4 + 3] = 255;
  }
  ctx.putImageData(imgData, 0, 0);

  // Tom da pálpebra: média da pele logo abaixo de cada olho (acima fica a sobrancelha)
  const lidGray = COACH_IMAGE.eyes.map((e) => {
    const x0 = Math.round((e.x - e.rx * 0.8) * w);
    const x1 = Math.round((e.x + e.rx * 0.8) * w);
    const y0 = Math.round((e.y + e.ry * 2) * h);
    const y1 = Math.round((e.y + e.ry * 3.5) * h);
    let sum = 0;
    let n = 0;
    for (let y = Math.max(0, y0); y <= Math.min(h - 1, y1); y++) {
      for (let x = Math.max(0, x0); x <= Math.min(w - 1, x1); x++) {
        sum += d[(y * w + x) * 4];
        n++;
      }
    }
    return n ? sum / n : 120;
  });

  return { canvas, lidGray };
}

type PreparedSource = ReturnType<typeof prepareSource>;

/* A imagem é preparada uma única vez e compartilhada entre o busto do chat e o avatar da nav */
let sourcePromise: Promise<PreparedSource> | null = null;
function loadSource() {
  if (!sourcePromise) {
    sourcePromise = new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(prepareSource(img));
      img.onerror = () => {
        sourcePromise = null;
        reject(new Error(`AsciiCoach: imagem não encontrada em ${COACH_IMAGE.src}`));
      };
      img.src = COACH_IMAGE.src;
    });
  }
  return sourcePromise;
}

/** Recorte (0–1) usado pelo avatar da nav: só o rosto, quadrado */
const FACE_CROP = { x: 0.31, y: 0.12, w: 0.38, h: 0.3 };
const FULL_CROP = { x: 0, y: 0, w: 1, h: 1 };

function drawEyelid(ctx: CanvasRenderingContext2D, e: Eye, closed: number, gray: number, w: number, h: number) {
  if (closed <= 0) return;
  const x = e.x * w;
  const y = e.y * h;
  const rx = e.rx * w * 1.25;
  const ry = e.ry * h * 1.6;
  const lidY = y - ry + 2 * ry * closed;
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.clip();
  const v = Math.round(gray);
  ctx.fillStyle = `rgb(${v},${v},${v})`;
  ctx.fillRect(x - rx, y - ry, rx * 2, lidY - (y - ry));
  ctx.strokeStyle = "rgb(15,15,15)";
  ctx.lineWidth = Math.max(1.5, ry * 0.35);
  ctx.beginPath();
  ctx.moveTo(x - rx, lidY);
  ctx.quadraticCurveTo(x, lidY + ry * 0.25, x + rx, lidY);
  ctx.stroke();
  ctx.restore();
}

export function AsciiCoach({
  speaking = false,
  variant = "bust",
  className,
}: {
  speaking?: boolean;
  /** "bust": busto inteiro ao fundo do chat · "icon": rosto em miniatura (nav bar) */
  variant?: "bust" | "icon";
  className?: string;
}) {
  const isIcon = variant === "icon";
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const speakingRef = useRef(speaking);

  useEffect(() => {
    speakingRef.current = speaking;
  }, [speaking]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const sample = document.createElement("canvas");
    const sctx = sample.getContext("2d", { willReadFrequently: true });
    const work = document.createElement("canvas");
    const wctx = work.getContext("2d");
    if (!ctx || !sctx || !wctx) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // Tela de toque ou poucos núcleos: anima com menos quadros por segundo (a definição não muda)
    const lowPower =
      window.matchMedia("(pointer: coarse)").matches || (navigator.hardwareConcurrency ?? 8) <= 4;
    const fps = isIcon ? (lowPower ? FPS.iconLowPower : FPS.icon) : lowPower ? FPS.bustLowPower : FPS.bust;
    let visible = true;

    let source: PreparedSource | null = null;
    const crop = isIcon ? FACE_CROP : FULL_CROP;
    let lastColorRead = -1;
    let width = 0;
    let height = 0;
    let cols = 0;
    let rows = 0;
    let cellW = 0;
    let cellH = 0;
    let color = "#22c55e";
    let dpr = 1;
    let colFade = new Float32Array(0);

    // Atlas: cada caractere da rampa (já com cor e opacidade) é rasterizado uma vez; os quadros só
    // copiam pedaços dele com drawImage, bem mais barato que fillText por célula.
    const atlas = document.createElement("canvas");
    const actx = atlas.getContext("2d");
    let glyphW = 0;
    let glyphH = 0;
    let atlasColor = "";
    function buildAtlas() {
      if (!actx) return;
      glyphW = Math.ceil(cellW * dpr) + 1;
      glyphH = Math.ceil(cellH * dpr) + 1;
      atlas.width = glyphW * RAMP.length;
      atlas.height = glyphH;
      actx.clearRect(0, 0, atlas.width, atlas.height);
      actx.fillStyle = color;
      actx.font = `${cellH * dpr}px ui-monospace, SFMono-Regular, Menlo, monospace`;
      actx.textBaseline = "top";
      for (let i = 1; i < RAMP.length; i++) {
        actx.globalAlpha = 0.3 + 0.7 * (i / (RAMP.length - 1));
        actx.fillText(RAMP[i], i * glyphW, 0);
      }
      actx.globalAlpha = 1;
      atlasColor = color;
    }

    // Piscar: fecha 70ms, segura 70ms, abre 110ms
    const CLOSE = 0.07;
    const HOLD = 0.07;
    const OPEN = 0.11;
    let nextBlink = 1.2 + Math.random() * 1.5;
    let blinkStart = -1;
    let doubleBlink = false;

    let glitchUntil = 0;
    let glitchRow = 0;
    let glitchSize = 0;
    let glitchShift = 0;
    let nextGlitch = 3 + Math.random() * 4;

    function resize() {
      const rect = canvas!.getBoundingClientRect();
      // No ícone os caracteres são minúsculos, então vale usar toda a densidade da tela
      // Mesma definição em qualquer aparelho; o ganho de desempenho vem do atlas e dos quadros por segundo
      dpr = Math.min(window.devicePixelRatio || 1, isIcon ? 3 : 2);
      width = rect.width;
      height = rect.height;
      canvas!.width = Math.max(1, Math.round(width * dpr));
      canvas!.height = Math.max(1, Math.round(height * dpr));
      ctx!.setTransform(1, 0, 0, 1, 0, 0);

      cellH = isIcon ? Math.max(1.8, height / 14) : Math.min(8, Math.max(5, height / 110));
      cellW = cellH * 0.6;
      cols = Math.max(1, Math.ceil(width / cellW));
      rows = Math.max(1, Math.ceil(height / cellH));
      sample.width = cols;
      sample.height = rows;
      colFade = new Float32Array(cols);
      lastColorRead = -1;
      atlasColor = "";
    }

    function blinkClosedAt(t: number) {
      if (blinkStart < 0 && t >= nextBlink) {
        blinkStart = t;
        doubleBlink = Math.random() < 0.25;
      }
      if (blinkStart < 0) return 0;
      const one = CLOSE + HOLD + OPEN;
      const total = doubleBlink ? one * 2 + 0.06 : one;
      const p = t - blinkStart;
      if (p >= total) {
        blinkStart = -1;
        nextBlink = t + 2 + Math.random() * 3;
        return 0;
      }
      let local = p;
      if (doubleBlink && p > one) local = p - one - 0.06;
      if (local < 0) return 0;
      if (local < CLOSE) return local / CLOSE;
      if (local < CLOSE + HOLD) return 1;
      return Math.max(0, 1 - (local - CLOSE - HOLD) / OPEN);
    }

    function mouthAt(t: number) {
      if (!speakingRef.current) return 0;
      const v = (Math.sin(t * 14) * 0.5 + 0.5) * (Math.sin(t * 3.3) * 0.5 + 0.5);
      return v > 0.15 ? v : 0;
    }

    function render(t: number) {
      if (!source || !cols || !rows) return;
      // A cor acompanha o estado (ex.: aba ativa/inativa na nav), relida 2x por segundo
      if (lastColorRead < 0 || t - lastColorRead > 0.5) {
        color = getComputedStyle(canvas!).color || color;
        lastColorRead = t;
      }
      if (color !== atlasColor) buildAtlas();
      const src = source.canvas;
      const sw = src.width;
      const sh = src.height;

      // 1) Canvas de trabalho: imagem + pálpebras + boca
      if (work.width !== sw || work.height !== sh) {
        work.width = sw;
        work.height = sh;
      }
      wctx!.drawImage(src, 0, 0);
      {
        // Piscar, respirar e falar são movimentos pequenos e mantidos mesmo com
        // "reduzir movimento"; só o glitch e a varredura são desligados.
        const closed = blinkClosedAt(t);
        COACH_IMAGE.eyes.forEach((e, i) => drawEyelid(wctx!, e, closed, source!.lidGray[i], sw, sh));
        const m = COACH_IMAGE.mouth;
        const open = mouthAt(t);
        if (m && open > 0) {
          wctx!.fillStyle = "rgb(12,12,12)";
          wctx!.beginPath();
          wctx!.ellipse(m.x * sw, m.y * sh, m.rx * sw, Math.max(1, m.ry * sh * open), 0, 0, Math.PI * 2);
          wctx!.fill();
        }
      }

      // 2) Amostragem linha a linha com deformação de respiração
      const breath = Math.sin((t * Math.PI * 2) / BREATH_PERIOD);
      const sway = Math.sin(t * 0.7) * 0.6 + Math.sin(t * 0.31) * 0.4;
      const aspect = (crop.w * sw) / (crop.h * sh);
      let dwPx: number;
      let dhPx: number;
      if (isIcon) {
        // "cover": o rosto preenche o quadrado todo
        dwPx = Math.max(width, height * aspect);
        dhPx = dwPx / aspect;
      } else {
        // "contain" ancorado embaixo: o busto cabe inteiro
        dhPx = height * 0.98;
        dwPx = dhPx * aspect;
        if (dwPx > width) {
          dwPx = width;
          dhPx = dwPx / aspect;
        }
      }
      const dw = dwPx / cellW;
      const dh = dhPx / cellH;
      const ox = (cols - dw) / 2;
      const oy = isIcon ? (rows - dh) / 2 : rows - dh;
      const { neckY } = COACH_IMAGE;

      sctx!.fillStyle = "#000";
      sctx!.fillRect(0, 0, cols, rows);
      for (let r = 0; r < rows; r++) {
        const vc = (r + 0.5 - oy) / dh;
        if (vc < -0.05 || vc > 1) continue;
        const vd = crop.y + vc * crop.h;
        // Tudo acima do pescoço sobe junto; o tronco estica até a base, que fica parada
        const lift = BREATH_RISE * breath * Math.min(1, Math.max(0, (1 - vd) / (1 - neckY)));
        const vs = vd + lift;
        if (vs < 0 || vs >= 1) continue;
        const sx = 1 + BREATH_WIDEN * breath * smoothstep(neckY - 0.02, neckY + 0.15, vd);
        // A cabeça balança levemente; o efeito some suavemente no pescoço
        const headShift = HEAD_SWAY * (dw / crop.w) * sway * (1 - smoothstep(neckY - 0.12, neckY, vd));
        sctx!.drawImage(
          work,
          crop.x * sw,
          vs * sh,
          crop.w * sw,
          Math.max(1, (crop.h * sh) / dh),
          ox + (dw * (1 - sx)) / 2 + headShift,
          r,
          dw * sx,
          1,
        );
      }
      const data = sctx!.getImageData(0, 0, cols, rows).data;

      // 3) Glitch ocasional
      if (!reducedMotion && t >= nextGlitch) {
        glitchRow = Math.floor(Math.random() * rows);
        glitchSize = isIcon ? 1 : 1 + Math.floor(Math.random() * 4);
        glitchShift = (Math.random() < 0.5 ? -1 : 1) * (isIcon ? 1 : 2 + Math.floor(Math.random() * 4));
        glitchUntil = t + 0.12;
        nextGlitch = t + (isIcon ? 6 : 3) + Math.random() * 5;
      }
      const glitching = t < glitchUntil;

      // Faixa de varredura descendo pelo corpo, como um holograma sendo "lido"
      const scanP = (t % SCAN_PERIOD) / 1.6;
      const scanPad = isIcon ? 2 : 10;
      const scanY = reducedMotion || scanP > 1 ? -999 : scanP * (rows + scanPad * 2) - scanPad;
      const scanWidth = isIcon ? 1.5 : 4;

      // Dissolve as bordas laterais da imagem para os ombros não terminarem num corte reto
      colFade.fill(1);
      if (!isIcon) {
        for (let x = 0; x < cols; x++) {
          const u = (x + 0.5 - ox) / dw;
          colFade[x] = smoothstep(0, EDGE_FADE, u) * smoothstep(1, 1 - EDGE_FADE, u);
        }
      }

      // 4) Luminância → caracteres
      ctx!.clearRect(0, 0, canvas!.width, canvas!.height);
      const stepX = cellW * dpr;
      const stepY = cellH * dpr;
      for (let y = 0; y < rows; y++) {
        const py = Math.round(y * stepY);
        const shift = glitching && y >= glitchRow && y < glitchRow + glitchSize ? glitchShift : 0;
        const scanBoost = Math.max(0, 1 - Math.abs(y - scanY) / scanWidth) * 0.45;
        for (let x = 0; x < cols; x++) {
          let l = (data[(y * cols + x) * 4] / 255) * colFade[x];
          if (l < 0.07) continue;
          l = Math.min(1, l + scanBoost);
          // Cintilação esparsa de caracteres (aspecto "digital")
          if (!reducedMotion && Math.random() < 0.004) l = Math.min(1, l + 0.35);
          const idx = Math.min(RAMP.length - 1, Math.floor(l * RAMP.length));
          if (idx === 0) continue;
          ctx!.drawImage(atlas, idx * glyphW, 0, glyphW, glyphH, Math.round((x + shift) * stepX), py, glyphW, glyphH);
        }
      }
    }

    let raf = 0;
    let disposed = false;
    const start = performance.now();
    let last = 0;
    let lastVisibilityCheck = -Infinity;
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      // Fora da tela (ex.: landing page rolada) não desenha. Checagem direta da posição a cada
      // 0,5s: mais confiável que IntersectionObserver enquanto o layout ainda está assentando.
      if (now - lastVisibilityCheck > 500) {
        const r = canvas!.getBoundingClientRect();
        visible = r.bottom > 0 && r.top < window.innerHeight && r.width > 0;
        lastVisibilityCheck = now;
      }
      if (!visible || now - last < 1000 / fps) return;
      last = now;
      render((now - start) / 1000);
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    loadSource()
      .then((prepared) => {
        if (disposed) return;
        source = prepared;
        raf = requestAnimationFrame(loop);
      })
      .catch((err: Error) => console.warn(err.message));

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [isIcon]);

  if (isIcon) {
    // A cor dos caracteres vem do `color` herdado (text-primary / text-muted-foreground)
    return (
      <div aria-hidden className={cn("relative overflow-hidden", className)}>
        <canvas ref={canvasRef} className="h-full w-full" />
      </div>
    );
  }

  return (
    <div
      aria-hidden
      className={cn("relative overflow-hidden", className)}
      style={{
        maskImage: "linear-gradient(to bottom, black 70%, transparent)",
        WebkitMaskImage: "linear-gradient(to bottom, black 70%, transparent)",
      }}
    >
      <canvas ref={canvasRef} className="h-full w-full text-primary" />
      {/* Scanlines para reforçar o aspecto de holograma */}
      <div
        className="pointer-events-none absolute inset-0 opacity-25"
        style={{
          background:
            "repeating-linear-gradient(to bottom, transparent 0 2px, rgba(0,0,0,0.35) 2px 3px)",
        }}
      />
    </div>
  );
}
