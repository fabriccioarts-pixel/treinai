/**
 * Cliente server-only para a API do Worker (Cloudflare D1). Nunca importar
 * este arquivo de um Client Component — usa o segredo compartilhado.
 */
import "server-only";
import type { MealEstimate, MealItem, MealType, MealsToday, ProfileInput, ProfilePlan } from "@/lib/nutrition";
import type { BadgeTier, Gamification, SessionSummary } from "@/lib/gamification";

/** Treino criado ou alterado pelo Théo numa resposta */
export type CoachAction = { type: "workout_created" | "workout_updated"; workoutId: string; name: string };

const BASE_URL = process.env.WORKER_API_URL;
const SECRET = process.env.WORKER_API_SECRET;

async function workerFetch<T>(path: string, init?: RequestInit): Promise<T> {
  if (!BASE_URL || !SECRET) {
    throw new Error("WORKER_API_URL / WORKER_API_SECRET não configurados.");
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${SECRET}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const rawText = await res.text().catch(() => "");
    let errorMsg = "request_failed";
    try {
      const body = JSON.parse(rawText);
      if (body?.error) errorMsg = body.error;
    } catch {
      if (rawText) errorMsg = rawText.slice(0, 100);
    }
    console.error(`[workerFetch] ${init?.method ?? "GET"} ${path} failed (${res.status}):`, rawText);
    throw new WorkerApiError(res.status, errorMsg);
  }

  return res.json() as Promise<T>;
}

export class WorkerApiError extends Error {
  constructor(public status: number, public code: string) {
    super(code);
    this.name = "WorkerApiError";
  }
}

