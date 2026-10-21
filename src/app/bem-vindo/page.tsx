import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Lock, Sparkles, Timer } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import {
  LandingMotion,
  Reveal,
  Stagger,
  StaggerItem,
} from "@/components/landing/landing-motion";
import { TheoChatDemo } from "@/components/landing/theo-chat-demo";
import { StreakDemo } from "@/components/landing/streak-demo";
import { PrDemo } from "@/components/landing/pr-demo";
import { NutritionDemo } from "@/components/landing/nutrition-demo";
import { ExerciseReel } from "@/components/landing/exercise-reel";
import { LaunchVideo } from "@/components/landing/launch-video";
import { PaymentMethods } from "@/components/landing/payment-methods";
import { HeroVisual } from "@/components/landing/hero-visual";
import { QuizTeaser } from "@/components/landing/quiz-teaser";
import { AreaCards } from "@/components/landing/area-cards";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Treinai — Seu personal trainer de IA",
  description:
    "Conheça o Théo: ele monta seus treinos, acompanha cada série e ajusta a carga com base nos seus dados reais. Constância, PRs automáticos e conquistas para manter o hábito.",
};

const STREAK_STAGES = [
  { img: "starting", days: "1 dia", label: "Começando" },
  { img: "warming", days: "3 dias", label: "Aquecendo" },
  { img: "on-fire", days: "7 dias", label: "Pegando fogo" },
  { img: "beast", days: "14 dias", label: "Modo monstro" },
  { img: "legendary", days: "30 dias", label: "Lendário" },
];

const BADGES = [
  { key: "primeiro-treino", label: "Primeiro treino" },
  { key: "primeiro-pr", label: "Primeiro PR" },
  { key: "sequencia-7", label: "Uma semana em chamas" },
  { key: "sequencia-30", label: "Hábito formado" },
  { key: "treinos-100", label: "Cem treinos" },
  { key: "prs-20", label: "Máquina de PRs" },
  { key: "volume-10t", label: "Dez toneladas" },
  { key: "primeira-meta", label: "Meta batida" },
];

/** Entrada do funil: diagnóstico grátis → contato → resultado e oferta → cadastro com teste grátis */
function PrimaryCta({ className, children = "Fazer meu diagnóstico grátis" }: { className?: string; children?: string }) {
  return (
    <Link
      href="/diagnostico"
      className={buttonVariants({
        size: "lg",
        className: cn(
          "cta-shine group h-14 gap-2 rounded-full px-7 text-base font-semibold",
          className,
        ),
      })}
    >
      {children}
      <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
    </Link>
  );
}

/** O que tira o medo de começar: tempo, teste grátis e sem cartão */
function TrustLine({ className }: { className?: string }) {
  return (
    <ul className={cn("flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-muted-foreground", className)}>
      <li className="flex items-center gap-1.5">
        <Timer className="h-4 w-4 text-primary" />3 minutos
      </li>
      <li className="flex items-center gap-1.5">
        <Sparkles className="h-4 w-4 text-primary" />3 dias grátis
      </li>
      <li className="flex items-center gap-1.5">
        <Lock className="h-4 w-4 text-primary" />
        Sem cartão agora
      </li>
    </ul>
  );
}

function SectionCopy({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Reveal className="max-w-md">
      <h2 className="text-3xl font-bold tracking-[-0.03em] text-balance text-foreground sm:text-4xl">{title}</h2>
      <div className="mt-4 space-y-3 text-base leading-relaxed text-muted-foreground">{children}</div>
    </Reveal>
  );
}

