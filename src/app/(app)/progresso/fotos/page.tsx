import Link from "next/link";
import { ArrowLeft, Camera } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { buttonVariants } from "@/components/ui/button";
import { auth } from "@/auth";
import { workerApi } from "@/lib/worker-api";
import { formatDate } from "@/lib/format";

export default async function FotosDosTreinosPage() {
  const session = await auth();
  const { sessions } = await workerApi.listSessions(session!.user.id, {
    limit: 200,
    withPhoto: true,
  });

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <Link
          href="/progresso"
          aria-label="Voltar"
          className={buttonVariants({ variant: "ghost", size: "icon" })}
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            Fotos dos treinos
          </h1>
          <p className="text-sm text-muted-foreground">
            {sessions.length} foto{sessions.length === 1 ? "" : "s"}
          </p>
        </div>
      </div>

      {sessions.length === 0 ? (
        <EmptyState
          icon={Camera}
          title="Nenhuma foto ainda"
          description="Ao finalizar um treino, você pode registrar uma foto — elas aparecem aqui."
        />
      ) : (
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {sessions.map((s) => (
            <Link
              key={s.id}
              href={`/progresso/fotos/${s.id}`}
              className="group relative aspect-square overflow-hidden rounded-xl bg-muted"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/sessoes/${s.id}/foto`}
                alt={`Foto do treino ${s.workout_name}`}
                loading="lazy"
                className="h-full w-full object-cover transition-transform group-hover:scale-105"
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                <p className="truncate text-xs font-medium text-white">{s.workout_name}</p>
                <p className="text-[11px] text-white/75">{formatDate(s.started_at.slice(0, 10))}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
