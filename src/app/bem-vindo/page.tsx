import Link from "next/link";
import Image from "next/image";
import { Sparkles, Target, Trophy, Dumbbell, ArrowRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const FEATURES = [
  {
    icon: Sparkles,
    title: "Personal trainer de IA",
    description: "O Théo conhece seu treino real e te ajuda a qualquer hora — tira dúvida, ajusta carga ou adapta exercício por dor/lesão, na hora.",
  },
  {
    icon: Target,
    title: "Metas de carga com progresso",
    description: "Defina quanto quer levantar e acompanhe o progresso até chegar lá, com celebração quando bater a meta.",
  },
  {
    icon: Trophy,
    title: "PRs detectados sozinhos",
    description: "Todo recorde pessoal — carga, repetições, 1RM, volume — é identificado automaticamente enquanto você treina.",
  },
  {
    icon: Dumbbell,
    title: "Conquistas e nível",
    description: "Sequência de treinos, badges e XP para manter o hábito — sem virar rede social, só você contra sua própria evolução.",
  },
];

export default function BemVindoPage() {
  return (
    <div className="mx-auto min-h-full w-full max-w-md px-4 py-8 sm:max-w-lg lg:max-w-2xl">
      <header className="mb-10 flex items-center gap-2.5">
        <Image
          src="/logo-icon.png"
          alt="Treinai"
          width={32}
          height={32}
          className="h-8 w-8 rounded-lg"
        />
        <span className="text-lg font-bold tracking-tight text-foreground">Treinai</span>
      </header>

      <section className="mb-10 flex flex-col items-center text-center">
        <Image
          src="/ai-coach-avatar.png"
          alt="Théo, personal trainer de IA"
          width={96}
          height={96}
          priority
          className="mb-5 h-24 w-24 rounded-full ring-2 ring-primary/30"
        />
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Seu personal trainer de IA.
          <br />
          Sempre com você.
        </h1>
        <p className="mt-4 max-w-sm text-sm text-muted-foreground">
          Monte treinos, registre séries em segundos e deixe o Théo analisar sua evolução,
          ajustar cargas e adaptar exercícios — em tempo real, baseado nos seus dados de verdade.
        </p>

        <div className="mt-7 flex w-full max-w-xs flex-col gap-2.5">
          <Link
            href="/cadastro"
            className={buttonVariants({ size: "lg", className: "h-12 gap-2 text-base font-semibold" })}
          >
            Criar conta grátis
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/login"
            className={buttonVariants({ variant: "outline", size: "lg", className: "h-12 text-base" })}
          >
            Já tenho conta
          </Link>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {FEATURES.map((feature) => (
          <Card key={feature.title} className="gap-2 p-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 text-primary">
              <feature.icon className="h-4.5 w-4.5" />
            </div>
            <p className="font-semibold text-foreground">{feature.title}</p>
            <p className="text-sm text-muted-foreground">{feature.description}</p>
          </Card>
        ))}
      </section>

      <footer className="mt-10 flex flex-col items-center gap-3 pb-8 text-center">
        <p className="text-sm text-muted-foreground">Pronto para treinar com um plano que se adapta a você?</p>
        <Link
          href="/cadastro"
          className={buttonVariants({ size: "lg", className: "h-12 gap-2 px-8 text-base font-semibold" })}
        >
          Começar agora
          <ArrowRight className="h-4 w-4" />
        </Link>
      </footer>
    </div>
  );
}
