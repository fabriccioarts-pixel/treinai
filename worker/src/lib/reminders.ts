import { loadStreak } from "./streak-shields";
import { loadWeeklyMissions } from "./missions";
import { localDate } from "./nutrition";
import { loadProfileWithTargets } from "./profile";
import { sendWebPush, type VapidConfig } from "./web-push";

/** Horários fixos (no fuso do usuário) em que o cron manda cada lembrete */
export const WATER_HOURS = [9, 11, 13, 15, 17, 19];
export const WORKOUT_HOUR = 18;

const DEFAULT_TIME_ZONE = "America/Sao_Paulo";
const DEFAULT_WATER_TARGET_ML = 2000;
const DAY_MS = 86_400_000;

export interface PushMessage {
  title: string;
  body: string;
  url: string;
  /** Mesma tag substitui a notificação anterior do mesmo tipo em vez de empilhar */
  tag: string;
}

interface WorkoutContext {
  firstName: string;
  workoutName: string;
  streakDays: number;
  atRisk: boolean;
  shields?: number;
  /** Presente quando falta só 1 treino para fechar a missão da semana */
  missionHint?: { xp: number };
}

interface WaterContext {
  firstName: string;
  drunkMl: number;
  targetMl: number;
}

const liters = (ml: number) => `${(ml / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} L`;

/** Escolha estável dentro da mesma hora, mas que varia ao longo dos dias */
function pick<T>(items: T[], seed: number): T {
  return items[Math.abs(seed) % items.length];
}

export function workoutMessage(ctx: WorkoutContext, seed: number): PushMessage {
  const { firstName, workoutName, streakDays } = ctx;
  const message = (title: string, body: string): PushMessage => ({ title, body, url: "/", tag: "treino" });

  if (ctx.atRisk && streakDays > 1) {
    return message(
      `${firstName}, sua constância está em jogo`,
      ctx.shields
        ? `São ${streakDays} dias de treino. Você tem escudo guardado, mas melhor não gastar: ${workoutName} hoje.`
        : `São ${streakDays} dias de treino. Um ${workoutName} hoje mantém a sequência viva.`,
    );
  }

  if (ctx.missionHint) {
    return message(
      `Falta 1 treino, ${firstName}!`,
      `Um ${workoutName} hoje fecha a missão da semana e vale +${ctx.missionHint.xp} XP.`,
    );
  }

  const bodies = [
    `Hoje é dia de ${workoutName}. Um treino de cada vez, e o resultado vem.`,
    `Disciplina é treinar mesmo quando a vontade não aparece. O ${workoutName} te espera.`,
    `O corpo que você quer é construído em dias como hoje. Bora de ${workoutName}?`,
    `Meia hora hoje vale mais que a semana perfeita que nunca começa. ${workoutName} na agenda.`,
    `Ninguém se arrepende de um treino feito. ${workoutName} hoje, orgulho amanhã.`,
  ];
  if (streakDays > 1) {
    bodies.push(`${streakDays} dias de constância. Não deixa a sequência parar hoje: ${workoutName} te espera.`);
  }
  const titles = [`Hora de treinar, ${firstName}`, `${firstName}, bora treinar?`, "Seu treino de hoje está pronto"];
  return message(pick(titles, seed), pick(bodies, seed * 7 + 3));
}

export function waterMessage(ctx: WaterContext, seed: number): PushMessage {
  const remaining = liters(ctx.targetMl - ctx.drunkMl);
  const bodies = [
    `Faltam ${remaining} para a sua meta de hoje. Um copo agora já ajuda.`,
    `Músculo é quase 75% água. Hidratar também é treinar. Faltam ${remaining}.`,
    `Pausa rápida: um copo de água e segue o dia. Faltam ${remaining} para a meta.`,
    `Hidratação em dia é mais energia e mais foco no treino. Faltam ${remaining}.`,
    ctx.drunkMl > 0
      ? `Você já tomou ${liters(ctx.drunkMl)} de ${liters(ctx.targetMl)}. Bora fechar essa meta!`
      : `Primeiro copo do dia ainda não foi registrado. Começa agora, meta de ${liters(ctx.targetMl)}.`,
  ];
  const titles = [`Hora da água, ${ctx.firstName}`, "Bebe uma água 💧", `${ctx.firstName}, já se hidratou?`];
  return { title: pick(titles, seed), body: pick(bodies, seed * 5 + 1), url: "/", tag: "agua" };
}

