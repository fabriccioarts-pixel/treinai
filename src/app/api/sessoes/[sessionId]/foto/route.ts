import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { workerApi } from "@/lib/worker-api";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const authSession = await auth();
  if (!authSession?.user?.id) return new NextResponse(null, { status: 401 });

  const { sessionId } = await params;

  const { session: workoutSession } = await workerApi
    .getSession(sessionId)
    .catch(() => ({ session: null }));
  if (!workoutSession || workoutSession.user_id !== authSession.user.id) {
    return new NextResponse(null, { status: 404 });
  }

  const photo = await workerApi.getSessionPhoto(sessionId);
  if (!photo) return new NextResponse(null, { status: 404 });

  return new NextResponse(photo.body, {
    headers: {
      "Content-Type": photo.contentType,
      "Cache-Control": "private, max-age=31536000, immutable",
    },
  });
}
