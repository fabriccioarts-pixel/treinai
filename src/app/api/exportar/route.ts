import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/auth";
import { workerApi } from "@/lib/worker-api";
import { MUSCLE_GROUP_LABEL } from "@/lib/muscle-groups";
import type { MuscleGroup } from "@/lib/types";

const TIME_ZONE = "America/Sao_Paulo";
// Cobre anos de treino; a exportação é rara, então vale buscar tudo de uma vez
const SESSION_LIMIT = 2000;
// Sessões buscadas em paralelo: rápido sem martelar o worker
const CONCURRENCY = 8;

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

const localDate = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: TIME_ZONE });
const localTime = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: TIME_ZONE });
const fileDate = () => new Date().toLocaleDateString("en-CA", { timeZone: TIME_ZONE });

/** Campo de CSV com ";" (padrão do Excel em português): aspas só quando precisa */
function csvField(value: string | number) {
  const text = typeof value === "number" ? value.toLocaleString("pt-BR", { maximumFractionDigits: 2, useGrouping: false }) : value;
  return /[;"\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

async function collect(userId: string) {
  const [{ exercises }, { workouts }, { sessions }, records, goals, badges, profile] = await Promise.all([
    workerApi.listExercises(userId),
    workerApi.listWorkouts(userId),
    workerApi.listSessions(userId, { limit: SESSION_LIMIT }),
    workerApi.listPersonalRecords(userId).catch(() => ({ personalRecords: [] })),
    workerApi.listGoals(userId).catch(() => ({ goals: [] })),
    workerApi.getBadges(userId).catch(() => null),
    workerApi.getProfile(userId).catch(() => null),
  ]);
  const exerciseById = new Map(exercises.map((e) => [e.id, e]));

  const [workoutDetails, sessionSets] = await Promise.all([
    mapLimit(workouts, CONCURRENCY, (w) => workerApi.getWorkout(w.id).then((r) => r.workout).catch(() => null)),
    mapLimit(sessions, CONCURRENCY, (s) => workerApi.listSessionSets(s.id).then((r) => r.sets).catch(() => [])),
  ]);

  // Mais antigas primeiro: é a ordem natural para quem abre numa planilha
  const sessionsWithSets = sessions
    .map((s, i) => ({ ...s, sets: sessionSets[i] }))
    .sort((a, b) => a.started_at.localeCompare(b.started_at));

  return { exerciseById, workoutDetails, sessionsWithSets, records, goals, badges, profile };
}

function buildCsv(data: Awaited<ReturnType<typeof collect>>) {
  const header = ["Data", "Hora", "Treino", "Exercício", "Grupo muscular", "Série", "Carga (kg)", "Repetições", "Volume (kg)"];
  const rows = [header.join(";")];
  for (const session of data.sessionsWithSets) {
    if (!session.finished_at) continue;
    const started = new Date(session.started_at);
    const ordered = [...session.sets].sort(
      (a, b) => a.exercise_id.localeCompare(b.exercise_id) || a.set_number - b.set_number,
    );
    for (const set of ordered) {
      const exercise = data.exerciseById.get(set.exercise_id);
      const group = exercise ? (MUSCLE_GROUP_LABEL[exercise.muscle_group as MuscleGroup] ?? exercise.muscle_group) : "";
      rows.push(
        [
          localDate.format(started),
          localTime.format(started),
          session.workout_name,
          exercise?.name ?? set.exercise_id,
          group,
          set.set_number,
          set.weight,
          set.reps,
          set.weight * set.reps,
        ]
          .map(csvField)
          .join(";"),
      );
    }
  }
  // BOM: sem ele o Excel abre os acentos quebrados
  return `﻿${rows.join("\r\n")}\r\n`;
}

function buildJson(data: Awaited<ReturnType<typeof collect>>, user: { name?: string | null; email?: string | null }) {
  const exerciseName = (id: string) => data.exerciseById.get(id)?.name ?? id;
  return {
    exportadoEm: new Date().toISOString(),
    usuario: { nome: user.name ?? null, email: user.email ?? null },
    perfilCorporal: data.profile && "targets" in data.profile ? data.profile : null,
    treinos: data.workoutDetails.filter(Boolean).map((w) => ({
      id: w!.id,
      nome: w!.name,
      descricao: w!.description,
      exercicios: w!.exercises.map((e) => ({
        exercicio: e.exercise_name,
        series: e.target_sets,
        repeticoes: `${e.target_reps_min}-${e.target_reps_max}`,
        descansoSegundos: e.rest_time,
        observacoes: e.notes,
      })),
    })),
    sessoes: data.sessionsWithSets.map((s) => ({
      id: s.id,
      treino: s.workout_name,
      inicio: s.started_at,
      fim: s.finished_at,
      duracaoSegundos: s.duration_seconds,
      series: s.sets.map((set) => ({
        exercicio: exerciseName(set.exercise_id),
        serie: set.set_number,
        cargaKg: set.weight,
        repeticoes: set.reps,
      })),
    })),
    recordes: data.records.personalRecords.map((r) => ({
      exercicio: r.exercise_name,
      cargaKg: r.weight,
      repeticoes: r.reps,
      data: r.achieved_at,
    })),
    metas: data.goals.goals,
    conquistas: data.badges
      ? {
          nivel: data.badges.level,
          xp: data.badges.xp,
          emblemas: data.badges.badges.filter((b) => b.unlocked).map((b) => ({ nome: b.label, data: b.achievedAt })),
        }
      : null,
  };
}

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const format = request.nextUrl.searchParams.get("formato") === "json" ? "json" : "csv";

  let data: Awaited<ReturnType<typeof collect>>;
  try {
    data = await collect(session.user.id);
  } catch (err) {
    console.error("[exportar] Failed:", err);
    return NextResponse.json({ error: "Não foi possível gerar a exportação agora." }, { status: 502 });
  }

  const headers = {
    "Cache-Control": "no-store",
    "Content-Disposition":
      format === "json"
        ? `attachment; filename="treinai-dados-${fileDate()}.json"`
        : `attachment; filename="treinai-series-${fileDate()}.csv"`,
  };

  if (format === "json") {
    return new NextResponse(JSON.stringify(buildJson(data, session.user), null, 2), {
      headers: { ...headers, "Content-Type": "application/json; charset=utf-8" },
    });
  }
  return new NextResponse(buildCsv(data), {
    headers: { ...headers, "Content-Type": "text/csv; charset=utf-8" },
  });
}
