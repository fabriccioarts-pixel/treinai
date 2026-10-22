"use client";

import { useCallback, useEffect, useId, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { AsciiCoach } from "@/components/workout/ascii-coach";
import { cn } from "@/lib/utils";

/** Visto no aparelho: o tour é uma apresentação, não um dado da conta */
const SEEN_KEY = "treinai:tour-visto";
/** O Perfil reabre o tour mandando para a home com este parâmetro */
export const TOUR_QUERY = "tour";
/** Avisa quem espera o tour (o pop-up de lembretes) que ele fechou */
export const TOUR_CLOSED_EVENT = "treinai:tour-closed";

let tourActive = false;

interface TourStep {
  /** Valor de data-tour do elemento destacado; sem alvo, o passo aparece no meio da tela */
  target?: string;
  title: string;
  body: string;
}

const STEPS: TourStep[] = [
  {
    title: "Boas-vindas ao Treinai",
    body: "Em menos de um minuto eu te mostro onde fica cada coisa. Se preferir explorar por conta própria, é só pular.",
  },
  {
    target: "instalar",
    title: "Coloque na tela inicial",
    body: "O Treinai ainda não está nas lojas: você instala direto daqui. Abre em tela cheia, como um app, e no iPhone libera os lembretes.",
  },
  {
    target: "treino-hoje",
    title: "Treino de hoje",
    body: "O app escolhe o próximo treino da sua divisão. Toque para começar e registrar cada série com carga e repetições.",
  },
  {
    target: "nutricao",
    title: "Comida e água",
    body: "Registre refeições e copos de água por aqui. O app compara com a sua meta do dia.",
  },
  {
    target: "atalhos",
    title: "Atalhos",
    body: "Crie um treino novo ou vá direto para recordes, fotos de evolução e metas.",
  },
  {
    target: "missoes",
    title: "Missões da semana",
    body: "Treinar e registrar dá XP. Missões fechadas rendem conquistas e escudos que protegem sua sequência.",
  },
  {
    target: "nav-treinos",
    title: "Treinos",
    body: "Todos os seus treinos. Crie, edite e veja a demonstração de cada exercício.",
  },
  {
    target: "nav-theo",
    title: "Théo, seu treinador",
    body: "Peça um treino, troque um exercício que incomoda ou conte o que comeu. Por texto ou por voz.",
  },
  {
    target: "nav-progresso",
    title: "Progresso",
    body: "Gráficos de carga e volume, recordes pessoais, fotos e metas.",
  },
  {
    target: "nav-perfil",
    title: "Perfil",
    body: "Seu plano de calorias e água, lembretes e preferências. Dá para rever este tour por lá.",
  },
  {
    title: "Tudo pronto",
    body: "Comece pelo treino de hoje. Qualquer dúvida no caminho, chama o Théo.",
  },
];

const HOLE_PADDING = 6;
const EDGE = 16;
const CARD_MAX_WIDTH = 360;
/** Distância entre o cartão e o destaque */
const CARD_GAP = 12;
/** Altura típica do cartão antes da primeira medição */
const CARD_HEIGHT_ESTIMATE = 190;
/** Altura da barra de navegação fixa, para não deixar o destaque escondido atrás dela */
const BOTTOM_NAV_SPACE = 88;

type Rect = { top: number; left: number; width: number; height: number };

function findTarget(step: TourStep | undefined): HTMLElement | null {
  if (!step?.target) return null;
  return document.querySelector<HTMLElement>(`[data-tour="${step.target}"]`);
}

/** Passo existe na tela? Os sem alvo sempre existem; os outros dependem do que a home mostrou */
function isAvailable(step: TourStep) {
  return !step.target || findTarget(step) !== null;
}

/**
 * Outro pop-up da home deve esperar o tour? Sim enquanto ele está aberto ou ainda vai abrir sozinho
 * (primeira visita deste aparelho, ou /?tour=1 vindo do Perfil). Nesses casos, espere TOUR_CLOSED_EVENT.
 */
export function tourBlocksPopups() {
  return tourActive || !wasSeen() || new URLSearchParams(window.location.search).has(TOUR_QUERY);
}

function markSeen() {
  try {
    localStorage.setItem(SEEN_KEY, "1");
  } catch {
    // Sem armazenamento: o tour volta na próxima visita, o que é melhor que travar
  }
}

function wasSeen() {
  try {
    return localStorage.getItem(SEEN_KEY) === "1";
  } catch {
    return false;
  }
}

function sameRect(a: Rect | null, b: Rect | null) {
  return (
    a === b ||
    (!!a && !!b && a.top === b.top && a.left === b.left && a.width === b.width && a.height === b.height)
  );
}

/**
 * Tour de boas-vindas da home: destaca cada parte do app com uma explicação curta.
 * Abre sozinho na primeira visita do aparelho (ou por /?tour=1, vindo do Perfil) e sempre dá para pular.
 */
export function AppTour() {
  const pathname = usePathname();
  const [index, setIndex] = useState<number | null>(null);
  const [rect, setRect] = useState<Rect | null>(null);
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const [cardHeight, setCardHeight] = useState(CARD_HEIGHT_ESTIMATE);
  const cardRef = useRef<HTMLDivElement>(null);
  const primaryRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const bodyId = useId();

  // Só na home: é lá que estão os elementos apresentados
  useEffect(() => {
    if (pathname !== "/") return;
    const params = new URLSearchParams(window.location.search);
    const forced = params.has(TOUR_QUERY);
    if (!forced && wasSeen()) return;
    // Espera a home assentar antes de medir os elementos
    const timer = setTimeout(() => {
      // Tira o ?tour=1 só ao abrir: se o efeito rodar de novo antes disso, o pedido continua valendo
      if (forced) {
        params.delete(TOUR_QUERY);
        const query = params.toString();
        window.history.replaceState(null, "", query ? `/?${query}` : "/");
      }
      tourActive = true;
      setIndex(0);
    }, forced ? 300 : 900);
    return () => clearTimeout(timer);
  }, [pathname]);

  const step = index === null ? undefined : STEPS[index];
  const open = step !== undefined;

  // Rola até o alvo deixando espaço para o cartão; a barra de baixo é fixa e não precisa de rolagem
  useEffect(() => {
    const el = findTarget(step);
    if (!el || el.closest("nav.fixed")) return;
    const r = el.getBoundingClientRect();
    const visibleBottom = window.innerHeight - BOTTOM_NAV_SPACE;
    const cardSpace = (cardRef.current?.offsetHeight ?? CARD_HEIGHT_ESTIMATE) + CARD_GAP + EDGE;
    const roomAbove = r.top >= cardSpace && r.bottom <= visibleBottom;
    const roomBelow = r.top >= EDGE && r.bottom + cardSpace <= visibleBottom;
    if (roomAbove || roomBelow) return;
    // Alvo logo abaixo do cartão quando os dois cabem juntos; alvo alto demais começa no topo
    const desiredTop = r.height + cardSpace <= visibleBottom - EDGE ? cardSpace : EDGE;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollBy({ top: r.top - desiredTop, behavior: reduce ? "auto" : "smooth" });
  }, [step]);

  // Acompanha a posição do alvo (rolagem, mudança de tamanho, conteúdo que carrega depois)
  useEffect(() => {
    if (!open) return;
    let frame = 0;
    let last: Rect | null = null;
    const tick = () => {
      const el = findTarget(step);
      const r = el?.getBoundingClientRect();
      const next = r ? { top: r.top, left: r.left, width: r.width, height: r.height } : null;
      if (!sameRect(next, last)) {
        last = next;
        setRect(next);
      }
      setViewport((v) =>
        v.width === window.innerWidth && v.height === window.innerHeight
          ? v
          : { width: window.innerWidth, height: window.innerHeight },
      );
      const height = cardRef.current?.offsetHeight ?? CARD_HEIGHT_ESTIMATE;
      setCardHeight((h) => (h === height ? h : height));
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [open, step]);

  // Foco no botão principal a cada passo, para teclado e leitor de tela acompanharem
  useEffect(() => {
    if (open) primaryRef.current?.focus({ preventScroll: true });
  }, [open, index]);

  const close = useCallback(() => {
    markSeen();
    setIndex(null);
    setRect(null);
    tourActive = false;
    window.dispatchEvent(new Event(TOUR_CLOSED_EVENT));
  }, []);

  const go = useCallback(
    (direction: 1 | -1) => {
      if (index === null) return;
      let next = index + direction;
      while (next > 0 && next < STEPS.length && !isAvailable(STEPS[next])) next += direction;
      if (next >= STEPS.length) return close();
      setIndex(Math.max(0, next));
    },
    [index, close],
  );

  if (!open || index === null) return null;

  const isFirst = index === 0;
  const isLast = index === STEPS.length - 1;
  // Numeração só dos passos que existem nesta tela, sem contar abertura e fechamento
  const shown = STEPS.filter((s) => s.target && isAvailable(s));
  const position = step.target ? shown.findIndex((s) => s.target === step.target) + 1 : 0;

  const hole =
    rect && step.target
      ? {
          top: rect.top - HOLE_PADDING,
          left: rect.left - HOLE_PADDING,
          width: rect.width + HOLE_PADDING * 2,
          height: rect.height + HOLE_PADDING * 2,
        }
      : null;

  const cardWidth = Math.min(CARD_MAX_WIDTH, Math.max(0, viewport.width - EDGE * 2));
  let cardStyle: CSSProperties;
  if (hole && viewport.width) {
    const left = Math.min(
      Math.max(hole.left + hole.width / 2 - cardWidth / 2, EDGE),
      viewport.width - EDGE - cardWidth,
    );
    // Abaixo do alvo se couber (acima da barra de baixo), senão acima; sem espaço nos dois, o lado maior
    const needed = cardHeight + CARD_GAP + EDGE;
    const spaceBelow = viewport.height - BOTTOM_NAV_SPACE - (hole.top + hole.height);
    const spaceAbove = hole.top;
    const below = spaceBelow >= needed || (spaceAbove < needed && spaceBelow > spaceAbove);
    const top = below ? hole.top + hole.height + CARD_GAP : hole.top - CARD_GAP - cardHeight;
    // Nunca sai da tela, mesmo que precise cobrir parte do alvo
    cardStyle = {
      width: cardWidth,
      left,
      top: Math.min(Math.max(top, EDGE), viewport.height - EDGE - cardHeight),
    };
  } else {
    cardStyle = { width: cardWidth, left: "50%", top: "50%", transform: "translate(-50%, -50%)" };
  }

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === "Escape") {
      e.preventDefault();
      close();
    } else if (e.key === "ArrowRight") {
      go(1);
    } else if (e.key === "ArrowLeft" && !isFirst) {
      go(-1);
    } else if (e.key === "Tab") {
      // Mantém o foco dentro do cartão enquanto o tour está aberto
      const focusable = cardRef.current?.querySelectorAll<HTMLElement>("button:not([disabled])");
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }

  return (
    <div className="fixed inset-0 z-[100]" onKeyDown={onKeyDown}>
      {/* Bloqueia toques na página por trás; o recorte é só visual */}
      <div
        className={cn("absolute inset-0", !hole && "bg-black/70 motion-safe:animate-in motion-safe:fade-in")}
        aria-hidden="true"
      />
      {hole && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute rounded-2xl ring-2 ring-primary/80 shadow-[0_0_0_9999px_oklch(0_0_0/0.7),0_0_24px_4px_color-mix(in_oklch,var(--primary),transparent_60%)] motion-safe:transition-[top,left,width,height] motion-safe:duration-300 motion-safe:ease-out"
          style={hole}
        />
      )}

      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={bodyId}
        className="absolute rounded-2xl border border-border bg-card p-4 shadow-2xl shadow-black/40 motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95"
        style={cardStyle}
        key={index}
      >
        <div className="flex items-start gap-3">
          <AsciiCoach variant="icon" className="h-10 w-10 shrink-0 rounded-full text-primary ring-1 ring-primary/40" />
          <div className="min-w-0 flex-1">
            {position > 0 && (
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                {position} de {shown.length}
              </p>
            )}
            <h2 id={titleId} className="text-base font-semibold leading-snug text-foreground">
              {step.title}
            </h2>
            <p id={bodyId} className="mt-1 text-sm leading-relaxed text-muted-foreground">
              {step.body}
            </p>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2">
          {!isLast && (
            <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={close}>
              Pular
            </Button>
          )}
          <div className="ml-auto flex gap-2">
            {!isFirst && !isLast && (
              <Button variant="outline" size="sm" onClick={() => go(-1)}>
                Voltar
              </Button>
            )}
            <Button ref={primaryRef} size="sm" className="px-4" onClick={() => (isLast ? close() : go(1))}>
              {isFirst ? "Começar" : isLast ? "Bora treinar" : "Próximo"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
