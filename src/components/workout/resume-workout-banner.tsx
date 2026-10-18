"use client";

import { useTransition } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Play, Trash2 } from "lucide-react";
import { WorkoutIcon } from "@/components/ui/app-icon";
import { Card } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";

function progressLabel(completedSets: number | null, minutesAgo: number | null) {
  const parts: string[] = [];
  if (completedSets !== null) {
    parts.push(completedSets === 1 ? "1 série feita" : `${completedSets} séries feitas`);
  }
  if (minutesAgo !== null) {
    parts.push(
      minutesAgo < 1
        ? "começou agora"
        : minutesAgo < 60
          ? `começou há ${minutesAgo} min`
          : `começou há ${Math.floor(minutesAgo / 60)}h${String(minutesAgo % 60).padStart(2, "0")}`,
    );
  }
  return parts.join(" · ");
}

/**
 * Aviso fixo de treino aberto: "Retomar" leva direto ao treino (é a ação esperada, sem diálogo no caminho);
 * descartar fica num botão discreto e pede confirmação dizendo o que se perde.
 */
export function ResumeWorkoutBanner({
  sessionId,
  workoutId,
  workoutName,
  completedSets,
  minutesAgo,
  onDiscard,
}: {
  sessionId: string;
  workoutId: string;
  workoutName: string;
  completedSets: number | null;
  minutesAgo: number | null;
  onDiscard: () => Promise<void>;
}) {
  const pathname = usePathname();
  const [discarding, startDiscard] = useTransition();
  const executeHref = `/treinos/${workoutId}/executar/${sessionId}`;

  if (pathname === executeHref) return null;

  const progress = progressLabel(completedSets, minutesAgo);
  const lostWork =
    completedSets && completedSets > 0
      ? `${completedSets === 1 ? "A série registrada será apagada" : `As ${completedSets} séries registradas serão apagadas`} e o treino não vai contar no histórico nem na sua constância.`
      : "Nenhuma série foi registrada ainda, então nada do histórico se perde.";

  return (
    <Card className="mb-5 flex-row items-center gap-3 border-none bg-gradient-to-br from-primary/15 via-card to-card p-3.5 ring-1 ring-primary/20">
      <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
        <WorkoutIcon className="h-5 w-5" />
        {/* Pulso indica que a sessão continua aberta */}
        <span className="absolute right-0 top-0 h-2.5 w-2.5 rounded-full bg-primary ring-2 ring-card motion-safe:animate-pulse" />
      </span>

      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium tracking-wide text-primary uppercase">Treino em andamento</p>
        <p className="truncate text-sm font-semibold text-foreground">{workoutName}</p>
        {progress && <p className="tabular truncate text-xs text-muted-foreground">{progress}</p>}
      </div>

      <AlertDialog>
        <AlertDialogTrigger
          aria-label="Descartar treino em andamento"
          title="Descartar treino"
          className={buttonVariants({
            variant: "ghost",
            size: "icon",
            className: "shrink-0 text-muted-foreground hover:text-destructive",
          })}
        >
          <Trash2 className="h-4 w-4" />
        </AlertDialogTrigger>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-destructive/10 text-destructive">
              <Trash2 />
            </AlertDialogMedia>
            <AlertDialogTitle>Descartar este treino?</AlertDialogTitle>
            <AlertDialogDescription>
              {lostWork} Essa ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={discarding}>Voltar</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={discarding}
              onClick={() => startDiscard(() => onDiscard())}
            >
              {discarding ? "Descartando…" : "Descartar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Link href={executeHref} className={buttonVariants({ size: "sm", className: "shrink-0 gap-1.5" })}>
        <Play className="h-3.5 w-3.5" fill="currentColor" />
        Retomar
      </Link>
    </Card>
  );
}
