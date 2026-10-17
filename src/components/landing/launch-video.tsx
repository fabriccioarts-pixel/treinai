"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { Pause, Play, Volume2, VolumeX } from "lucide-react";
import { cn } from "@/lib/utils";
import { useVisible } from "./phone-sim";

/*
 * Vídeo de apresentação (34s, narrado). Navegadores só deixam tocar sozinho sem som, então ele
 * começa mudo — os textos na tela contam a história — e "Ouvir narração" volta para o início com
 * som. Só toca enquanto está visível, e com "reduzir movimento" fica parado no poster até o play.
 * O projeto do vídeo (Remotion) fica fora do repositório, em treinai-video.
 */

const SRC = "/video/treinai-apresentacao.mp4";
const POSTER = "/video/treinai-apresentacao-poster.jpg";
const CAPTIONS = "/video/treinai-apresentacao.vtt";

export function LaunchVideo({ className }: { className?: string }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const visible = useVisible(wrapRef, 0.4);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  // Pausa manual vence o autoplay por visibilidade
  const [userPaused, setUserPaused] = useState(false);
  const reducedMotion = useReducedMotion() ?? false;

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (visible && !userPaused && (!reducedMotion || !muted)) {
      v.play().catch(() => {});
    } else {
      v.pause();
    }
  }, [visible, userPaused, reducedMotion, muted]);

  function togglePlay() {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      setUserPaused(false);
      if (reducedMotion) setMuted(false);
      v.play().catch(() => {});
    } else {
      setUserPaused(true);
      v.pause();
    }
  }

  function toggleSound() {
    const v = videoRef.current;
    if (!v) return;
    if (muted) {
      // Ligar o som recomeça do início, para a narração fazer sentido
      v.currentTime = 0;
      v.muted = false;
      setMuted(false);
      setUserPaused(false);
      v.play().catch(() => {});
    } else {
      v.muted = true;
      setMuted(true);
    }
  }

  return (
    <div
      ref={wrapRef}
      className={cn(
        "group relative overflow-hidden rounded-3xl border border-border bg-black shadow-[0_40px_120px_-50px_var(--primary)]",
        className,
      )}
    >
      <video
        ref={videoRef}
        className="block aspect-video h-auto w-full"
        width={1920}
        height={1080}
        poster={POSTER}
        muted={muted}
        loop
        playsInline
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        aria-label="Vídeo de apresentação do Treinai: o Théo monta treinos, adapta exercícios, detecta recordes e acompanha sua ofensiva."
      >
        <source src={SRC} type="video/mp4" />
        <track kind="captions" src={CAPTIONS} srcLang="pt-BR" label="Português" />
        Seu navegador não reproduz vídeos.
      </video>

      {/* Controles: aparecem ao passar o mouse; no toque ficam sempre visíveis */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 bg-gradient-to-t from-black/70 to-transparent p-3 sm:p-4">
        <button
          type="button"
          onClick={togglePlay}
          aria-label={playing ? "Pausar vídeo" : "Reproduzir vídeo"}
          className="pointer-events-auto flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-black/50 text-white backdrop-blur-md transition-opacity hover:bg-black/70 outline-none focus-visible:ring-3 focus-visible:ring-ring/50 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
        >
          {playing ? <Pause className="h-4 w-4 fill-current" /> : <Play className="h-4 w-4 fill-current" />}
        </button>
        <button
          type="button"
          onClick={toggleSound}
          aria-pressed={!muted}
          className={cn(
            "pointer-events-auto flex h-10 items-center gap-2 rounded-full border px-4 text-sm font-semibold backdrop-blur-md transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
            muted
              ? "border-primary/40 bg-primary text-primary-foreground shadow-[0_8px_24px_-10px_var(--primary)] hover:bg-primary/90"
              : "border-white/15 bg-black/50 text-white hover:bg-black/70",
          )}
        >
          {muted ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          {muted ? "Ouvir narração" : "Sem som"}
        </button>
      </div>
    </div>
  );
}
