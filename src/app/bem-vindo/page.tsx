import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { AsciiCoach } from "@/components/workout/ascii-coach";
import { Illustration } from "@/components/ui/illustration";
import {
  FloatingBubble,
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
          "h-12 gap-2 rounded-xl px-6 text-base font-semibold shadow-[0_12px_28px_-14px_var(--primary)]",
          className,
        ),
      })}
    >
      {children}
      <ArrowRight className="h-4 w-4" />
    </Link>
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
              <Link href="/cadastro" className={buttonVariants({ className: "h-10 rounded-lg px-4 font-semibold" })}>
                Criar conta
              </Link>
            </nav>
          </div>
        </header>

        <main>
          {/* Hero: o Théo em holograma ASCII */}
          <section className="relative">
            <div className="mx-auto grid max-w-6xl items-center gap-4 px-4 pt-12 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:gap-10 lg:pt-20">
              <div className="relative z-10">
                <h1 className="text-[2.75rem] leading-[1.02] font-bold tracking-[-0.04em] text-balance text-foreground sm:text-6xl lg:text-7xl">
                  <Reveal as="span" immediate y={28} className="block">
                    Conheça o Théo.
                  </Reveal>
                  <Reveal as="span" immediate y={28} delay={0.12} className="block text-primary">
                    Seu personal de IA, direto de 2091.
                  </Reveal>
                </h1>
                <Reveal immediate delay={0.28}>
                  <p className="mt-6 max-w-[34rem] text-lg leading-relaxed text-muted-foreground">
                    Ele monta seus treinos, acompanha cada série e ajusta a carga com base nos seus dados reais — não em
                    achismo. Você só precisa aparecer.
                  </p>
                </Reveal>
                <Reveal immediate delay={0.4}>
                  <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                    <PrimaryCta />
                    <Link
                      href="/login"
                      className={buttonVariants({ variant: "outline", size: "lg", className: "h-12 rounded-xl px-6 text-base" })}
                    >
                      Já tenho conta
                    </Link>
                  </div>
                </Reveal>
                <Stagger
                  as="ul"
                  immediate
                  delay={0.55}
                  stagger={0.1}
                  className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground"
                >
                  {[
                    "Treinos montados pela IA",
                    "PRs detectados sozinhos",
                    "Calorias por foto do prato",
                    "Constância e conquistas",
                  ].map((item) => (
                    <StaggerItem as="li" key={item} className="flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                      {item}
                    </StaggerItem>
                  ))}
                </Stagger>
              </div>

              <div className="relative h-[400px] sm:h-[500px] lg:h-[600px]">
                <AsciiCoach className="absolute inset-0" />
                {/* Fala do Théo flutuando sobre o holograma */}
                <FloatingBubble className="absolute bottom-10 left-0 z-10 sm:left-4">
                  <div className="max-w-[17rem] rounded-2xl rounded-bl-sm border border-border bg-card p-3.5 shadow-[0_18px_40px_-20px_rgb(0_0_0/0.8)]">
                    <p className="flex items-center gap-2 text-xs font-semibold text-primary">
                      <Illustration name="theo" size={22} className="-my-1" />
                      Théo
                    </p>
                    <p className="mt-1.5 text-sm leading-snug text-foreground">
                      Seu supino subiu <strong className="text-primary">7,5 kg</strong> esse mês, monstro. Bora buscar os
                      90 kg?
                    </p>
                  </div>
                </FloatingBubble>
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
        </footer>
      </div>
    </LandingMotion>
  );
}