/** Próximo treino do ciclo: o que nunca foi feito ou o feito há mais tempo (mesma regra da home) */
async function nextWorkoutName(db: D1Database, userId: string): Promise<string | null> {
  const { results } = await db
    .prepare(
      `SELECT w.name, MAX(ws.started_at) AS last_done
       FROM workouts w
       LEFT JOIN workout_sessions ws ON ws.workout_id = w.id AND ws.finished_at IS NOT NULL
       WHERE w.user_id = ? AND w.archived_at IS NULL
       GROUP BY w.id
       ORDER BY last_done IS NOT NULL, last_done ASC, w.created_at ASC
       LIMIT 1`,
    )
    .bind(userId)
    .all<{ name: string; last_done: string | null }>();
  return results[0]?.name ?? null;
}

function localHour(timeZone: string, now: Date): number {
  return Number(new Intl.DateTimeFormat("en-US", { hour: "numeric", hourCycle: "h23", timeZone }).format(now));
}

/** Monta os lembretes devidos nesta hora para um usuário (vazio se nada for devido) */
export async function dueReminders(db: D1Database, userId: string, now = new Date()): Promise<PushMessage[]> {
  const user = await db
    .prepare(
      `SELECT u.name, p.timezone FROM users u
       LEFT JOIN user_profiles p ON p.user_id = u.id
       WHERE u.id = ?`,
    )
    .bind(userId)
    .first<{ name: string; timezone: string | null }>();
  if (!user) return [];

  const timeZone = user.timezone ?? DEFAULT_TIME_ZONE;
  const hour = localHour(timeZone, now);
  const firstName = user.name.split(" ")[0] || "atleta";
  const today = localDate(timeZone, now);
  const seed = Number(today.replaceAll("-", "")) + hour;
  const messages: PushMessage[] = [];

  if (hour === WORKOUT_HOUR) {
    const streak = await loadStreak(db, userId, now.getTime());
    const workoutName = streak.trainedToday ? null : await nextWorkoutName(db, userId);
    if (workoutName) {
      // Falta 1 treino para fechar a missão da semana: vira o gancho da notificação
      const week = await loadWeeklyMissions(db, userId).catch(() => null);
      const trainingMission = week?.missions.find((m) => m.key === "treinos");
      const missionHint =
        trainingMission && !trainingMission.completed && trainingMission.target - trainingMission.progress === 1
          ? { xp: trainingMission.xp }
          : undefined;
      messages.push(
        workoutMessage(
          { firstName, workoutName, streakDays: streak.streakDays, atRisk: streak.atRisk, shields: streak.shields, missionHint },
          seed,
        ),
      );
    }
  }

  if (WATER_HOURS.includes(hour)) {
    const plan = await loadProfileWithTargets(db, userId);
    const targetMl = plan?.waterTodayMl ?? DEFAULT_WATER_TARGET_ML;
    const drunk = await db
      .prepare("SELECT COALESCE(SUM(amount_ml), 0) AS ml FROM water_logs WHERE user_id = ? AND local_date = ?")
      .bind(userId, today)
      .first<{ ml: number }>();
    const drunkMl = drunk?.ml ?? 0;
    // Meta já batida: nada de lembrete
    if (drunkMl < targetMl) messages.push(waterMessage({ firstName, drunkMl, targetMl }, seed));
  }

  return messages;
}

export function vapidFromEnv(env: Env): VapidConfig | null {
  if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY) return null;
  return { publicKey: env.VAPID_PUBLIC_KEY, privateKey: env.VAPID_PRIVATE_KEY, subject: env.VAPID_SUBJECT };
}

/** Envia a mensagem para todos os aparelhos do usuário, limpando inscrições expiradas */
export async function pushToUser(db: D1Database, vapid: VapidConfig, userId: string, message: PushMessage) {
  const { results: subs } = await db
    .prepare("SELECT id, endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = ?")
    .bind(userId)
    .all<{ id: string; endpoint: string; p256dh: string; auth: string }>();

  let sent = 0;
  for (const sub of subs) {
    const result = await sendWebPush(sub, message, vapid).catch((err) => {
      console.error("Erro no web push:", err);
      return "error" as const;
    });
    if (result === "gone") await db.prepare("DELETE FROM push_subscriptions WHERE id = ?").bind(sub.id).run();
    if (result === "ok") sent++;
  }
  return sent;
}

/** Cron de hora em hora: lembretes de água e de treino para quem ativou as notificações */
export async function runHourlyReminders(env: Env, now = new Date()) {
  const vapid = vapidFromEnv(env);
  if (!vapid) {
    console.warn("VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY não configuradas; lembretes não enviados.");
    return;
  }

  const { results: users } = await env.DB.prepare("SELECT DISTINCT user_id FROM push_subscriptions").all<{
    user_id: string;
  }>();

  for (const { user_id: userId } of users) {
    try {
      const messages = await dueReminders(env.DB, userId, now);
      for (const message of messages) await pushToUser(env.DB, vapid, userId, message);
    } catch (err) {
      console.error(`Erro ao enviar lembretes para ${userId}:`, err);
    }
  }
}
