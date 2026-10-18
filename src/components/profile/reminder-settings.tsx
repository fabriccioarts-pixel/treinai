"use client";

import { useEffect, useState, useTransition } from "react";
import { Bell, BellOff } from "lucide-react";
import { enableRemindersAction, disableRemindersAction } from "@/app/actions/notification-actions";
import { cn } from "@/lib/utils";

type Status = "loading" | "unsupported" | "ios-install" | "denied" | "off" | "on";

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

async function registerServiceWorker() {
  return navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" });
}

const DESCRIPTION: Record<Status, string> = {
  loading: "Verificando…",
  unsupported: "Este navegador não recebe notificações.",
  "ios-install": "No iPhone, adicione o Treinai à Tela de Início (Compartilhar → Adicionar à Tela de Início) e ative por lá.",
  denied: "As notificações estão bloqueadas. Libere nas configurações do navegador para este site.",
  off: "Água ao longo do dia e o treino às 18h, com uma motivação extra.",
  on: "Ativados neste aparelho: água das 9h às 19h e treino às 18h.",
};

/** Liga/desliga os lembretes de água e de treino (Web Push) neste aparelho */
export function ReminderSettings() {
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    async function check() {
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !VAPID_PUBLIC_KEY) {
        setStatus(isIos() && !isStandalone() ? "ios-install" : "unsupported");
        return;
      }
      if (Notification.permission === "denied") {
        setStatus("denied");
        return;
      }
      const registration = await registerServiceWorker();
      const sub = await registration.pushManager.getSubscription();
      setStatus(sub ? "on" : "off");
    }
    check().catch(() => setStatus("unsupported"));
  }, []);

  function enable() {
    setError(null);
    startTransition(async () => {
      try {
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          setStatus(permission === "denied" ? "denied" : "off");
          return;
        }
        const registration = await registerServiceWorker();
        await navigator.serviceWorker.ready;
        const sub = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY!),
        });
        const json = sub.toJSON();
        const result = await enableRemindersAction({
          endpoint: sub.endpoint,
          p256dh: json.keys?.p256dh ?? "",
          auth: json.keys?.auth ?? "",
        });
        if (result.error) {
          await sub.unsubscribe();
          setError(result.error);
          return;
        }
        setStatus("on");
      } catch (err) {
        console.error("Erro ao ativar notificações:", err);
        setError("Não foi possível ativar as notificações neste aparelho.");
      }
    });
  }

  function disable() {
    setError(null);
    startTransition(async () => {
      const registration = await navigator.serviceWorker.getRegistration();
      const sub = await registration?.pushManager.getSubscription();
      if (sub) {
        await disableRemindersAction(sub.endpoint);
        await sub.unsubscribe();
      }
      setStatus("off");
    });
  }

  const on = status === "on";
  const canToggle = status === "on" || status === "off";

  return (
    <div className="flex items-center gap-3.5 rounded-xl bg-card px-4 py-3.5 ring-1 ring-foreground/10">
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border",
          on ? "border-primary/30 bg-primary/10 text-primary" : "border-border/50 bg-secondary/50 text-muted-foreground",
        )}
      >
        {status === "denied" ? <BellOff className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground/90">Lembretes</p>
        <p className="text-xs text-muted-foreground">{error ?? DESCRIPTION[status]}</p>
      </div>
      {canToggle && (
        <button
          type="button"
          role="switch"
          aria-checked={on}
          aria-label="Lembretes de água e de treino"
          disabled={pending}
          onClick={on ? disable : enable}
          className={cn(
            "relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-50",
            on ? "bg-primary" : "bg-muted",
          )}
        >
          <span
            className={cn(
              "absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
              on && "translate-x-5",
            )}
          />
        </button>
      )}
    </div>
  );
}
