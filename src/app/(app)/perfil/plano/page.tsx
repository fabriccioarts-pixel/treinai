import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { PlanSummary } from "@/components/nutrition/plan-summary";
import { ProfileForm } from "@/components/nutrition/profile-form";
import { DeleteHealthDataButton } from "@/components/nutrition/delete-health-data-button";
import { auth } from "@/auth";
import { workerApi } from "@/lib/worker-api";

export default async function PerfilPlanoPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const plan = await workerApi.getProfile(session.user.id).catch(() => null);
  const hasPlan = !!plan?.profile;

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <Link href="/perfil" aria-label="Voltar" className={buttonVariants({ variant: "ghost", size: "icon" })}>
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Corpo e plano</h1>
          <p className="text-sm text-muted-foreground">
            {hasPlan ? "Atualize seu peso ou rotina e o plano se recalcula." : "Preencha para liberar calorias, macros e água."}
          </p>
        </div>
      </div>

      {plan?.profile && <PlanSummary plan={plan} />}

      <ProfileForm mode="edit" initial={plan?.profile ?? undefined} />

      {hasPlan && <DeleteHealthDataButton />}
    </div>
  );
}
