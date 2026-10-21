"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { registerAction, type ActionState } from "@/app/actions/auth-actions";

const initialState: ActionState = {};

/** Nome e e-mail já informados no diagnóstico (/diagnostico), para não pedir de novo */
function readDiagnosticContact(): { name: string; email: string } | null {
  try {
    const saved = JSON.parse(localStorage.getItem("treinai.diagnostico") ?? "null");
    const name = typeof saved?.answers?.nome === "string" ? saved.answers.nome.trim() : "";
    const email = typeof saved?.email === "string" ? saved.email.trim() : "";
    return name || email ? { name, email } : null;
  } catch {
    return null;
  }
}

export default function CadastroPage() {
  const [state, formAction, pending] = useActionState(registerAction, initialState);
  const [prefill, setPrefill] = useState<{ name: string; email: string } | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage só existe no navegador
    setPrefill(readDiagnosticContact());
  }, []);

  return (
    <AuthShell
      title="Criar sua conta"
      subtitle="Monte seus treinos e acompanhe sua evolução"
      footer={
        <>
          Já tem conta?{" "}
          <Link href="/login" className="font-medium text-foreground hover:underline">
            Entrar
          </Link>
        </>
      }
    >
      <GoogleSignInButton label="Cadastrar com Google" callbackUrl="/bem-vindo/objetivo" />

      <div className="my-5 flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs text-muted-foreground">ou com e-mail</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <form key={prefill ? "prefill" : "empty"} action={formAction} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="name">Nome</Label>
          <Input id="name" name="name" required autoComplete="name" defaultValue={prefill?.name} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">E-mail</Label>
          <Input id="email" name="email" type="email" required autoComplete="email" defaultValue={prefill?.email} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Senha</Label>
          <Input
            id="password"
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
          />
          <p className="text-xs text-muted-foreground">Mínimo de 8 caracteres.</p>
        </div>

        {state.error && <p className="text-sm text-destructive">{state.error}</p>}

        <Button type="submit" size="lg" className="h-11 w-full" disabled={pending}>
          {pending ? "Criando conta…" : "Criar conta"}
        </Button>
      </form>
    </AuthShell>
  );
}
