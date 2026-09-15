"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Sparkles } from "lucide-react";
import { AuthShell } from "@/components/auth/auth-shell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { AsciiEffect } from "@/components/ui/ascii-effect";

const LAST_PROVIDER_KEY = "treinai_last_login_provider";

function LoginForm() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/";
  const justReset = searchParams.get("reset") === "success";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [lastProvider, setLastProvider] = useState<string | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(LAST_PROVIDER_KEY);
      if (saved) setLastProvider(saved);
    } catch {}
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await signIn("credentials", { email, password, redirect: false, callbackUrl });
    setLoading(false);
    if (res?.error) {
      setError("E-mail ou senha incorretos.");
      return;
    }
    try {
      localStorage.setItem(LAST_PROVIDER_KEY, "credentials");
    } catch {}
    window.location.href = callbackUrl;
  }

  return (
    <AuthShell
      title="Entrar no Treinai"
      subtitle="Registre séries e acompanhe sua evolução"
      background={
        <div className="h-[520px] w-full max-w-xl overflow-hidden rounded-2xl opacity-40">
          <AsciiEffect
            variant="image"
            imageSrc="/Treinai/bg-login.jpg"
            fontSize={9}
            scale={1.15}
          />
        </div>
      }
      footer={
        <>
          Não tem conta?{" "}
          <Link href="/cadastro" className="font-medium text-foreground hover:underline">
            Cadastre-se
          </Link>
        </>
      }
    >
      <div className="relative">
        <Button
          type="button"
          variant="outline"
          size="lg"
          className={`relative h-12 w-full gap-3 font-medium transition-all hover:bg-secondary/70 ${
            lastProvider === "google"
              ? "border-primary/50 shadow-sm shadow-primary/10 ring-1 ring-primary/30"
              : ""
          }`}
          disabled={googleLoading}
          onClick={() => {
            try {
              localStorage.setItem(LAST_PROVIDER_KEY, "google");
            } catch {}
            setGoogleLoading(true);
            signIn("google", { callbackUrl });
          }}
        >
          <Image
            src="/icone_google.webp"
            alt="Google"
            width={20}
            height={20}
            className="h-5 w-5 shrink-0 object-contain"
          />
          <span>{googleLoading ? "Redirecionando…" : "Entrar com Google"}</span>
        </Button>

        {lastProvider === "google" && (
          <span className="pointer-events-none absolute -top-2.5 right-3 inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary-foreground shadow-md shadow-primary/25">
            <Sparkles className="h-3 w-3" />
            Último login realizado
          </span>
        )}
      </div>

      <div className="my-5 flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs text-muted-foreground">ou com e-mail</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      {justReset && (
        <p className="mb-4 rounded-lg bg-primary/10 px-3 py-2 text-sm text-primary">
          Senha redefinida! Entre com sua nova senha.
        </p>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">E-mail</Label>
          <Input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Senha</Label>
            <Link href="/esqueci-senha" className="text-xs text-muted-foreground hover:underline">
              Esqueci minha senha
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button type="submit" size="lg" className="h-11 w-full" disabled={loading}>
          {loading ? "Entrando…" : "Entrar"}
        </Button>
      </form>
    </AuthShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
