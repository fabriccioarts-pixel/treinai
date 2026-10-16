import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { AsciiCoach } from "@/components/workout/ascii-coach";
import { Illustration, type IllustrationName } from "@/components/ui/illustration";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Treinai — Seu personal trainer de IA",
  description:
    "Conheça o Théo: ele monta seus treinos, acompanha cada série e ajusta a carga com base nos seus dados reais. Ofensiva, PRs automáticos e conquistas para manter o hábito.",
};

const GOALS: { art: IllustrationName; label: string }[] = [
  { art: "hypertrophy", label: "Hipertrofia" },
  { art: "fat-loss", label: "Emagrecimento" },
  { art: "mass-gain", label: "Ganho de massa" },
  { art: "focus", label: "Ênfase muscular" },
];

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

const VOLUME_BARS = [38, 52, 47, 61, 70, 82];

function PrimaryCta({ className, children = "Criar conta grátis" }: { className?: string; children?: string }) {
  return (
    <Link
      href="/cadastro"
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
    <div className="max-w-md">
      <h2 className="text-3xl font-bold tracking-[-0.03em] text-balance text-foreground sm:text-4xl">{title}</h2>
      <div className="mt-4 space-y-3 text-base leading-relaxed text-muted-foreground">{children}</div>
    </div>
  );
}

