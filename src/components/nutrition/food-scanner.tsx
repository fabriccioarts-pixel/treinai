"use client";

import { useEffect, useRef, useState } from "react";
import { ImageIcon, X } from "lucide-react";
import { ScannerFrame } from "@/components/nutrition/scanner-frame";

/** Lado da moldura: quase a largura da tela, sem passar de 55% da altura */
function frameSide(width: number, height: number) {
  return Math.round(Math.min(width - 48, height * 0.55, 420));
}

/**
 * Câmera do app para a foto do prato, com moldura de scanner. A foto sai recortada no quadrado da moldura.
 * Sem câmera (navegador sem suporte ou permissão negada) oferece a câmera nativa do celular, por um toque
 * (o navegador só abre o seletor de arquivo a partir de um gesto da pessoa).
 */
export function FoodScanner({
  onCapture,
  onPickFromGallery,
  onNativeCamera,
  onClose,
}: {
  onCapture: (file: File) => void;
  onPickFromGallery: () => void;
  onNativeCamera: () => void;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  // Só monta no navegador (depois de um toque), então dá para ler o suporte já no primeiro render
  const [failed, setFailed] = useState(() => !navigator.mediaDevices?.getUserMedia);
  const [side, setSide] = useState(0);
  const [flash, setFlash] = useState(false);

  // Câmera traseira enquanto o scanner está aberto; desliga ao sair
  useEffect(() => {
    let stream: MediaStream | null = null;
    let cancelled = false;
    if (!navigator.mediaDevices?.getUserMedia) return;
    navigator.mediaDevices
      .getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1920 } },
        audio: false,
      })
      .then((s) => {
        if (cancelled) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
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
  }, []);

  // Tamanho da moldura acompanha a tela (girar o celular, barra do navegador que some)
  useEffect(() => {
    const measure = () => setSide(frameSide(window.innerWidth, window.innerHeight));
    const frame = requestAnimationFrame(measure);
    window.addEventListener("resize", measure);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", measure);
    };
  }, []);

  // Fecha no Esc, como os outros painéis do app
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function capture() {
    const video = videoRef.current;
    const frame = frameRef.current;
    if (!video || !frame || !video.videoWidth) return;

    // O vídeo usa object-cover: converte o quadrado da moldura (tela) para pixels do vídeo
    const view = video.getBoundingClientRect();
    const box = frame.getBoundingClientRect();
    const scale = Math.max(view.width / video.videoWidth, view.height / video.videoHeight);
    const offsetX = (view.width - video.videoWidth * scale) / 2;
    const offsetY = (view.height - video.videoHeight * scale) / 2;
    const sx = Math.max(0, (box.left - view.left - offsetX) / scale);
    const sy = Math.max(0, (box.top - view.top - offsetY) / scale);
    const size = Math.min(box.width / scale, video.videoWidth - sx, video.videoHeight - sy);

    const canvas = document.createElement("canvas");
    canvas.width = Math.round(size);
    canvas.height = Math.round(size);
    canvas.getContext("2d")?.drawImage(video, sx, sy, size, size, 0, 0, canvas.width, canvas.height);

    setFlash(true);
    canvas.toBlob(
      (blob) => {
        if (blob) onCapture(new File([blob], "prato.jpg", { type: "image/jpeg" }));
      },
      "image/jpeg",
      0.9,
    );
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Escanear o prato"
      className="fixed inset-0 z-[100] flex flex-col bg-black text-white"
    >
      <video
        ref={videoRef}
        playsInline
        muted
        onLoadedData={() => setReady(true)}
        className="absolute inset-0 h-full w-full object-cover"
      />

      {/* Escurece tudo fora da moldura; a sombra gigante deixa o quadrado "aceso" */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          ref={frameRef}
          className="relative rounded-2xl shadow-[0_0_0_9999px_rgb(0_0_0/0.6)]"
          style={{ width: side || "70vw", height: side || "70vw" }}
        >
          <ScannerFrame scanning={ready && !failed} />
          {!ready && !failed && (
            <p className="absolute inset-0 flex items-center justify-center text-sm text-white/70">Abrindo a câmera…</p>
          )}
          {failed && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-6 text-center">
              <p className="text-sm leading-relaxed text-white/85">
                Não consegui abrir a câmera aqui. Libere o acesso à câmera nas permissões do navegador, ou use a
                câmera do celular.
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
        </div>
      </div>

      {/* Clarão do disparo, que some sozinho */}
      {flash && <div className="absolute inset-0 animate-[shutter_0.3s_ease-out_forwards] bg-white" aria-hidden />}

      <div className="safe-top relative flex items-center justify-between px-4 pt-4">
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar a câmera"
          className="flex h-11 w-11 items-center justify-center rounded-full bg-black/40 backdrop-blur"
        >
          <X className="h-5 w-5" />
        </button>
        <p className="rounded-full bg-black/40 px-3 py-1.5 text-xs font-medium backdrop-blur">Scanner de refeição</p>
        <span className="h-11 w-11" />
      </div>

      <p className="relative mt-auto mb-6 px-8 text-center text-sm font-medium text-white/90">
        Centralize o prato na moldura, de cima e com boa luz
      </p>

      <div className="safe-bottom relative mb-8 flex items-center justify-center gap-10 px-8">
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
          onClick={capture}
          disabled={!ready}
          aria-label="Tirar a foto"
          className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-white/90 disabled:opacity-40"
        >
          <span className="h-16 w-16 rounded-full bg-primary shadow-[0_0_24px_var(--primary)]" />
        </button>
        <span className="h-12 w-12" />
      </div>
    </div>
  );
}
