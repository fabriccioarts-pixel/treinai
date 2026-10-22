"use client";

import { useState, useTransition } from "react";
import { CircleCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { InstallSteps } from "@/components/install/install-steps";
import { promptInstall, useInstallMode, type InstallMode } from "@/lib/install-app";

const GUIDES: { mode: InstallMode; title: string }[] = [
  { mode: "ios", title: "No iPhone (Safari)" },
  { mode: "android", title: "No Android (Chrome)" },
];

/** Guia completo do Perfil: o caminho deste aparelho primeiro e, embaixo, o do outro sistema */
export function InstallGuide() {
  const mode = useInstallMode();
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function install() {
    startTransition(async () => {
      const outcome = await promptInstall();
      setMessage(
        outcome === "accepted"
          ? "Pronto! Agora é só abrir o Treinai pela tela inicial."
          : outcome === "dismissed"
            ? "Sem problema. Quando quiser, é só voltar aqui."
            : "O navegador não ofereceu a instalação agora. Siga o passo a passo abaixo.",
      );
    });
  }

  if (mode === null) return null;

  if (mode === "installed") {
    return (
      <Card className="flex-row items-center gap-3 p-4">
        <CircleCheck className="h-6 w-6 shrink-0 text-primary" aria-hidden />
        <p className="text-sm leading-relaxed text-foreground">
          O Treinai já está instalado e aberto como app neste aparelho.
        </p>
      </Card>
    );
  }

  // O caminho deste aparelho vem primeiro; "prompt" no Android ainda mostra o passo a passo como reserva
  const current = mode === "prompt" || mode === "unsupported" ? null : mode;
  const others = GUIDES.filter((g) => g.mode !== current);

  return (
    <div className="space-y-6">
      {mode === "prompt" && (
        <Card className="gap-3 p-4">
          <p className="text-sm leading-relaxed text-foreground">
            Seu navegador instala o Treinai com um toque. Ele abre em tela cheia, como um app.
          </p>
          <Button onClick={install} disabled={pending} className="h-11 w-full text-sm font-semibold">
            {pending ? "Abrindo…" : "Instalar app"}
          </Button>
          {message && <p className="text-xs leading-relaxed text-muted-foreground">{message}</p>}
        </Card>
      )}

      {current && (
        <section>
          <h2 className="mb-2 px-1 text-sm font-semibold text-muted-foreground">
            {current === "in-app" ? "Abra no navegador primeiro" : "Neste aparelho"}
          </h2>
          <Card className="p-4">
            <InstallSteps mode={current} />
          </Card>
        </section>
      )}

      {others.map((g) => (
        <section key={g.mode}>
          <h2 className="mb-2 px-1 text-sm font-semibold text-muted-foreground">{g.title}</h2>
          <Card className="p-4">
            <InstallSteps mode={g.mode} />
          </Card>
        </section>
      ))}
    </div>
  );
}
