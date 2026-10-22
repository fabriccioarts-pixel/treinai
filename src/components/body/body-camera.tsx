"use client";

import { useEffect, useRef, useState } from "react";
import { ImageIcon, RefreshCw, Timer, X } from "lucide-react";
import { POSE_HINT, POSE_LABEL, type BodyPose } from "@/lib/body-photos";
import { cn } from "@/lib/utils";

const TIMERS = [10, 5, 0] as const;

/** Contorno de corpo usado como guia: de frente/costas ou de perfil */
function Silhouette({ pose }: { pose: BodyPose }) {
  const body =
    pose === "lado"
      ? "M44 32 Q50 29 56 32 Q63 42 61 62 L60 108 Q59 128 58 150 L58 204 L48 204 L47 150 Q45 128 44 108 Q38 84 41 62 Q42 44 44 32 Z"
      : "M38 34 Q50 30 62 34 L75 43 Q80 48 79 56 L76 100 L71 100 L72 61 L66 55 L66 110 L64 150 L62 204 L54 204 L52 150 L50 118 L48 150 L46 204 L38 204 L36 150 L34 110 L34 55 L28 61 L29 100 L24 100 L21 56 Q20 48 25 43 Z";
  return (
    <svg viewBox="0 0 100 220" className="h-full w-auto" aria-hidden>
      <circle cx="50" cy="17" r="11" />
      <path d={body} />
    </svg>
  );
}

/**
 * Câmera para as fotos do corpo: contorno de guia, temporizador para quem está sozinho e troca de câmera.
 * A foto sai inteira (sem recorte). Sem acesso à câmera, oferece a câmera nativa do celular.
 */
export function BodyCamera({
  pose,
  onCapture,
  onPickFromGallery,
  onNativeCamera,
  onClose,
}: {
  pose: BodyPose;
  onCapture: (file: File) => void;
  onPickFromGallery: () => void;
  onNativeCamera: () => void;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [facing, setFacing] = useState<"environment" | "user">("environment");
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(() => !navigator.mediaDevices?.getUserMedia);
  const [timer, setTimer] = useState<(typeof TIMERS)[number]>(10);
  const [countdown, setCountdown] = useState<number | null>(null);

  // Liga a câmera escolhida; trocar de câmera reinicia o vídeo
  useEffect(() => {
    let stream: MediaStream | null = null;
    let cancelled = false;
    if (!navigator.mediaDevices?.getUserMedia) return;
    navigator.mediaDevices
      .getUserMedia({
        video: { facingMode: { ideal: facing }, width: { ideal: 1080 }, height: { ideal: 1920 } },
        audio: false,
      })
      .then((s) => {
        if (cancelled) return s.getTracks().forEach((t) => t.stop());
        stream = s;
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = s;
        void video.play().catch(() => null);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [facing]);

  // Contagem regressiva: a cada segundo desce um; no zero, tira a foto
  useEffect(() => {
    if (countdown === null) return;
    if (countdown === 0) {
      const video = videoRef.current;
      if (!video?.videoWidth) {
        const id = setTimeout(() => setCountdown(null), 0);
        return () => clearTimeout(id);
      }
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext("2d")?.drawImage(video, 0, 0);
      canvas.toBlob(
        (blob) => {
          setCountdown(null);
          if (blob) onCapture(new File([blob], `${pose}.jpg`, { type: "image/jpeg" }));
        },
        "image/jpeg",
        0.9,
      );
      return;
    }
    const id = setTimeout(() => setCountdown((n) => (n === null ? null : n - 1)), 1000);
    return () => clearTimeout(id);
  }, [countdown, onCapture, pose]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const counting = countdown !== null;

  return (
    <div role="dialog" aria-modal="true" aria-label={`Foto de ${POSE_LABEL[pose]}`} className="fixed inset-0 z-[100] flex flex-col bg-black text-white">
      <video
        ref={videoRef}
        playsInline
        muted
        onLoadedData={() => setReady(true)}
        className={cn("absolute inset-0 h-full w-full object-cover", facing === "user" && "-scale-x-100")}
      />

      {/* Contorno de guia: encaixar o corpo inteiro dentro dele */}
      <div className="pointer-events-none absolute inset-x-0 top-[14%] bottom-[22%] flex justify-center fill-primary/[0.07] stroke-primary/80 [stroke-dasharray:3_3] [stroke-width:0.8]">
        <Silhouette pose={pose} />
      </div>

      {failed && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/80 px-8 text-center">
          <p className="text-sm leading-relaxed text-white/85">
            Não consegui abrir a câmera aqui. Libere o acesso nas permissões do navegador, ou use a câmera do celular.
          </p>
          <button
            type="button"
            onClick={onNativeCamera}
            className="cta-shine rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
          >
            Usar a câmera do celular
          </button>
        </div>
      )}

      {counting && countdown > 0 && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-live="assertive">
          <span className="tabular text-[9rem] font-bold leading-none text-white drop-shadow-[0_0_30px_var(--primary)]">
            {countdown}
          </span>
        </div>
      )}

      <div className="safe-top relative flex items-start justify-between gap-3 px-4 pt-4">
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar a câmera"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-black/40 backdrop-blur"
        >
          <X className="h-5 w-5" />
        </button>
        <div className="min-w-0 rounded-2xl bg-black/45 px-3 py-2 text-center backdrop-blur">
          <p className="text-sm font-semibold">{POSE_LABEL[pose]}</p>
          <p className="mt-0.5 text-xs leading-snug text-white/80">{POSE_HINT[pose]}</p>
        </div>
        <button
          type="button"
          onClick={() => setFacing((f) => (f === "environment" ? "user" : "environment"))}
          aria-label="Trocar de câmera"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-black/40 backdrop-blur"
        >
          <RefreshCw className="h-5 w-5" />
        </button>
      </div>

      <div className="safe-bottom relative mt-auto mb-8 flex items-center justify-between px-10">
        <button
          type="button"
          onClick={onPickFromGallery}
          aria-label="Escolher da galeria"
          className="flex h-12 w-12 items-center justify-center rounded-full bg-white/15 backdrop-blur"
        >
          <ImageIcon className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={() => (counting ? setCountdown(null) : setCountdown(timer))}
          disabled={!ready || failed}
          aria-label={counting ? "Cancelar a contagem" : "Tirar a foto"}
          className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-white/90 disabled:opacity-40"
        >
          <span
            className={cn(
              "rounded-full bg-primary shadow-[0_0_24px_var(--primary)] transition-all",
              counting ? "h-8 w-8 rounded-md" : "h-16 w-16",
            )}
          />
        </button>
        <button
          type="button"
          onClick={() => setTimer((t) => TIMERS[(TIMERS.indexOf(t) + 1) % TIMERS.length])}
          disabled={counting}
          aria-label={`Temporizador: ${timer ? `${timer} segundos` : "desligado"}`}
          className="flex h-12 w-12 flex-col items-center justify-center rounded-full bg-white/15 backdrop-blur disabled:opacity-40"
        >
          <Timer className="h-4 w-4" />
          <span className="tabular text-[10px] font-semibold">{timer ? `${timer}s` : "off"}</span>
        </button>
      </div>
    </div>
  );
}
