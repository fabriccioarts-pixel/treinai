import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { workerApi } from "@/lib/worker-api";

/** Foto do corpo: só para quem está logado e é o dono (o worker confere pelo userId) */
export async function GET(_req: Request, { params }: { params: Promise<{ photoId: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return new NextResponse(null, { status: 401 });

  const { photoId } = await params;
  const photo = await workerApi.getBodyPhoto(session.user.id, photoId).catch(() => null);
  if (!photo) return new NextResponse(null, { status: 404 });

  return new NextResponse(photo.body, {
    headers: {
      "Content-Type": photo.contentType,
      // Dado sensível: nenhuma cópia em cache, para que apagar a foto a tire de vez também do aparelho
      "Cache-Control": "private, no-store",
    },
  });
}
