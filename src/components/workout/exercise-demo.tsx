"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import { getExerciseDemo } from "@/lib/exercise-demos";

/**
 * Demonstração da execução: vídeo em loop (sem áudio) ou, sem vídeo, as duas posições alternando
 * com transição suave. Com "reduzir movimento" ativo começa parado; o toque alterna play/pause.
 */
export function ExerciseDemo({ exerciseId, exerciseName }: { exerciseId: string; exerciseName: string }) {
  const demo = getExerciseDemo(exerciseId);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoPlaying, setVideoPlaying] = useState(false);
  // null = segue a preferência de movimento do sistema (roda, ou fica parado com "reduzir movimento")
  const [framesPlaying, setFramesPlaying] = useState<boolean | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // O autoplay pode ser recusado (ex.: modo economia de energia); aí fica na capa até o toque.
    video.play().catch(() => {});
  }, [exerciseId]);

  if (!demo) return null;

  const playing = demo.kind === "video" ? videoPlaying : (framesPlaying ?? true);

  function toggle() {
    if (demo?.kind === "frames") {
      setFramesPlaying(!playing);
      return;
    }
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
      {demo.kind === "video" ? (
        <video
          ref={videoRef}
          src={demo.video}
          poster={demo.poster}
          muted
          loop
          playsInline
          preload="metadata"
          onPlay={() => setVideoPlaying(true)}
          onPause={() => setVideoPlaying(false)}
          className="h-full w-full object-cover"
        />
      ) : (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={demo.frames[0]} alt="" className="absolute inset-0 h-full w-full object-cover" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={demo.frames[1]}
            alt=""
            className={cn(
              "absolute inset-0 h-full w-full animate-[demo-frames_3.2s_ease-in-out_infinite] object-cover",
              framesPlaying === null && "motion-reduce:[animation-play-state:paused]",
            )}
            style={framesPlaying === null ? undefined : { animationPlayState: framesPlaying ? "running" : "paused" }}
          />
        </>
      )}
      <span className="absolute right-2 bottom-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/55 text-white">
        {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
      </span>
    </button>
  );
}
