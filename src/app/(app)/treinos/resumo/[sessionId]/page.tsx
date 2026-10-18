import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { WorkoutSummary } from "@/components/gamification/workout-summary";
import { workerApi } from "@/lib/worker-api";

/** Tela de celebração depois de finalizar o treino */
export default async function ResumoTreinoPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  // Worker sem a rota de resumo (ou sessão não encontrada): volta para a home como antes
  const summary = await workerApi.getSessionSummary(session.user.id, sessionId).catch(() => null);
  if (!summary) redirect("/");

  return <WorkoutSummary summary={summary} />;
}
