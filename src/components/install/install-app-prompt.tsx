"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { X } from "lucide-react";
import { InstallSteps } from "@/components/install/install-steps";
import { promptInstall, useInstallMode } from "@/lib/install-app";

const DISMISS_KEY = "treinai:instalar-convite-fechado";
/** Depois de "Agora não", o convite volta só depois de alguns dias */
const DISMISS_DAYS = 5;

function dismissedRecently() {
  try {
    const at = Number(localStorage.getItem(DISMISS_KEY));
    return at > 0 && Date.now() - at < DISMISS_DAYS * 86_400_000;
  } catch {
    return false;
  }
}

/**
 * Convite na home para colocar o Treinai na tela inicial. Some quando o app já está instalado
 * ou no computador sem suporte; no iPhone explica o caminho pelo Safari (é lá que os lembretes funcionam).
 */
export function InstallAppPrompt() {
  const mode = useInstallMode();
  // Lido uma vez: o localStorage não existe no servidor, e o convite só aparece depois da hidratação
  const [dismissed, setDismissed] = useState(() => typeof window !== "undefined" && dismissedRecently());
  const [showSteps, setShowSteps] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!mode || mode === "installed" || mode === "unsupported" || dismissed) return null;

  function dismiss() {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      // Sem armazenamento: o convite só volta na próxima visita
    }
  }

  function install() {
    startTransition(async () => {
      const outcome = await promptInstall();
      if (outcome === "accepted") setMessage("Pronto! Agora é só abrir o Treinai pela tela inicial.");
      else if (outcome === "unavailable") setShowSteps(true);
    });
  }

  const description =
    mode === "ios"
      ? "Abre em tela cheia, como um app, e é o único jeito de receber os lembretes no iPhone."
      : mode === "in-app"
        ? "Para instalar, abra o Treinai no navegador do celular. Leva 10 segundos."
        : "Abre em tela cheia, como um app, direto do seu celular. Sem loja e sem ocupar espaço.";

  return (
    <section
      aria-label="Instalar o app"
      data-tour="instalar"
      className="relative rounded-2xl border border-primary/25 bg-primary/5 p-4"
    >
      <div className="flex items-start gap-3 pr-6">
        <Image
          src="/logo-icon.png"
          alt=""
          width={40}
          height={40}
          className="h-10 w-10 shrink-0 rounded-xl ring-1 ring-primary/30"
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">Coloque o Treinai na tela inicial</p>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{message ?? description}</p>
        </div>
      </div>

      {!message && (
        <>
          {showSteps && (
            <div className="mt-4">
              <InstallSteps mode={mode === "prompt" ? "android" : mode} />
            </div>
          )}
          {mode === "prompt" ? (
            <button
              type="button"
              onClick={install}
              disabled={pending}
              className="cta-shine mt-3 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-60"
            >
              {pending ? "Abrindo…" : "Instalar app"}
            </button>
          ) : (
            !showSteps && (
              <button
                type="button"
                onClick={() => setShowSteps(true)}
                className="cta-shine mt-3 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground"
              >
                Ver como instalar
              </button>
            )
          )}
        </>
      )}

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
