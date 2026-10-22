"use client";

import { useSyncExternalStore } from "react";
import { INSTALL_CHANGE_EVENT } from "@/lib/install-capture";

/*
 * Instalar o Treinai na tela inicial (PWA), enquanto o app não está nas lojas.
 * O Chrome/Edge (Android e computador) entregam o evento beforeinstallprompt, que vira um botão de um toque;
 * no iPhone não existe esse evento, então a pessoa recebe o passo a passo do Safari.
 */

/** Evento do Chrome/Edge; não está nos tipos do TypeScript */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

declare global {
  interface Window {
    /** Guardado pelo script do layout raiz (src/lib/install-capture.ts), que escuta o evento antes da hidratação */
    __treinaiInstallPrompt?: BeforeInstallPromptEvent | null;
  }
}

export type InstallMode =
  | "installed" // já está aberto como app
  | "prompt" // o navegador oferece instalar com um toque
  | "ios" // iPhone/iPad no Safari (ou Chrome do iOS): Compartilhar → Adicionar à Tela de Início
  | "in-app" // navegador embutido (Instagram, Facebook, TikTok…): precisa abrir no navegador de verdade
  | "android" // Android sem o evento (Samsung Internet, Firefox…): menu do navegador
  | "unsupported"; // computador sem suporte: não vale insistir

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function detectMode(): InstallMode {
  if (isStandalone()) return "installed";
  if (window.__treinaiInstallPrompt) return "prompt";
  const ua = navigator.userAgent;
  if (/Instagram|FBAN|FBAV|FB_IAB|TikTok|musical_ly|Line\/|LinkedInApp|Snapchat/i.test(ua)) return "in-app";
  // iPadOS se apresenta como Mac; o toque denuncia
  const ios = /iPhone|iPad|iPod/i.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  if (ios) return "ios";
  if (/Android/i.test(ua)) return "android";
  return "unsupported";
}

function subscribe(onChange: () => void) {
  const media = window.matchMedia("(display-mode: standalone)");
  window.addEventListener(INSTALL_CHANGE_EVENT, onChange);
  media.addEventListener("change", onChange);
  return () => {
    window.removeEventListener(INSTALL_CHANGE_EVENT, onChange);
    media.removeEventListener("change", onChange);
  };
}

/** Modo de instalação deste aparelho; null no servidor e antes da hidratação */
export function useInstallMode(): InstallMode | null {
  return useSyncExternalStore(subscribe, detectMode, () => null);
}

/** Abre a janela de instalação do navegador. Precisa vir de um toque da pessoa. */
export async function promptInstall(): Promise<"accepted" | "dismissed" | "unavailable"> {
  const event = window.__treinaiInstallPrompt;
  if (!event) return "unavailable";
  await event.prompt();
  const { outcome } = await event.userChoice;
  // O evento só serve uma vez; o navegador manda outro se ainda der para instalar
  window.__treinaiInstallPrompt = null;
  window.dispatchEvent(new Event(INSTALL_CHANGE_EVENT));
  return outcome;
}
