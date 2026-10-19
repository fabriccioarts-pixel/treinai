import { TriangleAlert } from "lucide-react";
import type { RoutineStability } from "@/lib/worker-api";
import { cn } from "@/lib/utils";

/** Frases do aviso de trocas frequentes; null quando a rotina está estável */
export function routineChangeCopy(s: RoutineStability): { title: string; body: string } | null {
  if (s.level === "ok" || s.daysSinceLastChange === null) return null;

  const when = s.daysSinceLastChange === 0 ? "hoje" : s.daysSinceLastChange === 1 ? "ontem" : `há ${s.daysSinceLastChange} dias`;
  const sessions =
    s.sessionsSinceLastChange === 0
      ? "e ainda não fez nenhum treino com ele"
      : `e fez só ${s.sessionsSinceLastChange} ${s.sessionsSinceLastChange === 1 ? "treino" : "treinos"} desde então`;

  return s.level === "alerta"
    ? {
        title: "Muitas trocas de treino",
        body: `Você mudou o treino em ${s.changesLast28Days} dias diferentes nas últimas 4 semanas. Trocando toda hora, o corpo não tem tempo de se adaptar e você não consegue subir carga — e é isso que traz resultado. O ideal é manter o mesmo treino por 4 a 8 semanas.`,
      }
    : {
        title: "Seu treino ainda é novo",
        body: `Você mudou o treino ${when} ${sessions}. Resultado vem de repetir os mesmos exercícios e aumentar a carga aos poucos, por 4 a 8 semanas. Se algo incomoda, ajuste a carga ou troque um exercício pontual em vez do treino todo.`,
      };
}

export function RoutineChangeNotice({ stability, className }: { stability: RoutineStability; className?: string }) {
  const copy = routineChangeCopy(stability);
  if (!copy) return null;

  return (
    <div
      role="note"
      className={cn(
        "flex gap-3 rounded-2xl border p-4",
        stability.level === "alerta" ? "border-gold/40 bg-gold/10" : "border-gold/25 bg-gold/5",
        className,
      )}
    >
      <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-gold" aria-hidden />
      <div className="min-w-0">
        <p className="text-sm font-semibold text-foreground">{copy.title}</p>
        <p className="mt-1 text-sm text-foreground/85">{copy.body}</p>
      </div>
    </div>
  );
}
