"use client";

import { useEffect, useState, useTransition } from "react";
import { BellRing, Droplets, Dumbbell, Sun, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { TOUR_CLOSED_EVENT, tourBlocksPopups } from "@/components/tour/app-tour";
import { enableNotifications, getNotificationState } from "@/lib/notifications";

const DISMISS_KEY = "treinai:notificacoes-convite-fechado";
/** O pop-up aparece uma vez por aparelho; depois fica só o card da home */
const POPUP_SEEN_KEY = "treinai:notificacoes-popup-visto";
/** Depois de fechar, o convite volta a aparecer só depois de alguns dias */
const DISMISS_DAYS = 7;
/** Respiro entre a home carregar (ou o tour fechar) e o pop-up abrir */
const POPUP_DELAY_MS = 1200;

const REMINDERS = [
  { icon: Sun, text: "Bom dia ao acordar, com o plano do dia" },
  { icon: Droplets, text: "Água ao longo do dia, até bater a meta" },
  { icon: Dumbbell, text: "O treino às 18h, para não deixar passar" },
];

function dismissedRecently() {
  try {
    const at = Number(localStorage.getItem(DISMISS_KEY));
    return at > 0 && Date.now() - at < DISMISS_DAYS * 86_400_000;
  } catch {
    return false;
  }
}

function popupSeen() {
  try {
    return localStorage.getItem(POPUP_SEEN_KEY) === "1";
  } catch {
    // Sem armazenamento, o pop-up abriria a cada visita: melhor ficar só no card
    return true;
  }
}

function remember(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Sem armazenamento: o convite só volta na próxima visita
  }
}

/**
 * Convite para ativar os lembretes com um toque. Só aparece quando o navegador ainda não perguntou
 * (nem permitido, nem bloqueado) e a pessoa não fechou o convite nos últimos dias.
 * Na primeira vez é um pop-up, depois do tour de boas-vindas; nas outras, um card na home.
 */
export function EnableNotificationsPrompt() {
  const [eligible, setEligible] = useState(false);
  const [popupOpen, setPopupOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (dismissedRecently()) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const openPopup = () => {
      timer = setTimeout(() => setPopupOpen(true), POPUP_DELAY_MS);
    };
    getNotificationState()
      .then((state) => {
        const canAsk = state === "off" && Notification.permission === "default";
        setEligible(canAsk);
        if (!canAsk || popupSeen()) return;
        // O tour abre sozinho na primeira visita: o pop-up espera ele fechar
        if (tourBlocksPopups()) window.addEventListener(TOUR_CLOSED_EVENT, openPopup, { once: true });
        else openPopup();
      })
      .catch(() => null);
    return () => {
      clearTimeout(timer);
      window.removeEventListener(TOUR_CLOSED_EVENT, openPopup);
    };
  }, []);

  function dismiss() {
    setEligible(false);
    setPopupOpen(false);
    remember(POPUP_SEEN_KEY, "1");
    remember(DISMISS_KEY, String(Date.now()));
  }

  function enable() {
    setMessage(null);
    remember(POPUP_SEEN_KEY, "1");
    startTransition(async () => {
      const result = await enableNotifications();
      if (result.state === "on") {
        setMessage("Pronto! Vou te lembrar da água e do treino. 💪");
        setTimeout(() => {
          setPopupOpen(false);
          setEligible(false);
        }, 2500);
      } else if (result.state === "denied") {
        setMessage("Notificações bloqueadas. Dá para liberar depois em Perfil → Lembretes.");
      } else if (result.error) {
        setMessage(result.error);
      }
    });
  }

  function onPopupChange(open: boolean) {
    if (open) return setPopupOpen(true);
    // Fechar pelo X, pelo Esc ou tocando fora conta como "agora não"
    if (!message) return dismiss();
    // Já respondeu (ativou, bloqueou ou deu erro): não repete o assunto no card
    setPopupOpen(false);
    setEligible(false);
  }

  if (!eligible) return null;

  if (popupOpen || !popupSeen()) {
    return (
      <Dialog open={popupOpen} onOpenChange={onPopupChange}>
        <DialogContent className="gap-5 p-6 sm:max-w-sm">
          <div className="flex flex-col items-center text-center">
            <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 text-primary ring-1 ring-primary/30">
              <BellRing className="h-7 w-7" aria-hidden />
            </span>
            <DialogTitle className="text-lg font-semibold">Quer que eu te lembre?</DialogTitle>
            <DialogDescription className="mt-1.5 text-sm leading-relaxed">
              {message ?? "Três lembretes por dia, no máximo. Você desliga quando quiser em Perfil → Lembretes."}
            </DialogDescription>
          </div>

          {!message && (
            <ul className="space-y-2.5">
              {REMINDERS.map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-center gap-3 text-sm text-foreground/90">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-secondary/60 text-primary">
                    <Icon className="h-4 w-4" aria-hidden />
                  </span>
                  {text}
                </li>
              ))}
            </ul>
          )}

          {!message ? (
            <div className="space-y-2">
              <Button onClick={enable} disabled={pending} className="h-11 w-full text-sm font-semibold">
                {pending ? "Ativando…" : "Ativar lembretes"}
              </Button>
              <Button variant="ghost" onClick={dismiss} className="h-10 w-full text-sm text-muted-foreground">
                Agora não
              </Button>
              <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
                O navegador vai pedir permissão: toque em “Permitir”.
              </p>
            </div>
          ) : (
            <Button variant="outline" onClick={() => onPopupChange(false)} className="h-10 w-full text-sm">
              Fechar
            </Button>
          )}
        </DialogContent>
      </Dialog>
    );
  }

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
