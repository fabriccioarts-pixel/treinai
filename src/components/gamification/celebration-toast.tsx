"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Shield, X } from "lucide-react";
import { BadgeIcon } from "@/components/profile/badge-icon";
import { XpIcon } from "@/components/ui/app-icon";
import { Confetti } from "./confetti";
import type { Gamification } from "@/lib/gamification";

const AUTO_CLOSE_MS = 9000;

/**
 * Comemora o que aconteceu desde a última visita: missões fechadas, conquistas novas e escudo usado.
 * O worker só devolve esses itens uma vez, então o aviso não se repete.
 */
export function CelebrationToast({
  missions,
  badges,
  shieldsUsed,
}: {
  missions: Gamification["missions"]["justCompleted"];
  badges: Gamification["newBadges"];
  shieldsUsed: number;
}) {
  const hasNews = missions.length > 0 || badges.length > 0 || shieldsUsed > 0;
  const [open, setOpen] = useState(hasNews);
  const celebrate = missions.length > 0 || badges.length > 0;

  useEffect(() => {
    if (!open) return;
    if (celebrate && "vibrate" in navigator) navigator.vibrate([30, 40, 30]);
    const timer = setTimeout(() => setOpen(false), AUTO_CLOSE_MS);
    return () => clearTimeout(timer);
  }, [open, celebrate]);

  if (!hasNews) return null;
  const missionXp = missions.reduce((sum, m) => sum + m.xp, 0);

  return (
    <>
      {celebrate && <Confetti fireKey={open ? "home" : null} />}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 top-0 z-50 mx-auto max-w-md px-4 pt-[calc(env(safe-area-inset-top)+12px)] sm:max-w-lg"
      >
        <AnimatePresence>
          {open && (
            <motion.div
              role="status"
              initial={{ opacity: 0, y: -16, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.97 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="pointer-events-auto relative space-y-3 rounded-2xl bg-card p-4 text-sm shadow-[inset_0_0_0_1px_color-mix(in_oklch,var(--primary),transparent_60%),0_18px_40px_-20px_rgb(0_0_0/0.8)]"
            >
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Fechar"
                className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>

              {missions.length > 0 && (
                <div className="flex items-start gap-3 pr-6">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gold/15 text-gold">
                    <XpIcon className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="font-bold text-gold">
                      {missions.length === 1 ? "Missão cumprida!" : `${missions.length} missões cumpridas!`} +{missionXp} XP
                    </p>
                    <p className="text-foreground/90">{missions.map((m) => m.title).join(" · ")}</p>
                  </div>
                </div>
              )}

              {badges.map((b) => (
                <div key={b.key} className="flex items-start gap-3 pr-6">
                  <BadgeIcon badgeKey={b.key} icon={b.icon} tier={b.tier} unlocked size={40} />
                  <div>
                    <p className="font-bold text-accent">Conquista desbloqueada!</p>
                    <p className="text-foreground/90">
                      <span className="font-semibold">{b.label}</span> — {b.description}
                    </p>
                  </div>
                </div>
              ))}

              {shieldsUsed > 0 && (
                <div className="flex items-start gap-3 pr-6">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                    <Shield className="h-5 w-5 fill-primary/25" />
                  </span>
                  <div>
                    <p className="font-bold text-primary">Seu escudo salvou a constância!</p>
                    <p className="text-foreground/90">
                      {shieldsUsed === 1 ? "1 escudo foi usado" : `${shieldsUsed} escudos foram usados`} nos dias sem treino. Treine
                      hoje para não depender dele de novo.
                    </p>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
