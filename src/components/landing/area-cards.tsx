import Image from "next/image";
import { WaterGlass } from "@/components/ui/water-glass";
import { Stagger, StaggerItem } from "./landing-motion";

/*
 * As cinco áreas do diagnóstico em cartões de foto (as mesmas pessoas de corpo real do quiz).
 * No celular, uma fileira que rola para o lado; no desktop, cinco colunas.
 */

const AREAS = [
  { key: "treino", label: "Treino", text: "Carga que sobe série a série", src: "/quiz-fotos/carga.jpg", position: "object-[70%_center]" },
  { key: "constancia", label: "Constância", text: "Quantas vezes você recomeçou", src: "/quiz-fotos/recomecos.jpg", position: "object-[72%_center]" },
  { key: "sono", label: "Sono", text: "Dormir pouco dá fome", src: "/quiz-fotos/sono.jpg", position: "object-[38%_center]" },
  { key: "alimentacao", label: "Alimentação", text: "Proteína e ultraprocessados", src: "/quiz-fotos/proteina.jpg", position: "object-[62%_center]" },
] as const;

const CARD = "relative aspect-[3/4] w-[68%] shrink-0 snap-start overflow-hidden rounded-3xl border border-white/10 sm:w-[40%] lg:w-auto";

export function AreaCards() {
  return (
    <Stagger
      as="ul"
      stagger={0.08}
      className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:px-6 lg:mx-0 lg:grid lg:grid-cols-5 lg:overflow-visible lg:px-0"
    >
      {AREAS.map((a) => (
        <StaggerItem as="li" key={a.key} className={`group ${CARD}`}>
          <Image
            src={a.src}
            alt=""
            fill
            sizes="(min-width: 1024px) 230px, 68vw"
            className={`${a.position} object-cover transition-transform duration-700 group-hover:scale-[1.05]`}
          />
          <div className="absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-4">
            <p className="text-lg font-bold text-white">{a.label}</p>
            <p className="mt-0.5 text-sm text-white/70">{a.text}</p>
          </div>
        </StaggerItem>
      ))}

      {/* Água: os copos animados do quiz no lugar da foto */}
      <StaggerItem as="li" className={`${CARD} flex flex-col justify-between bg-card p-4`}>
        <div className="grid grid-cols-4 gap-x-2 gap-y-3 pt-2">
          {Array.from({ length: 8 }, (_, i) => (
            <WaterGlass key={i} full={i < 6} delay={(i % 4) * 0.2} className="mx-auto h-11" />
          ))}
        </div>
        <div>
          <p className="tabular text-sm text-muted-foreground">
            <span className="text-2xl font-bold text-foreground">1,5 L</span> de 2,8 L
          </p>
          <p className="mt-3 text-lg font-bold text-foreground">Água</p>
          <p className="mt-0.5 text-sm text-muted-foreground">A meta certa pro seu peso</p>
        </div>
      </StaggerItem>
    </Stagger>
  );
}
