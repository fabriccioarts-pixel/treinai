"use client";

import { useEffect, useState, useTransition } from "react";
import { BellRing, X } from "lucide-react";
import { enableNotifications, getNotificationState } from "@/lib/notifications";

const DISMISS_KEY = "treinai:notificacoes-convite-fechado";
/** Depois de fechar, o convite volta a aparecer só depois de alguns dias */
const DISMISS_DAYS = 7;

function dismissedRecently() {
  try {
    const at = Number(localStorage.getItem(DISMISS_KEY));
    return at > 0 && Date.now() - at < DISMISS_DAYS * 86_400_000;
  } catch {
    return false;
  }
}

/**
 * Convite na home para ativar os lembretes com um toque. Só aparece quando o navegador ainda não
 * perguntou (nem permitido, nem bloqueado) e a pessoa não fechou o convite nos últimos dias.
 */
export function EnableNotificationsPrompt() {
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (dismissedRecently()) return;
    getNotificationState()
      .then((state) => setVisible(state === "off" && Notification.permission === "default"))
      .catch(() => null);
  }, []);

  function dismiss() {
    setVisible(false);
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      // Sem armazenamento: o convite só volta na próxima visita
    }
  }

  function enable() {
    setMessage(null);
    startTransition(async () => {
      const result = await enableNotifications();
      if (result.state === "on") {
        setMessage("Pronto! Vou te lembrar da água e do treino. 💪");
        setTimeout(() => setVisible(false), 3000);
      } else if (result.state === "denied") {
        setMessage("Notificações bloqueadas. Dá para liberar depois em Perfil → Lembretes.");
      } else if (result.error) {
        setMessage(result.error);
      }
    });
  }

  if (!visible) return null;

  return (
    <section
      aria-label="Ativar lembretes"
      className="relative flex items-start gap-3 rounded-2xl border border-primary/25 bg-primary/5 p-4"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
        <BellRing className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1 pr-6">
        <p className="text-sm font-semibold text-foreground">Quer que eu te lembre?</p>
        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
          {message ?? "Bom dia ao acordar, água ao longo do dia e o treino às 18h, com uma motivação para não deixar passar."}
        </p>
        {!message && (
          <button
            type="button"
            onClick={enable}
            disabled={pending}
            className="cta-shine mt-3 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-60"
          >
            {pending ? "Ativando…" : "Ativar lembretes"}
          </button>
        )}
      </div>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Agora não"
        className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted/50 hover:text-foreground"
      >
        <X className="h-4 w-4" />
      </button>
    </section>
  );
}
