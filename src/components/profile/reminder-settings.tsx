"use client";

import { useEffect, useState, useTransition } from "react";
import { Bell, BellOff } from "lucide-react";
import {
  disableNotifications,
  enableNotifications,
  getNotificationState,
  showLocalTestNotification,
  unblockHint,
  type NotificationState,
} from "@/lib/notifications";
import { cn } from "@/lib/utils";

type Status = NotificationState | "loading";

const DESCRIPTION: Record<Exclude<Status, "denied">, string> = {
  loading: "Verificando…",
  unsupported: "Este navegador não recebe notificações.",
  "ios-install":
    "No iPhone, adicione o Treinai à Tela de Início (Compartilhar → Adicionar à Tela de Início) e ative por lá.",
  off: "Bom dia ao acordar, água ao longo do dia e o treino às 18h, com uma motivação extra.",
  on: "Ativados neste aparelho: bom dia ao acordar, água das 9h às 19h e treino às 18h.",
};

/** Liga/desliga os lembretes de água e de treino (Web Push) neste aparelho */
export function ReminderSettings() {
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [testing, startTest] = useTransition();
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  useEffect(() => {
    getNotificationState()
      .then(setStatus)
      .catch(() => setStatus("unsupported"));
  }, []);

  function enable() {
    setError(null);
    startTransition(async () => {
      const result = await enableNotifications();
      setStatus(result.state);
      if (result.error) setError(result.error);
    });
  }

  function disable() {
    setError(null);
    setTestResult(null);
    startTransition(async () => setStatus(await disableNotifications()));
  }

  function sendTest() {
    setTestResult(null);
    startTest(async () => setTestResult(await showLocalTestNotification()));
  }

  const on = status === "on";
  const canToggle = status === "on" || status === "off";

  return (
    <div className="rounded-xl bg-card px-4 py-3.5 ring-1 ring-foreground/10">
      <div className="flex items-center gap-3.5">
        <div
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border",
            on
              ? "border-primary/30 bg-primary/10 text-primary"
              : "border-border/50 bg-secondary/50 text-muted-foreground",
          )}
        >
          {status === "denied" ? <BellOff className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground/90">Lembretes</p>
          <p className="text-xs text-muted-foreground">
            {error ??
              (status === "denied"
                ? "As notificações estão bloqueadas neste navegador."
                : DESCRIPTION[status])}
          </p>
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

      {/* Bloqueado: o site não pode pedir de novo, só a pessoa libera no navegador */}
      {status === "denied" && (
        <div className="mt-3 border-t border-border/50 pt-3 text-xs leading-relaxed text-muted-foreground">
          <p className="font-semibold text-foreground">Como liberar</p>
          <p className="mt-1">{unblockHint()}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-2 font-semibold text-primary hover:underline"
          >
            Já liberei, recarregar
          </button>
        </div>
      )}

      {/* Teste local: não passa pelo servidor, então mostra na hora se o aparelho está escondendo as notificações */}
      {on && (
        <div className="mt-2 pl-[46px]">
          <button
            type="button"
            disabled={testing}
            onClick={sendTest}
            className="text-xs font-medium text-primary hover:underline disabled:opacity-50"
          >
            {testing ? "Enviando…" : "Enviar uma notificação de teste"}
          </button>
          {testResult && (
            <p className={cn("mt-1 text-xs leading-relaxed", testResult.ok ? "text-primary" : "text-muted-foreground")}>
              {testResult.message}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