export default function BemVindoPage() {
  return (
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
                Conheça o Théo.
                <span className="block text-primary">Seu personal de IA, direto de 2091.</span>
              </h1>
              <p className="mt-6 max-w-[34rem] text-lg leading-relaxed text-muted-foreground">
                Ele monta seus treinos, acompanha cada série e ajusta a carga com base nos seus dados reais — não em
                achismo. Você só precisa aparecer.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                <PrimaryCta />
                <Link
                  href="/login"
                  className={buttonVariants({ variant: "outline", size: "lg", className: "h-12 rounded-xl px-6 text-base" })}
                >
                  Já tenho conta
                </Link>
              </div>
              <ul className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
                {["Treinos montados pela IA", "PRs detectados sozinhos", "Ofensiva e conquistas"].map((item) => (
                  <li key={item} className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="relative h-[400px] sm:h-[500px] lg:h-[600px]">
              <AsciiCoach className="absolute inset-0" />
              {/* Fala do Théo flutuando sobre o holograma */}
              <div className="absolute bottom-10 left-0 z-10 max-w-[17rem] rounded-2xl rounded-bl-sm border border-border bg-card p-3.5 shadow-[0_18px_40px_-20px_rgb(0_0_0/0.8)] sm:left-4">
                <p className="flex items-center gap-2 text-xs font-semibold text-primary">
                  <Illustration name="theo" size={22} className="-my-1" />
                  Théo
                </p>
                <p className="mt-1.5 text-sm leading-snug text-foreground">
                  Seu supino subiu <strong className="text-primary">7,5 kg</strong> esse mês, monstro. Bora buscar os
                  90 kg?
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Como começa */}
        <section className="border-t border-border/60 py-20 sm:py-24">
          <div className="mx-auto grid max-w-6xl gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:items-center">
            <SectionCopy title="Diga o que você quer. O treino sai pronto.">
              <p>
                Escolha seu objetivo e quantos dias por semana dá pra treinar. O Théo monta a divisão inteira e salva
                direto no app — sem planilha, sem questionário infinito.
              </p>
            </SectionCopy>
            <div className="grid grid-cols-2 gap-3">
              {GOALS.map((g) => (
                <div
                  key={g.art}
                  className="flex items-center gap-2 rounded-2xl border border-border bg-card p-3 pr-4 shadow-[inset_0_1px_0_oklch(1_0_0/0.05)]"
                >
                  <Illustration name={g.art} size={64} className="-my-2" />
                  <span className="min-w-0 text-sm font-semibold text-foreground [hyphens:auto]">{g.label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Chat com o Théo */}
        <section className="border-t border-border/60 py-20 sm:py-24">
          <div className="mx-auto grid max-w-6xl gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:items-center">
            <div className="order-2 lg:order-1">
              <div className="mx-auto max-w-md space-y-3 rounded-3xl border border-border bg-card p-4 shadow-[inset_0_1px_0_oklch(1_0_0/0.06)] sm:p-5">
                <div className="flex justify-end">
                  <p className="max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-4 py-3 text-sm font-medium text-primary-foreground">
                    Sinto dor no ombro, dá pra trocar o supino por outro exercício?
                  </p>
                </div>
                <div className="max-w-[92%] rounded-2xl rounded-tl-sm border border-border bg-secondary/50 p-4">
                  <p className="text-sm leading-relaxed text-foreground">
                    Bora adaptar, parceiro. Troquei o <strong>supino reto</strong> pelo{" "}
                    <strong>crucifixo na máquina</strong>: menos estresse no ombro, mesmo estímulo no peitoral. Se a dor
                    continuar, procura um fisioterapeuta antes de voltar com carga.
                  </p>
                  <div className="mt-3 flex items-center gap-2.5 rounded-xl border border-primary/30 bg-primary/5 p-2.5">
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-primary" />
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold tracking-wider text-primary uppercase">Treino atualizado</p>
                      <p className="truncate text-sm font-semibold text-foreground">Treino A — Peito e Tríceps</p>
                    </div>
                  </div>
                </div>
              </div>
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

        {/* Ofensiva: faixa de destaque */}
        <section className="border-y border-border/60 bg-card/40 py-20 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <SectionCopy title="Mantenha a ofensiva. O Théo percebe.">
              <p>
                Cada dia de treino aumenta sua ofensiva — e o Théo reage. Se você sumir, ele fica preocupado. Passou de
                30 dias, vira lenda.
              </p>
            </SectionCopy>
            <ol className="no-scrollbar -mx-4 mt-12 flex snap-x gap-3 overflow-x-auto px-4 sm:mx-0 sm:grid sm:grid-cols-5 sm:overflow-visible sm:px-0">
              {STREAK_STAGES.map((s, i) => {
                const gold = s.img === "legendary";
                return (
                  <li
                    key={s.img}
                    className={cn(
                      "w-40 shrink-0 snap-start overflow-hidden rounded-2xl border bg-card sm:w-auto",
                      gold ? "border-gold/40" : "border-border",
                    )}
                  >
                    <Image
                      src={`/theo/${s.img}.jpg`}
                      alt={`Théo no estágio ${s.label}`}
                      width={240}
                      height={240}
                      className="aspect-square w-full mix-blend-screen"
                      style={{
                        maskImage: "linear-gradient(to bottom, black 75%, transparent)",
                        WebkitMaskImage: "linear-gradient(to bottom, black 75%, transparent)",
                      }}
                    />
                    <div className="px-3.5 pb-3.5">
                      <p className={cn("tabular text-xl font-bold tracking-tight", gold ? "text-gold" : "text-foreground")}>
                        {s.days}
                      </p>
                      <p className="text-sm text-muted-foreground">{s.label}</p>
                    </div>
                    <span className="sr-only">Estágio {i + 1} de {STREAK_STAGES.length}</span>
                  </li>
                );
              })}
            </ol>
          </div>
        </section>

        {/* Evolução e PRs */}
        <section className="py-20 sm:py-24">
          <div className="mx-auto grid max-w-6xl gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:items-center">
            <SectionCopy title="Seus recordes aparecem sozinhos.">
              <p>
                Registre as séries em segundos. Todo PR — de carga, repetições, 1RM estimado ou volume — é detectado
                automaticamente, e o volume da semana mostra se você está evoluindo de verdade.
              </p>
            </SectionCopy>
            <div className="rounded-3xl border border-border bg-card p-5 shadow-[inset_0_1px_0_oklch(1_0_0/0.06)]">
              <div className="flex items-start justify-between">
                <p className="text-sm font-medium text-muted-foreground">Volume da semana</p>
                <span className="tabular rounded-full bg-primary/12 px-2 py-0.5 text-xs font-semibold text-primary">
                  +17% vs anterior
                </span>
              </div>
              <p className="mt-1 flex items-baseline gap-1.5">
                <span className="tabular text-5xl leading-none font-bold tracking-[-0.04em] text-foreground">12.480</span>
                <span className="text-lg font-semibold text-muted-foreground">kg</span>
              </p>
              <div className="mt-6 flex h-24 items-end gap-2" aria-hidden>
                {VOLUME_BARS.map((h, i) => (
                  <div
                    key={i}
                    className={cn(
                      "flex-1 rounded-md",
                      i === VOLUME_BARS.length - 1 ? "bg-primary shadow-[0_8px_20px_-8px_var(--primary)]" : "bg-foreground/[0.09]",
                    )}
                    style={{ height: `${h}%` }}
                  />
                ))}
              </div>
              <div className="mt-5 flex items-center gap-3 rounded-xl border border-gold/25 bg-gold/5 p-3">
                <Illustration name="pr" size={44} className="-my-2" />
                <div className="min-w-0">
                  <p className="text-[10px] font-bold tracking-wider text-gold uppercase">Novo recorde</p>
                  <p className="tabular truncate text-sm font-semibold text-foreground">Agachamento · 120 kg × 6</p>
                </div>
              </div>
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
            <ul className="grid grid-cols-4 gap-x-2 gap-y-5">
              {BADGES.map((b) => (
                <li key={b.key} className="flex flex-col items-center gap-1.5 text-center">
                  <Image
                    src={`/badges/${b.key}.png`}
                    alt=""
                    width={96}
                    height={96}
                    className="h-[72px] w-[72px] mix-blend-screen sm:h-24 sm:w-24"
                  />
                  <span className="text-xs leading-tight text-muted-foreground">{b.label}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Chamada final */}
        <section className="border-t border-border/60">
          <div className="mx-auto flex max-w-6xl flex-col items-center px-4 pt-16 pb-20 text-center sm:px-6 sm:pt-20">
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
          </div>
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
  );
}
