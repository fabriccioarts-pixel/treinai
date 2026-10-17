"use client";

import { useState } from "react";
import Image from "next/image";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";

/** Mesma chave usada pela tela de login para destacar o "último login realizado" */
const LAST_PROVIDER_KEY = "treinai_last_login_provider";

/**
 * Entrar/cadastrar com Google. O callback do Auth.js faz upsert do usuário no worker,
 * então o mesmo botão serve para quem já tem conta e para quem está se cadastrando.
 */
export function GoogleSignInButton({ label, callbackUrl }: { label: string; callbackUrl: string }) {
  const [loading, setLoading] = useState(false);

  return (
    <Button
      type="button"
      variant="outline"
      size="lg"
      className="h-12 w-full gap-3 font-medium transition-all hover:bg-secondary/70"
      disabled={loading}
      onClick={() => {
        try {
          localStorage.setItem(LAST_PROVIDER_KEY, "google");
        } catch {}
        setLoading(true);
        signIn("google", { callbackUrl });
      }}
    >
      <Image src="/icone_google.webp" alt="" width={20} height={20} className="h-5 w-5 shrink-0 object-contain" />
      <span>{loading ? "Redirecionando…" : label}</span>
    </Button>
  );
}
