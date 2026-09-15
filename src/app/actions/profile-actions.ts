"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { workerApi } from "@/lib/worker-api";

const ALLOWED_PHOTO_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_PHOTO_BYTES = 8 * 1024 * 1024;

export interface UploadAvatarResult {
  error?: string;
}

export async function uploadAvatarAction(formData: FormData): Promise<UploadAvatarResult> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Sessão expirada." };

  const file = formData.get("avatar");
  if (!(file instanceof File) || file.size === 0) return { error: "Selecione uma foto." };
  if (!ALLOWED_PHOTO_TYPES.has(file.type)) {
    return { error: "Formato não suportado. Use JPEG, PNG ou WebP." };
  }
  if (file.size > MAX_PHOTO_BYTES) return { error: "A foto deve ter até 8MB." };

  try {
    const bytes = await file.arrayBuffer();
    await workerApi.uploadUserAvatar(session.user.id, bytes, file.type);
  } catch (err) {
    console.error("Erro no upload do avatar:", err);
    return { error: "Não foi possível enviar a foto agora. Tente novamente." };
  }

  revalidatePath("/perfil");
  return {};
}

export async function removeAvatarAction(): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) return;

  await workerApi.deleteUserAvatar(session.user.id).catch(() => {});
  revalidatePath("/perfil");
}