export interface WorkerUser {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

export const workerApi = {
  register: (email: string, name: string, password: string) =>
    workerFetch<{ user: WorkerUser }>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, name, password }),
    }),

  login: (email: string, password: string) =>
    workerFetch<{ user: WorkerUser }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  upsertGoogleUser: (googleId: string, email: string, name: string) =>
    workerFetch<{ user: WorkerUser }>("/auth/google", {
      method: "POST",
      body: JSON.stringify({ googleId, email, name }),
    }),

  getUser: (userId: string) =>
    workerFetch<{
      user: { id: string; email: string; name: string; hasAvatar: boolean };
    }>(`/users/${encodeURIComponent(userId)}`),

  uploadUserAvatar: async (userId: string, bytes: ArrayBuffer, contentType: string) => {
    if (!BASE_URL || !SECRET) {
      throw new Error("WORKER_API_URL / WORKER_API_SECRET não configurados.");
    }
    const res = await fetch(`${BASE_URL}/users/${userId}/avatar`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${SECRET}`, "Content-Type": contentType },
      body: bytes,
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new WorkerApiError(res.status, (body as { error?: string }).error ?? "request_failed");
    }
    return res.json() as Promise<{ ok: true; key: string }>;
  },

  getUserAvatar: async (userId: string): Promise<{ body: ReadableStream<Uint8Array>; contentType: string } | null> => {
    if (!BASE_URL || !SECRET) {
      throw new Error("WORKER_API_URL / WORKER_API_SECRET não configurados.");
    }
    const res = await fetch(`${BASE_URL}/users/${userId}/avatar`, {
      headers: { Authorization: `Bearer ${SECRET}` },
      cache: "no-store",
    });
    if (res.status === 404) return null;
    if (!res.ok || !res.body) throw new WorkerApiError(res.status, "request_failed");
    return { body: res.body, contentType: res.headers.get("content-type") ?? "application/octet-stream" };
  },

  deleteUserAvatar: (userId: string) =>
    workerFetch<{ ok: true }>(`/users/${userId}/avatar`, { method: "DELETE" }),

  requestPasswordReset: (email: string) =>
    workerFetch<{ ok: true }>("/auth/reset-request", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),

  confirmPasswordReset: (token: string, newPassword: string) =>
    workerFetch<{ ok: true }>("/auth/reset-confirm", {
      method: "POST",
      body: JSON.stringify({ token, newPassword }),
    }),

  listWorkouts: (userId: string) =>
    workerFetch<{
      workouts: {
        id: string;
        name: string;
        description: string | null;
        exercise_count: number;
        muscle_groups: string | null;
      }[];
    }>(`/workouts?userId=${encodeURIComponent(userId)}`),

  getWorkout: (id: string) =>
    workerFetch<{
      workout: {
        id: string;
        name: string;
        description: string | null;
        exercises: {
          id: string;
          exercise_id: string;
          exercise_name: string;
          muscle_group: string;
          order_index: number;
          target_sets: number;
          target_reps_min: number;
          target_reps_max: number;
          rest_time: number;
          notes: string | null;
        }[];
      };
    }>(`/workouts/${id}`),

  createWorkout: (input: {
    userId: string;
    name: string;
    description?: string;
    exercises: {
      exerciseId: string;
      order: number;
      targetSets: number;
      targetRepsMin: number;
      targetRepsMax: number;
      restTime: number;
      notes?: string;
    }[];
  }) =>
    workerFetch<{ id: string }>("/workouts", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  /** Só apaga treino do próprio usuário; com sessões registradas ele é arquivado (archived: true) */
  deleteWorkout: (userId: string, id: string) =>
    workerFetch<{ ok: true; archived?: boolean }>(
      `/workouts/${encodeURIComponent(id)}?userId=${encodeURIComponent(userId)}`,
      { method: "DELETE" }
    ),

  listExercises: (userId: string) =>
    workerFetch<{
      exercises: {
        id: string;
        name: string;
        muscle_group: string;
        equipment: string;
        type: string;
        /** 1 = criado pelo usuário; 0 = catálogo global */
        is_custom?: number;
      }[];
    }>(`/exercises?userId=${encodeURIComponent(userId)}`),

  listPersonalRecords: (userId: string, muscleGroup?: string) =>
    workerFetch<{
      personalRecords: {
        id: string;
        exercise_id: string;
        exercise_name: string;
        muscle_group: string;
        weight: number;
        reps: number;
        achieved_at: string;
      }[];
    }>(
      `/personal-records?userId=${encodeURIComponent(userId)}${
        muscleGroup ? `&muscleGroup=${encodeURIComponent(muscleGroup)}` : ""
      }`
    ),

  startSession: (userId: string, workoutId: string) =>
    workerFetch<{ id: string }>("/workout-sessions", {
      method: "POST",
      body: JSON.stringify({ userId, workoutId }),
    }),

  listSessions: (
    userId: string,
    options?: { limit?: number; withPhoto?: boolean; active?: boolean }
  ) =>
    workerFetch<{
      sessions: {
        id: string;
        workout_id: string;
        workout_name: string;
        started_at: string;
        finished_at: string | null;
        duration_seconds: number | null;
        photo_key: string | null;
      }[];
    }>(
      `/workout-sessions?userId=${encodeURIComponent(userId)}${
        options?.limit ? `&limit=${options.limit}` : ""
      }${options?.withPhoto ? "&withPhoto=1" : ""}${options?.active ? "&active=1" : ""}`
    ),

  getSession: (id: string) =>
    workerFetch<{
      session: {
        id: string;
        user_id: string;
        workout_id: string;
        started_at: string;
        finished_at: string | null;
        duration_seconds: number | null;
        photo_key: string | null;
      };
    }>(`/workout-sessions/${id}`),

  getActiveSession: async (userId: string) => {
    const { sessions } = await workerApi.listSessions(userId, { limit: 1, active: true });
    return sessions[0] ?? null;
  },

  uploadSessionPhoto: async (sessionId: string, bytes: ArrayBuffer, contentType: string) => {
    if (!BASE_URL || !SECRET) {
      throw new Error("WORKER_API_URL / WORKER_API_SECRET não configurados.");
    }
    const res = await fetch(`${BASE_URL}/workout-sessions/${sessionId}/photo`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${SECRET}`, "Content-Type": contentType },
      body: bytes,
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new WorkerApiError(res.status, (body as { error?: string }).error ?? "request_failed");
    }
    return res.json() as Promise<{ ok: true; key: string }>;
  },

  getSessionPhoto: async (sessionId: string): Promise<{ body: ReadableStream<Uint8Array>; contentType: string } | null> => {
    if (!BASE_URL || !SECRET) {
      throw new Error("WORKER_API_URL / WORKER_API_SECRET não configurados.");
    }
    const res = await fetch(`${BASE_URL}/workout-sessions/${sessionId}/photo`, {
      headers: { Authorization: `Bearer ${SECRET}` },
      cache: "no-store",
    });
    if (res.status === 404) return null;
    if (!res.ok || !res.body) throw new WorkerApiError(res.status, "request_failed");
    return { body: res.body, contentType: res.headers.get("content-type") ?? "application/octet-stream" };
  },

  deleteSessionPhoto: (sessionId: string) =>
    workerFetch<{ ok: true }>(`/workout-sessions/${sessionId}/photo`, { method: "DELETE" }),

  finishSession: (id: string, durationSeconds: number) =>
    workerFetch<{ ok: true }>(`/workout-sessions/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ finishedAt: new Date().toISOString(), durationSeconds }),
    }),

  deleteSession: (id: string) =>
    workerFetch<{ ok: true }>(`/workout-sessions/${id}`, { method: "DELETE" }),

  listSessionSets: (sessionId: string) =>
    workerFetch<{
      sets: {
        id: string;
        exercise_id: string;
        set_number: number;
        weight: number;
        reps: number;
        completed: number;
      }[];
    }>(`/sets?sessionId=${encodeURIComponent(sessionId)}`),

  /** Séries concluídas mais recentes do usuário em um exercício (todas as sessões), da mais nova para a mais antiga */
  listExerciseSets: (userId: string, exerciseId: string, limit = 20) =>
    workerFetch<{
      sets: {
        id: string;
        session_id: string;
        set_number: number;
        weight: number;
        reps: number;
        created_at: string;
      }[];
    }>(
      `/sets?userId=${encodeURIComponent(userId)}&exerciseId=${encodeURIComponent(exerciseId)}&limit=${limit}`
    ),

  deleteSet: (id: string, sessionId: string) =>
    workerFetch<{ ok: true }>(`/sets/${id}?sessionId=${encodeURIComponent(sessionId)}`, { method: "DELETE" }),

  logSet: (input: {
    sessionId: string;
    exerciseId: string;
    setNumber: number;
    weight: number;
    reps: number;
    rpe?: number;
  }) =>
    workerFetch<{
      id: string;
      /** Número gravado pelo servidor (o setNumber do cliente é ignorado); ausente em worker antigo */
      setNumber?: number | null;
      newPRs: { type: string; weight: number; reps: number }[];
      newGoals: { id: string; exerciseName: string; targetWeight: number }[];
      newBadges: { key: string; label: string; description: string; icon: string }[];
    }>("/sets", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  getStats: (userId: string) =>
    workerFetch<{
      workoutsThisWeek: number;
      weeklyVolumeKg: number;
      recentPRsCount: number;
      streakDays: number;
      trainedToday: boolean;
      streakAtRisk: boolean;
      lostStreakDays: number;
      last7Days: { date: string; trained: boolean; shielded?: boolean }[];
      frequencyThisMonth: number;
      newPRsThisMonth: number;
      recentPRs: {
        id: string;
        exerciseId: string;
        exerciseName: string;
        weight: number;
        reps: number;
        achievedAt: string;
      }[];
      weeklyVolumeSeries: { week: string; volume: number }[];
      /** Só os dias com treino (YYYY-MM-DD no fuso do app). Ausente em worker anterior ao mapa de calor. */
      dailyVolume?: { date: string; volume: number }[];
      topMovers: { exerciseId: string; label: string; changePct: number }[];
      loadTrend: { exerciseName: string; series: { date: string; weight: number }[] } | null;
    }>(`/stats?userId=${encodeURIComponent(userId)}`),

  askCoach: (
    userId: string,
    message: string,
    options: {
      /** Conversa salva a continuar; o worker lê o histórico do banco */
      conversationId?: string;
      /** Mensagem do app em nome do usuário (não aparece no chat) */
      hidden?: boolean;
      /** Histórico do cliente, usado só por worker anterior às conversas salvas */
      history?: { role: "user" | "assistant"; content: string }[];
    } = {}
  ) =>
    workerFetch<{
      reply: string;
      actions: CoachAction[];
      /** null quando o worker não conseguiu salvar; ausente em worker anterior às conversas salvas */
      conversationId?: string | null;
    }>("/ai/coach", {
      method: "POST",
      body: JSON.stringify({ userId, message, ...options }),
    }),

  /** Token temporário + configuração para o navegador abrir a conversa por voz no Gemini Live */
  startVoiceSession: (userId: string, conversationId?: string) =>
    workerFetch<{ token: string; expiresAt: string; setup: Record<string, unknown> }>("/ai/voice/session", {
      method: "POST",
      body: JSON.stringify({ userId, conversationId }),
    }),

  runVoiceTool: (userId: string, name: string, args: unknown) =>
    workerFetch<{ output: string; actions: CoachAction[] }>("/ai/voice/tool", {
      method: "POST",
      body: JSON.stringify({ userId, name, args }),
    }),

  saveVoiceTurn: (
    userId: string,
    turn: { conversationId?: string; userText: string; reply: string; actions: CoachAction[] }
  ) =>
    workerFetch<{ conversationId: string }>("/ai/voice/turn", {
      method: "POST",
      body: JSON.stringify({ userId, ...turn }),
    }),

  listCoachConversations: (userId: string) =>
    workerFetch<{
      conversations: { id: string; title: string; updated_at: string; preview: string | null }[];
    }>(`/coach-conversations?userId=${encodeURIComponent(userId)}`),

  getCoachConversation: (userId: string, id: string) =>
    workerFetch<{
      conversation: { id: string; title: string; updated_at: string };
      messages: { id: string; role: "user" | "assistant"; content: string; actions: CoachAction[]; createdAt: string }[];
    }>(`/coach-conversations/${encodeURIComponent(id)}?userId=${encodeURIComponent(userId)}`),

  renameCoachConversation: (userId: string, id: string, title: string) =>
    workerFetch<{ ok: true; title: string }>(`/coach-conversations/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify({ userId, title }),
    }),

  deleteCoachConversation: (userId: string, id: string) =>
    workerFetch<{ ok: true }>(
      `/coach-conversations/${encodeURIComponent(id)}?userId=${encodeURIComponent(userId)}`,
      { method: "DELETE" }
    ),

  listGoals: (userId: string) =>
    workerFetch<{
      goals: {
        id: string;
        exerciseId: string;
        exerciseName: string;
        muscleGroup: string;
        targetWeight: number;
        targetReps: number;
        startingWeight: number;
        currentWeight: number;
        progressPct: number;
        deadline: string | null;
        achievedAt: string | null;
        createdAt: string;
      }[];
    }>(`/goals?userId=${encodeURIComponent(userId)}`),

  createGoal: (input: {
    userId: string;
    exerciseId: string;
    targetWeight: number;
    targetReps?: number;
    deadline?: string;
  }) =>
    workerFetch<{ id: string }>("/goals", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  deleteGoal: (id: string) => workerFetch<{ ok: true }>(`/goals/${id}`, { method: "DELETE" }),

  getBadges: (userId: string) =>
    workerFetch<{
      badges: {
        key: string;
        label: string;
        description: string;
        icon: string;
        tier?: BadgeTier;
        hidden?: boolean;
        unlocked: boolean;
        achievedAt: string | null;
      }[];
      xp: number;
      level: number;
      xpIntoLevel: number;
      xpForNextLevel: number;
    }>(`/badges?userId=${encodeURIComponent(userId)}`),

  /** Nível, missões da semana, escudos e XP recente (e concede o que estiver pendente) */
  getGamification: (userId: string) =>
    workerFetch<Gamification>(`/gamification?userId=${encodeURIComponent(userId)}`),

  /** Resumo de um treino concluído: XP ganho, nível antes/depois, PRs e conquistas */
  getSessionSummary: (userId: string, sessionId: string) =>
    workerFetch<SessionSummary>(
      `/gamification/session/${encodeURIComponent(sessionId)}?userId=${encodeURIComponent(userId)}`,
    ),

  getProfile: (userId: string) =>
    workerFetch<ProfilePlan | { profile: null }>(`/profile?userId=${encodeURIComponent(userId)}`),

  saveProfile: (userId: string, input: ProfileInput & { healthConsent: true }) =>
    workerFetch<ProfilePlan>("/profile", {
      method: "PUT",
      body: JSON.stringify({ userId, ...input }),
    }),

  deleteProfile: (userId: string) =>
    workerFetch<{ ok: true }>(`/profile?userId=${encodeURIComponent(userId)}`, { method: "DELETE" }),

  getWater: (userId: string) =>
    workerFetch<{
      date: string;
      totalMl: number;
      targetMl: number;
      entries: { id: string; amountMl: number; loggedAt: string }[];
    }>(`/water?userId=${encodeURIComponent(userId)}`),

  logWater: (userId: string, amountMl: number) =>
    workerFetch<{ id: string }>("/water", {
      method: "POST",
      body: JSON.stringify({ userId, amountMl }),
    }),

  analyzeMeal: (
    userId: string,
    input: { photo: { base64: string; mediaType: "image/jpeg" | "image/png" | "image/webp" } } | { text: string },
  ) =>
    workerFetch<MealEstimate>("/meals/analyze", {
      method: "POST",
      body: JSON.stringify({ userId, ...input }),
    }),

  saveMeal: (userId: string, input: { mealType: MealType; source: "foto" | "texto"; items: MealItem[] }) =>
    workerFetch<{ id: string }>("/meals", {
      method: "POST",
      body: JSON.stringify({ userId, ...input }),
    }),

  getMealsToday: (userId: string) => workerFetch<MealsToday>(`/meals?userId=${encodeURIComponent(userId)}`),

  deleteMeal: (userId: string, id: string) =>
    workerFetch<{ ok: true }>(`/meals/${encodeURIComponent(id)}?userId=${encodeURIComponent(userId)}`, {
      method: "DELETE",
    }),

  deleteWater: (userId: string, id: string) =>
    workerFetch<{ ok: true }>(`/water/${encodeURIComponent(id)}?userId=${encodeURIComponent(userId)}`, {
      method: "DELETE",
    }),

  /** Lembretes por notificação: inscrição de Web Push de um aparelho */
  subscribePush: (userId: string, sub: { endpoint: string; p256dh: string; auth: string }) =>
    workerFetch<{ ok: true }>("/push/subscribe", {
      method: "POST",
      body: JSON.stringify({ userId, ...sub }),
    }),

  unsubscribePush: (userId: string, endpoint: string) =>
    workerFetch<{ ok: true }>("/push/unsubscribe", {
      method: "POST",
      body: JSON.stringify({ userId, endpoint }),
    }),

  sendTestPush: (userId: string) =>
    workerFetch<{ sent: number }>("/push/test", {
      method: "POST",
      body: JSON.stringify({ userId }),
    }),
};
