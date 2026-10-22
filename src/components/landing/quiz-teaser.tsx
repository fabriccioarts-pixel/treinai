"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { STEPS } from "@/lib/diagnostico";
import { trackSpotlight } from "@/lib/spotlight";

/*
 * Primeira pergunta do diagnóstico dentro da landing. A resposta segue para /diagnostico?sexo=…,
 * que grava a escolha e abre direto na segunda pergunta (com as utm_* da visita, se houver).
 */

const FIRST = STEPS[0];

export function QuizTeaser() {
  const router = useRouter();
  if (FIRST.kind !== "single") return null;

  function answer(value: string) {
    const params = new URLSearchParams(window.location.search);
    const utm = [...params].filter(([k]) => k.startsWith("utm_"));
    const query = new URLSearchParams([["sexo", value], ...utm]);
    router.push(`/diagnostico?${query.toString()}`);
  }

  const photos = FIRST.options.filter((o) => o.image);
  const others = FIRST.options.filter((o) => !o.image);

  return (
    <div
      className="rounded-[1.75rem] border border-white/10 bg-card/70 p-4 shadow-[0_40px_80px_-48px_color-mix(in_oklch,var(--primary)_55%,transparent)] backdrop-blur-sm sm:p-5"
      onPointerMove={trackSpotlight}
    >
      <div className="flex items-center gap-3">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
          <div className="h-full w-[5%] rounded-full bg-primary" />
        </div>
        <span className="tabular text-xs text-muted-foreground">1/{STEPS.length}</span>
      </div>
      <p className="mt-5 text-xs font-semibold tracking-wide text-primary uppercase">{FIRST.section}</p>
      <h3 className="mt-1.5 text-xl leading-snug font-bold text-foreground">{FIRST.title}</h3>

      <div className="mt-4 grid grid-cols-2 gap-2.5">
        {photos.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => answer(o.value)}
            className="group relative aspect-[3/4] overflow-hidden rounded-2xl border border-border/60 text-left transition-all hover:border-primary/60 active:scale-[0.98]"
          >
            <Image
              src={o.image!}
              alt=""
              fill
              sizes="(min-width: 1024px) 230px, 45vw"
              className="object-cover transition-transform duration-500 group-hover:scale-[1.05]"
            />
            <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/85 to-transparent" />
            <span className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 p-3.5 text-base font-semibold text-white">
              {o.label}
              <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
            </span>
          </button>
        ))}
      </div>
      {others.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => answer(o.value)}
          className="spotlight mt-2.5 flex w-full items-center justify-between rounded-2xl border border-border/60 bg-card p-4 text-left text-base font-medium text-foreground transition-all hover:border-border active:scale-[0.98]"
        >
          {o.label}
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
        </button>
      ))}
    </div>
  );
}
