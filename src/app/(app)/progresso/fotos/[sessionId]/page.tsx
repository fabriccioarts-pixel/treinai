import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Trash2 } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { auth } from "@/auth";
import { workerApi, WorkerApiError } from "@/lib/worker-api";
import { formatDate } from "@/lib/format";
import { removeSessionPhotoAction } from "@/app/actions/session-actions";

export default async function FotoDoTreinoPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  const authSession = await auth();

  let workoutSession;
  try {
    ({ session: workoutSession } = await workerApi.getSession(sessionId));
  } catch (err) {
    if (err instanceof WorkerApiError && err.status === 404) notFound();
    throw err;
  }

  if (workoutSession.user_id !== authSession!.user.id || !workoutSession.photo_key) {
    notFound();
  }

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <Link
          href="/progresso/fotos"
          aria-label="Voltar"
          className={buttonVariants({ variant: "ghost", size: "icon" })}
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <form action={removeSessionPhotoAction.bind(null, sessionId)}>
          <button
            type="submit"
            aria-label="Excluir foto"
            className={buttonVariants({ variant: "destructive", size: "icon" })}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </form>
      </div>

      <div className="overflow-hidden rounded-2xl bg-muted">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/api/sessoes/${sessionId}/foto`}
          alt="Foto do treino"
          className="w-full object-cover"
        />
      </div>

      <p className="mt-3 text-sm text-muted-foreground">
        {formatDate(workoutSession.started_at.slice(0, 10))}
      </p>
    </div>
  );
}
