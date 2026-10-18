"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

const TIME_ZONE = "America/Sao_Paulo";
const WEEKS = 6;
const DAY_MS = 86_400_000;
const WEEKDAY_INITIALS = ["S", "T", "Q", "Q", "S", "S", "D"];
// Escala sequencial de um tom só: o verde do app misturado à superfície, do mais apagado ao cheio
const LEVEL_MIX = [32, 55, 78, 100];

interface Cell {
  date: string;
  volume: number;
  future: boolean;
}

function todayKey() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/** Datas como meio-dia UTC: somar dias nunca cruza a virada por causa de fuso */
function parseKey(key: string) {
  return new Date(`${key}T12:00:00Z`);
}

function toKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function formatVolume(kg: number) {
  return kg >= 1000
    ? `${(kg / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} t`
    : `${Math.round(kg).toLocaleString("pt-BR")} kg`;
}

function formatDay(key: string, options: Intl.DateTimeFormatOptions) {
  return parseKey(key).toLocaleDateString("pt-BR", { timeZone: "UTC", ...options });
}

/** Semanas de segunda a domingo, da mais antiga (em cima) até a atual (embaixo) */
function buildWeeks(daily: { date: string; volume: number }[]) {
  const volumeByDay = new Map(daily.map((d) => [d.date, d.volume]));
  const today = todayKey();
  const todayDate = parseKey(today);
  const mondayOffset = (todayDate.getUTCDay() + 6) % 7;
  const firstMonday = todayDate.getTime() - (mondayOffset + (WEEKS - 1) * 7) * DAY_MS;

  return Array.from({ length: WEEKS }, (_, w) => {
    const days: Cell[] = Array.from({ length: 7 }, (_, d) => {
      const date = toKey(new Date(firstMonday + (w * 7 + d) * DAY_MS));
      return { date, volume: volumeByDay.get(date) ?? 0, future: date > today };
    });
    return { start: days[0].date, days, total: days.reduce((sum, d) => sum + d.volume, 0) };
  });
}

function levelOf(volume: number, max: number) {
  if (volume <= 0) return -1;
  return Math.min(LEVEL_MIX.length - 1, Math.floor((volume / max) * LEVEL_MIX.length));
}

function levelColor(level: number) {
  return `color-mix(in oklch, var(--primary) ${LEVEL_MIX[level]}%, var(--card))`;
}

/**
 * Mapa de calor do volume: cada quadrado é um dia, a cor diz quanto foi levantado.
 * Mostra constância (quais dias) e carga (quanto) juntas; dia de descanso fica neutro, não "faltando".
 */
export function VolumeHeatmap({ daily }: { daily: { date: string; volume: number }[] }) {
  const weeks = buildWeeks(daily);
  const max = Math.max(...weeks.flatMap((w) => w.days.map((d) => d.volume)), 1);
  const activeWeeks = weeks.filter((w) => w.total > 0).length;
  const total = weeks.reduce((sum, w) => sum + w.total, 0);
  const [selected, setSelected] = useState<string | null>(null);
  const selectedCell = weeks.flatMap((w) => w.days).find((d) => d.date === selected);

  return (
    <div>
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          <span className="tabular font-semibold text-foreground">{activeWeeks}</span> de {WEEKS} semanas com treino
        </p>
        <p className="tabular text-sm text-muted-foreground">
          Total <span className="font-semibold text-foreground">{formatVolume(total)}</span>
        </p>
      </div>

      <div
        role="group"
        aria-label={`Volume por dia nas últimas ${WEEKS} semanas`}
        className="grid grid-cols-[2.75rem_repeat(7,minmax(0,1fr))_3.5rem] items-center gap-x-1.5 gap-y-1.5"
      >
        <span aria-hidden />
        {WEEKDAY_INITIALS.map((initial, i) => (
          <span key={i} aria-hidden className="text-center text-[11px] font-medium text-muted-foreground">
            {initial}
          </span>
        ))}
        <span aria-hidden />

        {weeks.map((week, w) => {
          const isCurrent = w === weeks.length - 1;
          return (
            <div key={week.start} className="contents">
              <span
                className={cn(
                  "tabular text-[11px]",
                  isCurrent ? "font-semibold text-foreground" : "text-muted-foreground",
                )}
              >
                {isCurrent ? "Esta" : formatDay(week.start, { day: "2-digit", month: "2-digit" })}
              </span>
              {week.days.map((day) => {
                const level = levelOf(day.volume, max);
                const label = `${formatDay(day.date, { weekday: "long", day: "2-digit", month: "2-digit" })}: ${
                  day.future ? "ainda não chegou" : level < 0 ? "descanso" : formatVolume(day.volume)
                }`;
                return (
                  <button
                    key={day.date}
                    type="button"
                    aria-label={label}
                    aria-pressed={selected === day.date}
                    title={label}
                    disabled={day.future}
                    onClick={() => setSelected((s) => (s === day.date ? null : day.date))}
                    className={cn(
                      "aspect-square w-full rounded-[4px] outline-offset-2 transition-[box-shadow]",
                      day.future && "border border-dashed border-border",
                      !day.future && level < 0 && "bg-muted",
                      selected === day.date && "ring-2 ring-foreground ring-offset-2 ring-offset-card",
                    )}
                    style={level >= 0 ? { background: levelColor(level) } : undefined}
                  />
                );
              })}
              <span
                className={cn(
                  "tabular text-right text-xs",
                  week.total > 0 ? "font-semibold text-foreground" : "text-muted-foreground",
                )}
              >
                {week.total > 0 ? formatVolume(week.total) : "—"}
              </span>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex min-h-5 items-center justify-between gap-3 text-xs text-muted-foreground">
        <p aria-live="polite" className="min-w-0 truncate">
          {selectedCell ? (
            <>
              <span className="capitalize">{formatDay(selectedCell.date, { weekday: "short", day: "2-digit", month: "2-digit" })}</span>
              {" · "}
              <span className="tabular font-semibold text-foreground">
                {selectedCell.volume > 0 ? formatVolume(selectedCell.volume) : "descanso"}
              </span>
            </>
          ) : (
            "Toque em um dia para ver o volume"
          )}
        </p>
        <div className="flex shrink-0 items-center gap-1" aria-hidden>
          <span>Menos</span>
          <span className="h-2.5 w-2.5 rounded-[3px] bg-muted" />
          {LEVEL_MIX.map((_, level) => (
            <span key={level} className="h-2.5 w-2.5 rounded-[3px]" style={{ background: levelColor(level) }} />
          ))}
          <span>Mais</span>
        </div>
      </div>
    </div>
  );
}
