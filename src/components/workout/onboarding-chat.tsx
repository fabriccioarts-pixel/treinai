"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { StartIcon } from "@/components/ui/app-icon";
import { buttonVariants } from "@/components/ui/button";
import { AiCoachChat } from "@/components/workout/ai-coach-chat";
import { startWorkoutAction } from "@/app/actions/session-actions";

/**
 * Conversa do onboarding: assim que o Théo cria o plano, o rodapé troca
 * "Ir para o app" por começar o primeiro treino direto, sem passar pela home vazia.
 */
export function OnboardingChat({ greeting }: { greeting: string }) {
  const [firstWorkout, setFirstWorkout] = useState<{ workoutId: string; name: string } | null>(null);

  return (
    <>
      <div className="flex-1 overflow-hidden">
        <AiCoachChat
          autoGreetMessage={greeting}
          onWorkoutCreated={(workout) => setFirstWorkout((current) => current ?? workout)}
        />
      </div>

      {firstWorkout ? (
        <div className="mt-3 space-y-2">
          <form action={startWorkoutAction.bind(null, firstWorkout.workoutId)}>
            <button
              type="submit"
              className={buttonVariants({
                size: "lg",
                className: "h-12 w-full gap-2 rounded-2xl text-base font-semibold",
              })}
            >
              <StartIcon className="h-4 w-4" />
              <span className="truncate">Começar {firstWorkout.name}</span>
            </button>
          </form>
          <Link
            href="/"
            className={buttonVariants({ variant: "ghost", className: "h-11 w-full text-sm text-muted-foreground" })}
          >
            Treinar depois
          </Link>
        </div>
      ) : (
        <Link
          href="/"
          className={buttonVariants({
            variant: "outline",
            className: "mt-3 h-11 w-full gap-2 text-sm font-semibold",
          })}
        >
          Ir para o app
          <ArrowRight className="h-4 w-4" />
        </Link>
      )}
    </>
  );
}
