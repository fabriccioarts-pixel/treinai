"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Share2 } from "lucide-react";
import { BadgeIcon } from "@/components/profile/badge-icon";
import { PrIcon, XpIcon } from "@/components/ui/app-icon";
import { buttonVariants } from "@/components/ui/button";
import { Confetti } from "./confetti";
import { LevelBar } from "./level-bar";
import { renderShareImage } from "./share-image";
import { cn } from "@/lib/utils";
import type { SessionSummary } from "@/lib/gamification";

function formatDuration(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  return h > 0 ? `${h}h${String(m).padStart(2, "0")}` : `${m} min`;
}

/** Conta de 0 até o valor, para o XP "entrar" na tela */
function useCountUp(target: number, durationMs = 1200) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    // Com "reduzir movimento", o primeiro quadro já mostra o valor final
    const duration = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : durationMs;
    const start = performance.now();
    let frame = 0;
    const tick = (t: number) => {
      const p = duration === 0 ? 1 : Math.min(1, (t - start) / duration);
      setValue(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, durationMs]);
  return value;
}

export function WorkoutSummary({ summary }: { summary: SessionSummary }) {
  const xp = useCountUp(summary.xpGained);
  const leveledUp = summary.levelAfter.level > summary.levelBefore.level;
  // A barra começa no nível de antes e anima até o de agora
  const [level, setLevel] = useState(summary.levelBefore);
  const [sharing, startShare] = useTransition();
  const [shareError, setShareError] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setLevel(summary.levelAfter), 700);
    if ("vibrate" in navigator) navigator.vibrate(leveledUp ? [40, 60, 40, 60, 80] : [30, 40, 30]);
    return () => clearTimeout(timer);
  }, [summary.levelAfter, leveledUp]);

  function share() {
    setShareError(null);
    startShare(async () => {
      const blob = await renderShareImage(summary);
      if (!blob) {
        setShareError("Não foi possível gerar a imagem.");
        return;
      }
      const file = new File([blob], "treino-treinai.png", { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "Meu treino no Treinai" }).catch(() => {});
        return;
      }
      // Sem compartilhamento de arquivo (ex.: desktop): baixa a imagem
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.name;
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  const fade = (delay: number) => ({
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.4, delay, ease: [0.22, 1, 0.36, 1] as const },
  });

  return (
    <div className="space-y-5">
      <Confetti fireKey="summary" />

      <motion.header {...fade(0)} className="pt-2 text-center">
        <p className="text-xs font-semibold tracking-wide text-primary uppercase">Treino concluído</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground">{summary.workoutName}</h1>
      </motion.header>

      {/* XP ganho */}
      <motion.section
        {...fade(0.1)}
        className="rounded-3xl border border-primary/25 bg-gradient-to-b from-primary/15 to-card p-5 text-center"
      >
        <p className="tabular flex items-center justify-center gap-2 text-5xl font-bold tracking-tight text-primary">
          <XpIcon className="h-8 w-8" />+{xp} XP
        </p>
        <ul className="mt-3 space-y-1 text-sm">
          {summary.xpBreakdown.map((item) => (
            <li key={item.label} className="flex justify-between gap-3 text-muted-foreground">
              <span>{item.label}</span>
              <span className="tabular font-semibold text-foreground">+{item.amount}</span>
            </li>
          ))}
        </ul>
        <LevelBar {...level} className="mt-5 text-left" />
        {leveledUp && (
          <motion.p
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 1.1, type: "spring", stiffness: 260, damping: 14 }}
            className="mt-4 rounded-2xl bg-gold/15 px-4 py-3 text-base font-bold text-gold"
          >
            Subiu para o nível {summary.levelAfter.level}! 🎉
          </motion.p>
        )}
      </motion.section>

      {/* Números do treino */}
      <motion.section {...fade(0.2)} className="grid grid-cols-4 gap-2 text-center">
        {[
          { label: "Duração", value: formatDuration(summary.durationSeconds) },
          { label: "Séries", value: String(summary.sets) },
          { label: "Volume", value: `${(summary.volumeKg / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} t` },
          { label: "Constância", value: `${summary.streakDays}d` },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl bg-card p-3 ring-1 ring-foreground/10">
            <p className="tabular text-lg font-bold text-foreground">{s.value}</p>
            <p className="text-[11px] text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </motion.section>

      {summary.prs.length > 0 && (
        <motion.section {...fade(0.3)} className="rounded-2xl bg-card p-4 ring-1 ring-gold/25">
          <p className="mb-2 flex items-center gap-2 text-sm font-bold text-gold">
            <PrIcon className="h-4 w-4" />
            {summary.prs.length === 1 ? "Novo recorde" : `${summary.prs.length} recordes novos`}
          </p>
          <ul className="space-y-1 text-sm">
            {summary.prs.map((pr) => (
              <li key={pr.exerciseName} className="flex justify-between gap-3">
                <span className="text-foreground">{pr.exerciseName}</span>
                <span className="tabular font-semibold text-gold">
                  {pr.weight} kg × {pr.reps}
                </span>
              </li>
            ))}
          </ul>
        </motion.section>
      )}

      {summary.badges.length > 0 && (
        <motion.section {...fade(0.4)} className="space-y-2">
          {summary.badges.map((b) => (
            <div key={b.key} className="flex items-center gap-3 rounded-2xl bg-card p-3 ring-1 ring-accent/30">
              <BadgeIcon badgeKey={b.key} icon={b.icon} tier={b.tier} unlocked size={48} />
              <div>
                <p className="text-sm font-bold text-accent">Conquista desbloqueada!</p>
                <p className="text-sm text-foreground">
                  <span className="font-semibold">{b.label}</span> — {b.description}
                </p>
              </div>
            </div>
          ))}
        </motion.section>
      )}

      <motion.div {...fade(0.5)} className="space-y-2 pt-1">
        <button
          type="button"
          onClick={share}
          disabled={sharing}
          className={buttonVariants({
            variant: "outline",
            className: "h-12 w-full gap-2 rounded-2xl text-base font-semibold",
          })}
        >
          <Share2 className="h-4 w-4" />
          {sharing ? "Gerando imagem…" : "Compartilhar nos stories"}
        </button>
        {shareError && <p className="text-center text-sm text-destructive">{shareError}</p>}
        <Link
          href="/"
          className={cn(buttonVariants({ size: "lg" }), "h-12 w-full rounded-2xl text-base font-semibold")}
        >
          Voltar ao início
        </Link>
      </motion.div>
    </div>
  );
}
