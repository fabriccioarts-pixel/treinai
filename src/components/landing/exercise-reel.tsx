"use client";

import { useEffect, useRef } from "react";

/*
 * Vitrine com os vídeos reais de demonstração (os mesmos usados dentro do treino), em loop mudo.
 * Mostra que cada exercício da biblioteca tem a execução certa, não só o nome.
 */

const EXERCISES = [
  { id: "supino-reto", label: "Supino reto" },
  { id: "barra-fixa", label: "Barra fixa" },
  { id: "agachamento", label: "Agachamento livre" },
  { id: "elevacao-lateral", label: "Elevação lateral" },
  { id: "puxada-frontal", label: "Puxada frontal" },
  { id: "rosca-direta", label: "Rosca direta" },
];

function ReelTile({ id, label }: { id: string; label: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    video.play().catch(() => {});
  }, []);

  return (
    <div className="group relative aspect-[3/4] overflow-hidden rounded-2xl bg-[#141614] ring-1 ring-white/5">
      <video
        ref={videoRef}
        src={`/exercises/${id}/demo.mp4`}
        poster={`/exercises/${id}/poster.jpg`}
        muted
        loop
        playsInline
        preload="metadata"
        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
      />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent p-2.5 pt-8">
        <span className="text-xs font-semibold text-white">{label}</span>
      </div>
    </div>
  );
}

export function ExerciseReel() {
  return (
    <div className="mx-auto grid max-w-sm grid-cols-3 gap-2.5 sm:gap-3">
      {EXERCISES.map((ex) => (
        <ReelTile key={ex.id} {...ex} />
      ))}
    </div>
  );
}
