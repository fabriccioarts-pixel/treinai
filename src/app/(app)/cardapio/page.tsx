import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { MealPlanScreen } from "@/components/nutrition/meal-plan-screen";
import { auth } from "@/auth";
import { workerApi } from "@/lib/worker-api";

/** Montar o cardápio leva cerca de 1 minuto: a action desta página pode passar do padrão */
export const maxDuration = 180;

export default async function CardapioPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [plan, current] = await Promise.all([
    workerApi.getProfile(session.user.id).catch(() => null),
    workerApi.getMealPlan(session.user.id).catch(() => null),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/" aria-label="Voltar" className={buttonVariants({ variant: "ghost", size: "icon" })}>
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Cardápio da semana</h1>
          <p className="text-sm text-muted-foreground">Feito com as suas metas, com trocas e lista de compras.</p>
        </div>
      </div>

      <MealPlanScreen hasProfile={!!plan?.profile} initial={current?.mealPlan ?? null} />
    </div>
  );
}
