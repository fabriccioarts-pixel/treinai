import { auth } from "@/auth";
import { ProfileForm } from "@/components/nutrition/profile-form";
import { workerApi } from "@/lib/worker-api";

export default async function ObjetivoPage() {
  const session = await auth();
  const userId = session?.user?.id;
  // Quem volta ao onboarding (ex.: refez o cadastro) encontra o que já preencheu
  const plan = userId ? await workerApi.getProfile(userId).catch(() => null) : null;

  return <ProfileForm mode="onboarding" initial={plan?.profile ?? undefined} />;
}
