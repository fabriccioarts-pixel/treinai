import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { auth } from "@/auth";
import { buttonVariants } from "@/components/ui/button";
import { PlanSummary } from "@/components/nutrition/plan-summary";
import { workerApi } from "@/lib/worker-api";

export default async function BemVindoPlanoPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const plan = await workerApi.getProfile(session.user.id).catch(() => null);
  if (!plan?.profile) redirect("/bem-vindo/objetivo");

  const { profile } = plan;
  const params = new URLSearchParams({ objetivo: profile.goal, dias: String(profile.trainingDays) });
  if (profile.goal === "enfase" && profile.emphasis) params.set("enfase", profile.emphasis);

  return (
    <div className="mx-auto flex min-h-full w-full max-w-md flex-col px-4 py-8 sm:max-w-lg">
      <div className="mb-6 flex flex-col items-center text-center">
        <Image
          src="/ai-coach-avatar.png"
          alt="Théo"
          width={64}
          height={64}
          className="mb-3 h-16 w-16 rounded-full ring-2 ring-primary/30"
        />
        <h1 className="text-xl font-bold text-foreground">Seu plano está pronto</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Calculei tudo com base no seu corpo, na sua rotina e no seu objetivo. Dá pra ajustar quando quiser, no Perfil.
        </p>
      </div>

      <PlanSummary plan={plan} />

      <Link
        href={`/bem-vindo/conversa?${params.toString()}`}
        className={buttonVariants({ size: "lg", className: "mt-8 h-12 w-full gap-2 text-base font-semibold" })}
      >
        Agora, montar meu treino
        <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}
