"use client";

import React, { useEffect, useRef, useState } from "react";

export interface AsciiEffectProps {
  variant?: "image" | "canvas" | "video";
  imageSrc?: string;
  fontSize?: number;
  scale?: number;
  className?: string;
  characters?: string;
  color?: string;
  invert?: boolean;
}

const DEFAULT_CHARS = " .:-=+*#%@";

export function AsciiEffect({
  variant = "image",
  imageSrc,
  fontSize = 9,
  scale = 1.15,
  className = "",
  characters = DEFAULT_CHARS,
  color,
  invert = false,
}: AsciiEffectProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (variant !== "image" || !imageSrc) return;

    const img = new window.Image();
    img.crossOrigin = "anonymous";

    img.onerror = () => {
      if (imageSrc.startsWith("/Treinai/")) {
        img.src = imageSrc.replace("/Treinai/", "/");
      }
    };

    img.src = imageSrc;

    let animFrame: number;
    let cancelled = false;

    img.onload = () => {
      if (cancelled) return;
      setLoaded(true);

      const render = () => {
        const container = containerRef.current;
        const canvas = canvasRef.current;
        if (!container || !canvas) return;

        const rect = container.getBoundingClientRect();
        const width = Math.floor(rect.width);
        const height = Math.floor(rect.height);

        if (width <= 0 || height <= 0) return;

        const dpr = window.devicePixelRatio || 1;
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;

        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) return;

        ctx.scale(dpr, dpr);

        const charWidth = fontSize * 0.6;
        const charHeight = fontSize;

        const cols = Math.max(1, Math.floor(width / charWidth));
        const rows = Math.max(1, Math.floor(height / charHeight));

        // Offscreen canvas to downsample image to cols x rows
        const offCanvas = document.createElement("canvas");
        offCanvas.width = cols;
        offCanvas.height = rows;
        const offCtx = offCanvas.getContext("2d", { willReadFrequently: true });
        if (!offCtx) return;

        // Calculate aspect ratio cover with scale
        const imgAspect = img.naturalWidth / img.naturalHeight;
        const targetAspect = cols / rows;

        let drawW = cols * scale;
        let drawH = rows * scale;

        if (targetAspect > imgAspect) {
          drawW = cols * scale;
          drawH = (cols / imgAspect) * scale;
        } else {
          drawH = rows * scale;
          drawW = rows * imgAspect * scale;
        }

        const drawX = (cols - drawW) / 2;
        const drawY = (rows - drawH) / 2;

        offCtx.drawImage(img, drawX, drawY, drawW, drawH);
        const imgData = offCtx.getImageData(0, 0, cols, rows);
        const pixels = imgData.data;

        ctx.clearRect(0, 0, width, height);
        ctx.font = `${fontSize}px "Geist Mono", monospace, monospace`;
        ctx.textBaseline = "top";

        const charsLen = characters.length;

        for (let y = 0; y < rows; y++) {
          for (let x = 0; x < cols; x++) {
            const idx = (y * cols + x) * 4;
            const r = pixels[idx];
            const g = pixels[idx + 1];
            const b = pixels[idx + 2];
            const a = pixels[idx + 3];

            if (a < 20) continue;

            let brightness = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
            if (invert) brightness = 1 - brightness;

            const charIndex = Math.min(
              charsLen - 1,
              Math.max(0, Math.floor(brightness * (charsLen - 1)))
            );
            const char = characters[charIndex];

            if (color) {
              ctx.fillStyle = color;
            } else {
              // Color based on pixel rgb with enhanced contrast
              ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${Math.max(0.2, a / 255)})`;
            }

            ctx.fillText(char, x * charWidth, y * charHeight);
          }
        }
      };

      render();

      const ro = new ResizeObserver(() => {
        cancelAnimationFrame(animFrame);
        animFrame = requestAnimationFrame(render);
      });
      ro.observe(containerRef.current!);

      return () => {
        ro.disconnect();
        cancelAnimationFrame(animFrame);
      };
    };

    return () => {
      cancelled = true;
      cancelAnimationFrame(animFrame);
    };
  }, [variant, imageSrc, fontSize, scale, characters, color, invert]);

  return (
    <div
      ref={containerRef}
      className={`relative h-full w-full overflow-hidden bg-black/40 ${className}`}
    >
      <canvas
        ref={canvasRef}
        className={`block h-full w-full transition-opacity duration-700 ${
          loaded ? "opacity-100" : "opacity-0"
        }`}
      />
    </div>
  );
}
