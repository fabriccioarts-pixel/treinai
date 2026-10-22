import type { ReactNode } from "react";
import { BottomNav } from "./bottom-nav";
import { ResumeWorkoutBanner } from "@/components/workout/resume-workout-banner";
import { TrialBanner } from "./trial-banner";
import { HideDuringWorkout } from "./hide-during-workout";
import { AppTour } from "@/components/tour/app-tour";
import type { BillingAccess } from "@/lib/worker-api";

interface ActiveSessionVM {
  id: string;
  workout_id: string;
  workout_name: string;
  completedSets: number | null;
  minutesAgo: number | null;
}

export function AppShell({
  children,
  activeSession,
  onDiscardActiveSession,
  billing,
}: {
  children: ReactNode;
  activeSession?: ActiveSessionVM | null;
  onDiscardActiveSession?: () => Promise<void>;
  /** Teste grátis / assinatura; ausente se o worker não respondeu */
  billing?: BillingAccess | null;
}) {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <main className="mx-auto w-full max-w-md flex-1 px-4 pb-28 pt-6 sm:max-w-lg lg:max-w-3xl lg:px-6">
        {billing && (
          <HideDuringWorkout>
            <TrialBanner access={billing} />
          </HideDuringWorkout>
        )}
        {activeSession && onDiscardActiveSession && (
          <ResumeWorkoutBanner
            sessionId={activeSession.id}
            workoutId={activeSession.workout_id}
            workoutName={activeSession.workout_name}
            completedSets={activeSession.completedSets}
            minutesAgo={activeSession.minutesAgo}
            onDiscard={onDiscardActiveSession}
          />
        )}
        {children}
      </main>
      <BottomNav />
      <AppTour />
    </div>
  );
}
