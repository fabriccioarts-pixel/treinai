import Image from "next/image";
import { HeroStats } from "@/components/diagnostico/hero-stats";
import { Illustration } from "@/components/ui/illustration";
import { FloatingBubble } from "./landing-motion";

/*
 * Foto do hero da landing, com os mesmos selos flutuantes da abertura do diagnóstico.
 * No celular ocupa a largura toda e some no fundo; no desktop vira um cartão de cantos largos.
 */
export function HeroVisual() {
  return (
    // Altura explícita no celular: com aspect-ratio + max-height, o navegador estreitaria a largura junto
    <div className="relative -mx-4 h-[min(125vw,72dvh)] overflow-hidden sm:mx-0 sm:aspect-[4/5] sm:h-auto sm:rounded-[2rem] sm:border sm:border-white/10 sm:shadow-[0_40px_80px_-40px_color-mix(in_oklch,var(--primary)_45%,transparent)]">
      <Image
        src="/quiz-fotos/hero.jpg"
        alt="Mulher treinando no cabo com corda, numa academia escura com luz verde"
        fill
        priority
        sizes="(min-width: 1024px) 520px, (min-width: 640px) 90vw, 100vw"
        // No celular a foto se dissolve em transparência (e não numa cor), para não marcar a luz verde atrás
        className="photo-zoom-in object-cover object-top max-sm:[mask-image:linear-gradient(to_bottom,black_55%,transparent)]"
      />
      <div className="absolute inset-x-0 bottom-0 hidden h-2/5 bg-gradient-to-t from-black/70 via-black/20 to-transparent sm:block" />
      <HeroStats delay={0.7} ringClassName="top-[64%] left-6" />

      <FloatingBubble className="absolute right-4 bottom-5 hidden sm:block">
        <div className="max-w-[15.5rem] rounded-2xl rounded-br-sm border border-white/10 bg-black/55 p-3.5 backdrop-blur-md">
          <p className="flex items-center gap-2 text-xs font-semibold text-primary">
            <Illustration name="theo" size={22} className="-my-1" />
            Théo
          </p>
          <p className="mt-1.5 text-sm leading-snug text-white">
            Seu supino subiu <strong className="text-primary">7,5 kg</strong> esse mês. Bora buscar os 90 kg?
          </p>
        </div>
      </FloatingBubble>
    </div>
  );
}
