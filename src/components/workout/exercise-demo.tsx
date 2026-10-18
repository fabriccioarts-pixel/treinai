"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import { getExerciseDemo } from "@/lib/exercise-demos";

/**
 * Demonstração da execução em vídeo (loop, sem áudio).
 * Com "reduzir movimento" ativo começa pausado na capa; o toque alterna play/pause.
 */
export function ExerciseDemo({ exerciseId, exerciseName }: { exerciseId: string; exerciseName: string }) {
  const demo = getExerciseDemo(exerciseId);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // O autoplay pode ser recusado (ex.: modo economia de energia); aí fica na capa até o toque.
    video.play().catch(() => {});
  }, [exerciseId]);

  if (!demo) return null;

  function toggle() {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) video.play().catch(() => {});
    else video.pause();
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className="relative block aspect-video w-full overflow-hidden rounded-2xl bg-[#141614]"
      aria-label={`${playing ? "Pausar" : "Reproduzir"} demonstração de ${exerciseName}`}
    >
      <video
        ref={videoRef}
        src={demo.video}
        poster={demo.poster}
        muted
        loop
        playsInline
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        className="h-full w-full object-cover"
      />
      <span className="absolute right-2 bottom-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/55 text-white">
        {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
      </span>
    </button>
  );
}
