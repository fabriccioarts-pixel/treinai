import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { buttonVariants } from "@/components/ui/button";
import { WorkoutBuilder } from "@/components/workout/workout-builder";
import { auth } from "@/auth";
import { workerApi } from "@/lib/worker-api";

export default async function NovoTreinoPage() {
  const session = await auth();
  const { exercises } = await workerApi.listExercises(session!.user.id);

  return (
    <div>
      <PageHeader
        title="Novo treino"
        action={
          <Link
            href="/treinos"
            className={buttonVariants({ variant: "ghost", size: "icon" })}
            aria-label="Voltar"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
        }
      />
      <WorkoutBuilder exercises={exercises} />
    </div>
  );
}
