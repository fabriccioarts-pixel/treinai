"use client";

import { useActionState } from "react";
import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { requestResetAction, type ActionState } from "@/app/actions/auth-actions";

const initialState: ActionState = {};

export default function EsqueciSenhaPage() {
  const [state, formAction, pending] = useActionState(requestResetAction, initialState);

  return (
    <AuthShell
      title="Esqueci minha senha"
      subtitle="Enviaremos um link para redefinir sua senha"
      footer={
        <Link href="/login" className="font-medium text-foreground hover:underline">
          Voltar para o login
        </Link>
      }
    >
      {state.ok ? (
        <p className="rounded-lg bg-primary/10 px-3 py-3 text-sm text-primary">
          Se esse e-mail estiver cadastrado, você vai receber um link de redefinição em instantes.
        </p>
      ) : (
        <form action={formAction} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" name="email" type="email" required autoComplete="email" />
          </div>

          {state.error && <p className="text-sm text-destructive">{state.error}</p>}

          <Button type="submit" size="lg" className="h-11 w-full" disabled={pending}>
            {pending ? "Enviando…" : "Enviar link de redefinição"}
          </Button>
        </form>
      )}
    </AuthShell>
  );
}
