import type { ComponentType, SVGProps } from "react";
import { Ellipsis, EllipsisVertical, Share, SquarePlus, Check, Compass } from "lucide-react";
import type { InstallMode } from "@/lib/install-app";

type Icon = ComponentType<SVGProps<SVGSVGElement>>;

interface Step {
  icon: Icon;
  text: string;
}

/** Passo a passo de cada navegador; "prompt" e "installed" não precisam de instrução */
export const INSTALL_STEPS: Partial<Record<InstallMode, Step[]>> = {
  ios: [
    { icon: Share, text: "Toque no botão Compartilhar, o quadrado com a seta para cima, na barra do Safari." },
    { icon: SquarePlus, text: "Role a lista e toque em “Adicionar à Tela de Início”." },
    { icon: Check, text: "Toque em “Adicionar”. O Treinai aparece junto dos seus apps." },
  ],
  android: [
    { icon: EllipsisVertical, text: "Toque no menu do navegador, os três pontinhos no canto da tela." },
    { icon: SquarePlus, text: "Toque em “Instalar app” ou “Adicionar à tela inicial”." },
    { icon: Check, text: "Confirme. O Treinai aparece junto dos seus apps." },
  ],
  "in-app": [
    { icon: Ellipsis, text: "Você abriu o link dentro de outro app. Toque no menu (⋯ ou ⋮) no canto da tela." },
    { icon: Compass, text: "Escolha “Abrir no navegador” (Safari no iPhone, Chrome no Android)." },
    { icon: SquarePlus, text: "Lá, entre na sua conta e siga o convite para instalar." },
  ],
};

export function InstallSteps({ mode }: { mode: InstallMode }) {
  const steps = INSTALL_STEPS[mode];
  if (!steps) return null;

  return (
    <ol className="space-y-2.5">
      {steps.map(({ icon: StepIcon, text }, i) => (
        <li key={i} className="flex items-start gap-3">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-border bg-secondary/60 text-primary">
            <StepIcon className="h-4 w-4" aria-hidden />
          </span>
          <p className="pt-1 text-xs leading-relaxed text-foreground/85">
            <span className="sr-only">Passo {i + 1}: </span>
            {text}
          </p>
        </li>
      ))}
    </ol>
  );
}
