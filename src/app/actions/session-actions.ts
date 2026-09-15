"use server";

import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { auth } from "@/auth";
import { workerApi } from "@/lib/worker-api";

export async function startWorkoutAction(workoutId: string): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { id: sessionId } = await workerApi.startSession(session.user.id, workoutId);
  refresh();
  redirect(`/treinos/${workoutId}/executar/${sessionId}`);
}

export interface LogSetResult {
  id?: string;
  newPRs?: { type: string; weight: number; reps: number }[];
  newGoals?: { id: string; exerciseName: string; targetWeight: number }[];
  newBadges?: { key: string; label: string; description: string; icon: string }[];
  error?: string;
}

export async function logSetAction(input: {
  sessionId: string;
  exerciseId: string;
  setNumber: number;
  weight: number;
  reps: number;
}): Promise<LogSetResult> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Sessão expirada." };
  if (input.weight < 0 || input.reps <= 0) return { error: "Valores inválidos." };

  try {
    const { id, newPRs, newGoals, newBadges } = await workerApi.logSet(input);
    return { id, newPRs, newGoals, newBadges };
  } catch {
    return { error: "Não foi possível salvar a série. Tente novamente." };
  }
}

async function assertOwnsSession(sessionId: string, userId: string) {
  const { session: workoutSession } = await workerApi.getSession(sessionId).catch(() => ({ session: null }));
  return workoutSession?.user_id === userId ? workoutSession : null;
}

export interface UploadPhotoResult {
  error?: string;
}

const ALLOWED_PHOTO_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_PHOTO_BYTES = 8 * 1024 * 1024;

export async function uploadSessionPhotoAction(
  sessionId: string,
  formData: FormData
): Promise<UploadPhotoResult> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Sessão expirada." };

  const file = formData.get("photo");
  if (!(file instanceof File) || file.size === 0) return { error: "Selecione uma foto." };
  if (!ALLOWED_PHOTO_TYPES.has(file.type)) {
    return { error: "Formato não suportado. Use JPEG, PNG ou WebP." };
  }
  if (file.size > MAX_PHOTO_BYTES) return { error: "A foto deve ter até 8MB." };

  const owns = await assertOwnsSession(sessionId, session.user.id);
  if (!owns) return { error: "Sessão de treino não encontrada." };

  try {
    const bytes = await file.arrayBuffer();
    await workerApi.uploadSessionPhoto(sessionId, bytes, file.type);
  } catch {
    return { error: "Não foi possível enviar a foto agora. Tente novamente." };
  }

  return {};
}

export async function removeSessionPhotoAction(sessionId: string): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const owns = await assertOwnsSession(sessionId, session.user.id);
  if (owns) await workerApi.deleteSessionPhoto(sessionId);

  redirect("/progresso/fotos");
}

export async function finishWorkoutAction(
  sessionId: string,
  durationSeconds: number
): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  await workerApi.finishSession(sessionId, durationSeconds);
  refresh();
  redirect("/");
}

export async function discardSessionAction(sessionId: string): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const owns = await assertOwnsSession(sessionId, session.user.id);
  if (owns) await workerApi.deleteSession(sessionId).catch(() => {});
  refresh();
}
