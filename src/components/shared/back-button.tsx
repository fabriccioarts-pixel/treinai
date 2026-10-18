"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Seta de voltar do topo: volta para a tela de onde a pessoa veio dentro do app.
 * Quem chegou por link direto (sem tela anterior do app no histórico) vai para o fallback.
 */
export function BackButton({ fallbackHref = "/", className }: { fallbackHref?: string; className?: string }) {
  const router = useRouter();

  function handleClick() {
    // A navegação interna do Next não atualiza o referrer: vazio (app aberto direto) conta como "veio do app";
    // só um site externo como origem manda para o fallback, para o voltar não sair do Treinai
    const cameFromOutside =
      document.referrer !== "" && new URL(document.referrer).origin !== window.location.origin;
    if (!cameFromOutside && window.history.length > 1) router.back();
    else router.push(fallbackHref);
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label="Voltar"
      className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "shrink-0", className)}
    >
      <ArrowLeft className="h-5 w-5" />
    </button>
  );
}
