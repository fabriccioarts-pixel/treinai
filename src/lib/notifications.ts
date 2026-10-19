"use client";

import { disableRemindersAction, enableRemindersAction } from "@/app/actions/notification-actions";

/*
 * Notificações do navegador (Web Push): permissão, inscrição e teste local.
 * Usado pelo card de Lembretes do Perfil e pelo convite da home.
 */

export type NotificationState =
  | "unsupported" // navegador sem service worker / push
  | "ios-install" // iPhone fora da Tela de Início: só funciona como app instalado
  | "denied" // a pessoa bloqueou para este site
  | "off" // pode ativar
  | "on"; // inscrito neste aparelho

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
}

function isIos() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches;
}

function supportsPush() {
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window && !!VAPID_PUBLIC_KEY;
}

async function registerServiceWorker() {
  return navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" });
}

/** Estado atual neste aparelho (sem pedir nada à pessoa) */
export async function getNotificationState(): Promise<NotificationState> {
  if (!supportsPush()) return isIos() && !isStandalone() ? "ios-install" : "unsupported";
  if (Notification.permission === "denied") return "denied";
  const registration = await registerServiceWorker();
  const sub = await registration.pushManager.getSubscription();
  return sub && Notification.permission === "granted" ? "on" : "off";
}

/**
 * Pede a permissão do navegador e ativa os lembretes neste aparelho.
 * Precisa ser chamada a partir de um clique: os navegadores ignoram o pedido fora de um gesto da pessoa.
 */
export async function enableNotifications(): Promise<{ state: NotificationState; error?: string }> {
  if (!supportsPush()) return { state: isIos() && !isStandalone() ? "ios-install" : "unsupported" };

  const permission = await Notification.requestPermission();
  if (permission === "denied") return { state: "denied" };
  if (permission !== "granted") return { state: "off", error: "Você fechou o pedido do navegador. Toque de novo e escolha Permitir." };

  try {
    const registration = await registerServiceWorker();
    await navigator.serviceWorker.ready;
    // Inscrição antiga (outra chave do servidor) é trocada por uma nova
    const existing = await registration.pushManager.getSubscription();
    const sub =
      existing ??
      (await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY!),
      }));
    const json = sub.toJSON();
    const result = await enableRemindersAction({
      endpoint: sub.endpoint,
      p256dh: json.keys?.p256dh ?? "",
      auth: json.keys?.auth ?? "",
    });
    if (result.error) {
      await sub.unsubscribe();
      return { state: "off", error: result.error };
    }
    return { state: "on" };
  } catch (err) {
    console.error("Erro ao ativar notificações:", err);
    return { state: "off", error: "Não foi possível ativar as notificações neste aparelho." };
  }
}

export async function disableNotifications(): Promise<NotificationState> {
  const registration = await navigator.serviceWorker.getRegistration();
  const sub = await registration?.pushManager.getSubscription();
  if (sub) {
    await disableRemindersAction(sub.endpoint);
    await sub.unsubscribe();
  }
  return "off";
}

/**
 * Mostra uma notificação direto pelo navegador, sem passar pelo servidor. Se ela não aparecer,
 * o bloqueio está no navegador ou no sistema (ex.: notificações do Windows desligadas).
 */
export async function showLocalTestNotification(): Promise<{ ok: boolean; message: string }> {
  if (!("Notification" in window)) return { ok: false, message: "Este navegador não mostra notificações." };
  if (Notification.permission !== "granted") {
    return { ok: false, message: "O navegador ainda não deu permissão. Ative os lembretes primeiro." };
  }
  try {
    const registration = await navigator.serviceWorker.ready;
    await registration.showNotification("Teste do Treinai", {
      body: "Se você está vendo isto, as notificações estão funcionando neste aparelho. 💪",
      icon: "/logo-icon.png",
      badge: "/logo-icon.png",
      tag: "teste-local",
      data: { url: "/perfil" },
    });
    return {
      ok: true,
      message: `Notificação mostrada. Se não apareceu nada, ${systemHint()}`,
    };
  } catch (err) {
    console.error("Erro no teste local de notificação:", err);
    return { ok: false, message: "O navegador recusou mostrar a notificação." };
  }
}

type Browser = "firefox" | "edge" | "chrome" | "safari" | "outro";

function detectBrowser(): Browser {
  const ua = navigator.userAgent;
  if (/firefox|fxios/i.test(ua)) return "firefox";
  if (/edg\//i.test(ua)) return "edge";
  if (/chrome|crios/i.test(ua)) return "chrome";
  if (/safari/i.test(ua)) return "safari";
  return "outro";
}

/** Onde o sistema pode estar escondendo as notificações */
function systemHint(): string {
  const platform = navigator.userAgent;
  if (/windows/i.test(platform)) {
    return "confira em Configurações do Windows → Sistema → Notificações se o navegador está ligado e se o “Não perturbe” está desligado.";
  }
  if (/mac os/i.test(platform)) {
    return "confira em Ajustes do Sistema → Notificações se o navegador está permitido e se o Foco está desligado.";
  }
  if (/android/i.test(platform)) {
    return "confira nas configurações do Android → Apps → navegador → Notificações.";
  }
  return "confira as configurações de notificação do sistema.";
}

/** Passo a passo para desbloquear, conforme o navegador */
export function unblockHint(): string {
  switch (detectBrowser()) {
    case "firefox":
      return "Clique no ícone à esquerda do endereço do site → Permissões → Notificações → Permitir. Depois recarregue a página.";
    case "edge":
    case "chrome":
      return "Clique no ícone à esquerda do endereço do site → Configurações do site → Notificações → Permitir. Depois recarregue a página.";
    case "safari":
      return "Abra Safari → Ajustes → Sites → Notificações e permita este site. Depois recarregue a página.";
    default:
      return "Libere as notificações deste site nas configurações do navegador e recarregue a página.";
  }
}
