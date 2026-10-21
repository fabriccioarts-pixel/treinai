import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { auth } from "@/auth";
import { buttonVariants } from "@/components/ui/button";
import { RefreshUntilActive } from "@/components/billing/refresh-until-active";
import { workerApi } from "@/lib/worker-api";

export const metadata: Metadata = { title: "Assinatura — Treinai" };

/**
 * Página de obrigado da Cakto (configurada no produto). Quem libera o acesso é o webhook, não esta
 * visita: aqui só mostramos o estado e recarregamos até o aviso chegar.
 */
export default async function AssinaturaObrigadoPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/assinar/obrigado");

  const billing = await workerApi.getBilling(session.user.id).catch(() => null);
  const confirmed = billing?.status === "active" && billing.subscription?.status === "active";

  return (
    <div className="mx-auto flex min-h-full w-full max-w-md flex-col items-center justify-center px-4 py-10 text-center sm:max-w-lg">
      {!confirmed && <RefreshUntilActive />}
      <Image
        src="/ai-coach-avatar.png"
        alt="Théo"
        width={72}
        height={72}
        className="mb-4 h-18 w-18 rounded-full ring-2 ring-primary/30"
      />
      <h1 className="text-2xl font-bold text-foreground">
        {confirmed ? "Bem-vindo de vez! 💪" : "Estamos confirmando seu pagamento"}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {confirmed
          ? "Sua assinatura está ativa. Bora pro próximo treino?"
          : "Assim que a Cakto confirmar, o Théo é liberado — no cartão é na hora, no Pix pode levar alguns minutos. Use o mesmo e-mail da sua conta no Treinai."}
      </p>
      <Link
        href={confirmed ? "/" : "/assinar"}
        className={buttonVariants({ size: "lg", className: "mt-8 h-12 w-full gap-2 text-base font-semibold" })}
      >
        {confirmed ? "Ir para o app" : "Ver minha assinatura"}
        <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}
