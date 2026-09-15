import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { workerApi } from "@/lib/worker-api";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return new NextResponse(null, { status: 401 });

  const photo = await workerApi.getUserAvatar(session.user.id);
  if (!photo) return new NextResponse(null, { status: 404 });

  return new NextResponse(photo.body, {
    headers: {
      "Content-Type": photo.contentType,
      "Cache-Control": "private, max-age=300",
    },
  });
}
