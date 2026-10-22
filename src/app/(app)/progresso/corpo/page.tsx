import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SubpageHeader } from "@/components/shared/subpage-header";
import { BodyConsent } from "@/components/body/body-consent";
import { BodyPhotosScreen } from "@/components/body/body-photos-screen";
import { auth } from "@/auth";
import { workerApi } from "@/lib/worker-api";

export const metadata: Metadata = { title: "Fotos do corpo" };

const TIME_ZONE = "America/Sao_Paulo";

export default async function FotosDoCorpoPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  const [overview, profile, { exercises }] = await Promise.all([
    workerApi.getBody(userId),
    workerApi.getProfile(userId).catch(() => null),
    workerApi.listExercises(userId).catch(() => ({ exercises: [] })),
  ]);
  // Mesmo dia que o worker usa para agrupar as fotos: o do perfil, ou o de Brasília sem perfil
  const today =
    (profile && "today" in profile ? profile.today : null) ??
    new Date().toLocaleDateString("en-CA", { timeZone: TIME_ZONE });
  const exerciseNames = Object.fromEntries(exercises.map((e) => [e.id, e.name]));

  return (
    <div className="space-y-6">
      <SubpageHeader
        title="Fotos do corpo"
        subtitle={overview.consent.photos ? "Acompanhe a evolução e peça a análise do shape." : "Privado, só com a sua autorização."}
        fallbackHref="/progresso"
      />
      {overview.consent.photos ? (
        <BodyPhotosScreen overview={overview} today={today} exerciseNames={exerciseNames} />
      ) : (
        <BodyConsent />
      )}
    </div>
  );
}
