"use client";

import { useState, useTransition } from "react";
import { Lock, ShieldCheck, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { setBodyConsentAction } from "@/app/actions/body-actions";
import { cn } from "@/lib/utils";

const PROMISES = [
  { icon: Lock, text: "Só você vê. As fotos ficam guardadas de forma privada e não aparecem em nenhum lugar público do app." },
  { icon: Sparkles, text: "A IA só recebe as fotos quando você pede uma análise, e só se você autorizar abaixo." },
  { icon: Trash2, text: "Você apaga uma foto ou tudo quando quiser. Revogar a autorização apaga todas as fotos." },
  { icon: ShieldCheck, text: "Antes de enviar, o app refaz a foto no seu celular e tira dados escondidos, como a localização." },
];

function Check({
  checked,
  onChange,
  children,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-card px-3.5 py-3 transition-colors has-[:checked]:border-primary/50">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--primary)]"
      />
      <span className="text-sm leading-relaxed text-foreground/90">{children}</span>
    </label>
  );
}

/**
 * Consentimento LGPD para fotos do corpo (dado sensível, art. 11): específico, informado e separado
 * para guardar as fotos e para a análise por IA. Sem marcar, nada é enviado.
 */
export function BodyConsent({ className }: { className?: string }) {
  const [photos, setPhotos] = useState(false);
  const [ai, setAi] = useState(true);
  const [adult, setAdult] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await setBodyConsentAction({ photos: true, ai, adult });
      if (result.error) setError(result.error);
    });
  }

  return (
    <div className={cn("space-y-6", className)}>
      <section className="rounded-3xl border border-border bg-card p-5">
        <h2 className="text-lg font-semibold text-foreground">Antes de começar</h2>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
          Foto do corpo é um dado pessoal sensível pela LGPD. Por isso o app só guarda com a sua autorização, e só para
          você acompanhar a sua evolução.
        </p>
        <ul className="mt-4 space-y-3">
          {PROMISES.map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-start gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/12 text-primary">
                <Icon className="h-4 w-4" aria-hidden />
              </span>
              <p className="pt-1 text-sm leading-relaxed text-foreground/85">{text}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-2.5" aria-label="Autorizações">
        <Check checked={photos} onChange={setPhotos}>
          <strong className="font-semibold text-foreground">Autorizo guardar minhas fotos do corpo</strong> para
          acompanhar minha evolução no Treinai. <span className="text-muted-foreground">(obrigatório)</span>
        </Check>
        <Check checked={ai} onChange={setAi}>
          <strong className="font-semibold text-foreground">Autorizo a análise por IA</strong>: quando eu pedir, as
          fotos daquele dia são enviadas a um serviço de inteligência artificial parceiro para avaliar o shape e sugerir um
          treino. <span className="text-muted-foreground">(opcional, dá para mudar depois)</span>
        </Check>
        <Check checked={adult} onChange={setAdult}>
          Tenho <strong className="font-semibold text-foreground">18 anos ou mais</strong>.
        </Check>
      </section>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <Button
        type="button"
        onClick={submit}
        disabled={!photos || !adult || pending}
        className="h-12 w-full rounded-xl text-base font-semibold"
      >
        {pending ? "Salvando…" : "Concordo e quero começar"}
      </Button>
      <p className="text-center text-xs leading-relaxed text-muted-foreground">
        Você pode revogar essas autorizações e apagar tudo a qualquer momento, nesta mesma tela.
      </p>
    </div>
  );
}
