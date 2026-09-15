import type { ReactNode } from "react";
import { BottomNav } from "./bottom-nav";
import { ResumeWorkoutBanner } from "@/components/workout/resume-workout-banner";

interface ActiveSessionVM {
  id: string;
  workout_id: string;
  workout_name: string;
}

export function AppShell({
  children,
  activeSession,
  onDiscardActiveSession,
}: {
  children: ReactNode;
  activeSession?: ActiveSessionVM | null;
  onDiscardActiveSession?: () => Promise<void>;
}) {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <main className="mx-auto w-full max-w-md flex-1 px-4 pb-28 pt-6 sm:max-w-lg lg:max-w-3xl lg:px-6">
        {activeSession && onDiscardActiveSession && (
          <ResumeWorkoutBanner
            sessionId={activeSession.id}
            workoutId={activeSession.workout_id}
            workoutName={activeSession.workout_name}
            onDiscard={onDiscardActiveSession}
          />
        )}
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
