"use client";

import { useActionState } from "react";
import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { registerAction, type ActionState } from "@/app/actions/auth-actions";

const initialState: ActionState = {};

export default function CadastroPage() {
  const [state, formAction, pending] = useActionState(registerAction, initialState);

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

      <form action={formAction} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="name">Nome</Label>
          <Input id="name" name="name" required autoComplete="name" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">E-mail</Label>
          <Input id="email" name="email" type="email" required autoComplete="email" />
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