export default function BemVindoPage() {
  return (
    <LandingMotion>
      <div className="min-h-full w-full overflow-x-hidden">
        {/* Navegação */}
        <header className="sticky top-0 z-30 border-b border-border/60 bg-background/90 backdrop-blur-md">
          <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
            <Link href="/bem-vindo" className="flex items-center gap-2.5">
              <Image src="/logo-icon.png" alt="" width={32} height={32} className="h-8 w-8 rounded-lg" />
              <span className="text-lg font-bold tracking-tight text-foreground">Treinai</span>
            </Link>
            <nav className="flex items-center gap-1.5">
              <Link href="/login" className={buttonVariants({ variant: "ghost", className: "h-10 px-4" })}>
                Entrar
              </Link>
              <Link href="/diagnostico" className={buttonVariants({ className: "h-10 rounded-full px-4 font-semibold" })}>
                Diagnóstico grátis
              </Link>
            </nav>
          </div>
        </header>

        <main>
          {/* Hero: foto com os selos do diagnóstico, no estilo da abertura do quiz */}
          <section className="relative">
            {/* Luz verde difusa atrás do hero */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 -top-16 -z-10 h-[46rem]"
              style={{
                background:
                  "radial-gradient(ellipse 70% 55% at 70% 20%, color-mix(in oklch, var(--primary) 16%, transparent), transparent 70%)",
              }}
            />
            <div className="mx-auto grid max-w-6xl items-center gap-6 px-4 sm:px-6 sm:pt-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14 lg:pt-16">
              <div className="order-1 lg:order-2">
                <Reveal immediate y={16}>
                  <HeroVisual />
                </Reveal>
              </div>
              <div className="relative z-10 order-2 -mt-24 sm:mt-0 lg:order-1">
                <Reveal immediate>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold tracking-wide text-primary uppercase">
                    <Sparkles className="h-3.5 w-3.5" />
                    Lançamento · 3 dias grátis
                  </span>
                </Reveal>
                <h1 className="mt-5 text-[2.6rem] leading-[1.02] font-bold tracking-[-0.04em] text-balance text-foreground sm:text-6xl lg:text-7xl">
                  <Reveal as="span" immediate y={28} delay={0.08} className="block">
                    Conheça o Théo.
                  </Reveal>
                  <Reveal as="span" immediate y={28} delay={0.18} className="block text-primary">
                    Seu personal de IA, direto de 2091.
                  </Reveal>
                </h1>
                <Reveal immediate delay={0.3}>
                  <p className="mt-6 max-w-[34rem] text-lg leading-relaxed text-muted-foreground">
                    Ele monta seus treinos, acompanha cada série e ajusta a carga com base nos seus dados reais, não em
                    achismo. Comece pelo diagnóstico grátis: em 3 minutos você sabe o que está travando a sua evolução.
                  </p>
                </Reveal>
                <Reveal immediate delay={0.42}>
                  <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                    <PrimaryCta />
                    <Link
                      href="/login"
                      className={buttonVariants({ variant: "ghost", size: "lg", className: "h-14 rounded-full px-6 text-base" })}
                    >
                      Já tenho conta
                    </Link>
                  </div>
                  <TrustLine className="mt-6" />
                </Reveal>
              </div>
            </div>
          </section>

          {/* Diagnóstico dentro da landing: a primeira pergunta já se responde aqui */}
          <section className="pt-20 pb-6 sm:pt-28">
            <div className="mx-auto grid max-w-6xl gap-10 px-4 sm:px-6 lg:grid-cols-[1fr_0.9fr] lg:items-center lg:gap-16">
              <div>
                <SectionCopy title="Descubra em 3 minutos o que está travando a sua evolução.">
                  <p>
                    Um diagnóstico grátis, com perguntas rápidas sobre a sua rotina. No fim, você vê sua nota de 0 a 100
                    em cada área e por onde o Théo começa com você.
                  </p>
                </SectionCopy>
                <Stagger as="ol" stagger={0.1} className="mt-8 space-y-4">
                  {[
                    { title: "Responda com sinceridade", text: "Treino, constância, sono, alimentação e água." },
                    { title: "Veja sua nota em cada área", text: "Com sua meta de água, calorias e proteína." },
                    { title: "Comece com o Théo", text: "3 dias grátis, sem cartão. Cancele quando quiser." },
                  ].map((step, i) => (
                    <StaggerItem as="li" key={step.title} className="flex gap-4">
                      <span className="tabular flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-primary/40 bg-primary/10 text-sm font-bold text-primary">
                        {i + 1}
                      </span>
                      <span>
                        <span className="block font-semibold text-foreground">{step.title}</span>
                        <span className="mt-0.5 block text-sm text-muted-foreground">{step.text}</span>
                      </span>
                    </StaggerItem>
                  ))}
                </Stagger>
              </div>
              <Reveal>
                <QuizTeaser />
              </Reveal>
            </div>
          </section>

          {/* As cinco áreas, com as pessoas de corpo real do quiz */}
          <section className="py-20 sm:py-24">
            <div className="mx-auto max-w-6xl px-4 sm:px-6">
              <Reveal className="max-w-2xl">
                <h2 className="text-3xl font-bold tracking-[-0.03em] text-balance text-foreground sm:text-4xl">
                  Cinco áreas. Uma nota pra cada. Um plano que começa pela mais fraca.
                </h2>
              </Reveal>
              <div className="mt-10">
                <AreaCards />
              </div>
            </div>
          </section>

          {/* Vídeo de apresentação */}
          <section className="pt-6 pb-20 sm:pb-24">
            <Reveal className="mx-auto max-w-5xl px-4 sm:px-6">
              <LaunchVideo />
            </Reveal>
          </section>

          {/* Como começa */}
          <section className="border-t border-border/60 py-20 sm:py-24">
            <div className="mx-auto grid max-w-6xl gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:items-center">
              <SectionCopy title="Peça em uma frase. O treino sai pronto.">
                <p>
                  Diga o que quer treinar ou qual é o seu objetivo. O Théo monta a divisão inteira, com séries e
                  repetições, e salva direto no app — sem planilha, sem questionário infinito.
                </p>
              </SectionCopy>
              <TheoChatDemo />
            </div>
          </section>

          {/* Chat com o Théo */}
          <section className="border-t border-border/60 py-20 sm:py-24">
            <div className="mx-auto grid max-w-6xl gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:items-center">
              <div className="order-2 lg:order-1">
                <TheoChatDemo variant="adapt" />
              </div>
              <div className="order-1 lg:order-2">
                <SectionCopy title="Um personal que conhece cada série que você já fez.">
                  <p>
                    O Théo lê seu histórico de verdade: cargas, repetições, recordes. Pergunte da sua evolução, peça um
                    treino novo ou avise que algo dói — ele ajusta e salva o treino na hora.
                  </p>
                  <p>Disponível a qualquer hora, sem horário marcado.</p>
                </SectionCopy>
              </div>
            </div>
          </section>

          {/* Execução dos exercícios */}
          <section className="border-t border-border/60 py-20 sm:py-24">
            <div className="mx-auto grid max-w-6xl gap-12 px-4 sm:px-6 lg:grid-cols-[1fr_1.1fr] lg:items-center">
              <SectionCopy title="Execução certa, não só o nome do exercício.">
                <p>
                  Cada exercício da biblioteca tem um vídeo curto mostrando a forma certa, com o músculo
                  trabalhado em destaque — direto na tela do treino, sem precisar sair do app pra pesquisar.
                </p>
              </SectionCopy>
              <ExerciseReel />
            </div>
          </section>

          {/* Constância: faixa de destaque */}
          <section className="border-y border-border/60 bg-card/40 py-20 sm:py-24">
            <div className="mx-auto grid max-w-6xl gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:items-center">
              <div>
                <SectionCopy title="Mantenha a constância. O Théo percebe.">
                  <p>
                    Cada dia de treino aumenta sua constância — e o Théo reage. Se você sumir, ele fica preocupado. Passou
                    de 30 dias, vira lenda.
                  </p>
                </SectionCopy>
                <Stagger as="ol" stagger={0.08} className="mt-8 flex flex-wrap gap-2">
                  {STREAK_STAGES.map((s) => (
                    <StaggerItem
                      as="li"
                      key={s.img}
                      className={cn(
                        "flex items-center gap-1.5 rounded-full border bg-card py-1 pr-3 pl-1 text-xs",
                        s.img === "legendary" ? "border-gold/40 text-gold" : "border-border text-muted-foreground",
                      )}
                    >
                      <Image src={`/theo/${s.img}.jpg`} alt="" width={24} height={24} className="h-6 w-6 rounded-full mix-blend-screen" />
                      <span className="tabular font-semibold text-foreground">{s.days}</span>
                      {s.label}
                    </StaggerItem>
                  ))}
                </Stagger>
              </div>
              <StreakDemo />
            </div>
          </section>

          {/* Evolução e PRs */}
          <section className="py-20 sm:py-24">
            <div className="mx-auto grid max-w-6xl gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:items-center">
              <SectionCopy title="Seus recordes aparecem sozinhos.">
                <p>
                  Registre as séries em segundos. Todo PR — de carga, repetições, 1RM estimado ou volume — é detectado
                  na hora, no meio do treino, sem você precisar anotar nada.
                </p>
              </SectionCopy>
              <PrDemo />
            </div>
          </section>

          {/* Nutrição e água */}
          <section className="border-t border-border/60 py-20 sm:py-24">
            <div className="mx-auto grid max-w-6xl gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:items-center">
              <div className="order-2 lg:order-1">
                <NutritionDemo />
              </div>
              <div className="order-1 lg:order-2">
                <SectionCopy title="Tire uma foto do prato. As calorias aparecem sozinhas.">
                  <p>
                    O Théo calcula suas metas de calorias, macros e água a partir do seu perfil e rotina. Para
                    registrar uma refeição, basta uma foto — ou escrever do seu jeito — e ele estima tudo na
                    hora.
                  </p>
                  <p>Água também é um toque: sem formulário, sem fricção.</p>
                </SectionCopy>
              </div>
            </div>
          </section>

          {/* Conquistas */}
          <section className="border-t border-border/60 py-20 sm:py-24">
            <div className="mx-auto grid max-w-6xl gap-12 px-4 sm:px-6 lg:grid-cols-[1fr_1.1fr] lg:items-center">
              <SectionCopy title="Conquistas que dão vontade de colecionar.">
                <p>
                  Metas de carga, nível e XP e emblemas para cada marco — do primeiro treino às dez toneladas
                  levantadas. Sem rede social: só você contra a sua própria evolução.
                </p>
              </SectionCopy>
              <Stagger as="ul" stagger={0.07} className="grid grid-cols-4 gap-x-2 gap-y-5">
                {BADGES.map((b) => (
                  <StaggerItem
                    as="li"
                    key={b.key}
                    className="flex flex-col items-center gap-1.5 text-center transition-transform duration-300 hover:-translate-y-1 hover:scale-105"
                  >
                    <Image
                      src={`/badges/${b.key}.png`}
                      alt=""
                      width={96}
                      height={96}
                      className="h-[72px] w-[72px] mix-blend-screen sm:h-24 sm:w-24"
                    />
                    <span className="text-xs leading-tight text-muted-foreground">{b.label}</span>
                  </StaggerItem>
                ))}
              </Stagger>
            </div>
          </section>

          {/* Chamada final */}
          <section className="border-t border-border/60">
            <Reveal className="mx-auto flex max-w-6xl flex-col items-center px-4 pt-16 pb-20 text-center sm:px-6 sm:pt-20">
              <Image
                src="/theo/legendary.jpg"
                alt="Théo lendário"
                width={220}
                height={220}
                className="mix-blend-screen"
                style={{
                  maskImage: "linear-gradient(to bottom, black 70%, transparent)",
                  WebkitMaskImage: "linear-gradient(to bottom, black 70%, transparent)",
                }}
              />
              <h2 className="mt-2 max-w-2xl text-4xl font-bold tracking-[-0.04em] text-balance text-foreground sm:text-5xl">
                A Grande Atrofia não vai pegar você.
              </h2>
              <p className="mt-4 max-w-md text-base leading-relaxed text-muted-foreground">
                O Théo atravessou o tempo pra te fazer treinar. O primeiro treino fica pronto em minutos.
              </p>
              <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
                <PrimaryCta>Começar agora</PrimaryCta>
                <Link href="/login" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground sm:ml-3">
                  Já tenho conta
                </Link>
              </div>
              <TrustLine className="mt-6 justify-center" />
            </Reveal>
          </section>
        </main>

        <footer className="border-t border-border/60">
          <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-6 text-sm text-muted-foreground sm:flex-row sm:px-6">
            <span className="flex items-center gap-2">
              <Image src="/logo-icon.png" alt="" width={20} height={20} className="h-5 w-5 rounded" />
              Treinai
            </span>
            <span>O Théo é um assistente de IA e não substitui orientação médica.</span>
          </div>
          <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 border-t border-border/40 px-4 py-5 text-xs text-muted-foreground sm:flex-row sm:px-6">
            <span className="flex items-center gap-1.5">
              <Lock className="h-3.5 w-3.5" />
              Pagamento seguro pela Cakto
            </span>
            <PaymentMethods className="flex items-center gap-4 text-muted-foreground/80" />
          </div>
        </footer>
      </div>
    </LandingMotion>
  );
}
