import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Illustration } from "@/components/ui/illustration";
import { daysLeft } from "@/lib/billing";
import type { BillingAccess } from "@/lib/worker-api";
import { cn } from "@/lib/utils";

/**
 * Faixa no topo do app durante o teste grátis e depois que ele acaba.
 * Quem assina não vê nada; a página de planos não precisa de um convite para ela mesma.
 */
export function TrialBanner({ access }: { access: BillingAccess }) {
  if (access.status === "active") return null;

  const expired = access.status === "expired";
  const days = daysLeft(access.trialEndsAt);
  const title = expired
    ? "Seu teste grátis acabou"
    : days <= 1
      ? "Seu teste grátis termina hoje"
      : `Faltam ${days} dias do seu teste grátis`;
  const detail = expired
    ? "Seus treinos continuam aqui. Assine para voltar a falar com o Théo."
    : "Assine para continuar com o Théo depois do teste.";

  return (
    <Link
      href="/assinar"
      className={cn(
        "mb-4 flex items-center gap-3 rounded-2xl border px-4 py-3 transition-colors",
        expired
          ? "border-primary/50 bg-primary/10 hover:bg-primary/15"
          : "border-border/60 bg-card hover:bg-muted/40",
      )}
    >
      <Illustration name="trial" size={44} className="-my-2 -ml-1" />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-foreground">{title}</span>
        <span className="block text-xs text-muted-foreground">{detail}</span>
      </span>
      <span className="flex shrink-0 items-center text-xs font-semibold text-primary">
        Ver planos
        <ChevronRight className="h-4 w-4" />
      </span>
    </Link>
  );
}
