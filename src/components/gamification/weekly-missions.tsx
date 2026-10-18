import Link from "next/link";
import { Check, ChevronRight, Shield } from "lucide-react";
import { LevelBar } from "./level-bar";
import { cn } from "@/lib/utils";
import type { Gamification, Mission } from "@/lib/gamification";

function MissionRow({ mission }: { mission: Mission }) {
  const pct = Math.min(100, Math.round((mission.progress / Math.max(1, mission.target)) * 100));
  const progressText =
    mission.unit === "kg"
      ? `${mission.progress.toLocaleString("pt-BR")} / ${mission.target.toLocaleString("pt-BR")} kg`
      : `${mission.progress}/${mission.target} ${mission.unit}`;

  return (
    <li className="flex items-center gap-3">
      <span
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full ring-1",
          mission.completed ? "bg-primary text-primary-foreground ring-primary" : "bg-muted/60 text-muted-foreground ring-border",
        )}
      >
        {mission.completed ? <Check className="h-4 w-4" strokeWidth={3} /> : <span className="tabular text-[11px] font-bold">{pct}%</span>}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <p className={cn("truncate text-sm font-medium", mission.completed ? "text-muted-foreground line-through" : "text-foreground")}>
            {mission.description}
          </p>
          <span
            className={cn(
              "tabular shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold",
              mission.completed ? "bg-primary/10 text-primary" : "bg-gold/10 text-gold",
            )}
          >
            +{mission.xp} XP
          </span>
        </div>
        {!mission.completed && (
          <div className="mt-1.5 flex items-center gap-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted" aria-hidden>
              <div className="h-full rounded-full bg-primary transition-[width] duration-700" style={{ width: `${pct}%` }} />
            </div>
            <span className="tabular shrink-0 text-[11px] text-muted-foreground">{progressText}</span>
          </div>
        )}
      </div>
    </li>
  );
}

/** Card da home: nível, missões da semana e escudos de constância */
export function WeeklyMissions({ data }: { data: Gamification }) {
  const { missions, shields } = data;
  const done = missions.missions.filter((m) => m.completed).length;

  return (
    <section
      aria-label="Missões da semana"
      className="rounded-3xl border border-border bg-card p-5 shadow-[inset_0_1px_0_oklch(1_0_0/0.06)]"
    >
      <Link href="/perfil/conquistas" className="group block">
        <LevelBar level={data.level} xpIntoLevel={data.xpIntoLevel} xpForNextLevel={data.xpForNextLevel} />
      </Link>

      <div className="mt-5 mb-3 flex items-baseline justify-between gap-2">
        <h2 className="text-base font-semibold tracking-tight text-foreground">
          Missões da semana <span className="tabular text-sm font-medium text-muted-foreground">· {done}/{missions.missions.length}</span>
        </h2>
        <span className="tabular text-xs text-muted-foreground">
          {missions.daysLeft === 1 ? "último dia" : `faltam ${missions.daysLeft} dias`}
        </span>
      </div>
      <ul className="space-y-3.5">
        {missions.missions.map((m) => (
          <MissionRow key={m.key} mission={m} />
        ))}
      </ul>

      <Link
        href="/perfil/conquistas"
        className="group mt-5 flex items-center gap-2.5 border-t border-border pt-3.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        <Shield className={cn("h-4 w-4 shrink-0", shields.available > 0 ? "fill-primary/25 text-primary" : "")} />
        <span className="flex-1">
          {shields.available > 0
            ? `${shields.available} ${shields.available === 1 ? "escudo guardado" : "escudos guardados"}: salva sua constância num dia perdido`
            : `Próximo escudo em ${shields.nextIn} ${shields.nextIn === 1 ? "dia" : "dias"} de constância`}
        </span>
        <ChevronRight className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5" />
      </Link>
    </section>
  );
}
