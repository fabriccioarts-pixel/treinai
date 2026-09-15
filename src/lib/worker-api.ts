/**
 * Cliente server-only para a API do Worker (Cloudflare D1). Nunca importar
 * este arquivo de um Client Component — usa o segredo compartilhado.
 */
import "server-only";

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
    const body = await res.json().catch(() => ({}));
    throw new WorkerApiError(res.status, (body as { error?: string }).error ?? "request_failed");
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

  deleteWorkout: (id: string) =>
    workerFetch<{ ok: true }>(`/workouts/${id}`, { method: "DELETE" }),

  listExercises: (userId: string) =>
    workerFetch<{
      exercises: { id: string; name: string; muscle_group: string; equipment: string; type: string }[];
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

  listSessions: (userId: string, options?: { limit?: number; withPhoto?: boolean }) =>
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
      }${options?.withPhoto ? "&withPhoto=1" : ""}`
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
      newPRs: { type: string; weight: number; reps: number }[];
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
      topMovers: { exerciseId: string; label: string; changePct: number }[];
      loadTrend: { exerciseName: string; series: { date: string; weight: number }[] } | null;
    }>(`/stats?userId=${encodeURIComponent(userId)}`),

  askCoach: (userId: string, message: string) =>
    workerFetch<{
      reply: string;
      actions: { type: "workout_created" | "workout_updated"; workoutId: string; name: string }[];
    }>("/ai/coach", {
      method: "POST",
      body: JSON.stringify({ userId, message }),
    }),
};
