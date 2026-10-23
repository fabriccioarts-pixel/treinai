import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { auth } from "@/auth";
import { PlanCards } from "@/components/billing/plan-cards";
import { CancelSubscriptionButton } from "@/components/billing/cancel-subscription-button";
import { TrialRecap } from "@/components/billing/trial-recap";
import { daysLeft, formatBRL, formatDate } from "@/lib/billing";
import { workerApi } from "@/lib/worker-api";

export const metadata: Metadata = { title: "Planos — Treinai" };

export default async function AssinarPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/assinar");

  const billing = await workerApi.getBilling(session.user.id).catch(() => null);
  if (!billing) {
    return (
      <Shell>
        <p className="text-sm text-muted-foreground">Não foi possível carregar os planos agora. Tente de novo em instantes.</p>
      </Shell>
    );
  }

  const sub = billing.subscription;
  const plan = sub ? billing.plans.find((p) => p.key === sub.plan) : null;

  // Acesso vitalício (liberado à mão): sem cobrança, sem próxima data e sem botão de cancelar
  if (billing.status === "active" && sub?.plan === "vitalicio") {
    return (
      <Shell title="Sua assinatura" subtitle="Tudo certo: o Théo está liberado.">
        <div className="rounded-2xl border border-border/60 bg-card p-5">
          <p className="text-base font-semibold text-foreground">Acesso vitalício</p>
          <p className="mt-1 text-sm text-muted-foreground">Sem cobrança. Tudo do Treinai liberado, sem prazo para acabar.</p>
        </div>
      </Shell>
    );
  }

  if (billing.status === "active" && sub && sub.status === "active") {
    return (
      <Shell title="Sua assinatura" subtitle="Tudo certo: o Théo está liberado.">
        <div className="rounded-2xl border border-border/60 bg-card p-5">
          <p className="text-base font-semibold text-foreground">{plan?.label ?? "Assinatura"}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {formatBRL(sub.amountCents)}
            {plan && plan.months > 1 ? ` a cada ${plan.months} meses` : " por mês"}
            {sub.paidUntil && ` · próxima cobrança em ${formatDate(sub.paidUntil)}`}
          </p>
        </div>
        <CancelSubscriptionButton paidUntil={sub.paidUntil} />
      </Shell>
    );
  }

  const days = daysLeft(billing.trialEndsAt);
  const subtitle =
    billing.status === "active"
      ? sub?.paidUntil
        ? `Sua assinatura foi cancelada, mas o acesso vale até ${formatDate(sub.paidUntil)}. Assine de novo para não perder o Théo.`
        : "Seu acesso está liberado."
      : billing.status === "trial"
        ? days <= 1
          ? "Seu teste grátis termina hoje. Escolha um plano para continuar com o Théo."
          : `Faltam ${days} dias do seu teste grátis. Assine agora e continue sem interrupção.`
        : "Seu teste grátis acabou. Escolha um plano para voltar a falar com o Théo.";

  // No teste ou depois dele: o resumo do que a pessoa já fez vem antes dos planos
  const recap =
    billing.status !== "active" ? await workerApi.getTrialRecap(session.user.id).catch(() => null) : null;

  return (
    <Shell title="Continue com o Théo" subtitle={subtitle}>
      {recap && <TrialRecap recap={recap} expired={billing.status === "expired"} />}
      <PlanCards plans={billing.plans} mode="checkout" trialDays={billing.trialDays} />
    </Shell>
  );
}

function Shell({ title, subtitle, children }: { title?: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-full w-full max-w-md flex-col px-4 py-6 sm:max-w-lg">
      <Link
        href="/"
        className="mb-6 inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar ao app
      </Link>
      {title && (
        <div className="mb-6 flex flex-col items-center text-center">
          <Image
            src="/ai-coach-avatar.png"
            alt="Théo"
            width={64}
            height={64}
            className="mb-3 h-16 w-16 rounded-full ring-2 ring-primary/30"
          />
          <h1 className="text-xl font-bold text-foreground">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
        </div>
      )}
      {children}
    </div>
  );
}
