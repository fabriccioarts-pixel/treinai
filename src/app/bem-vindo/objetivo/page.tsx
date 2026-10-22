import { auth } from "@/auth";
import { ProfileForm } from "@/components/nutrition/profile-form";
import { workerApi } from "@/lib/worker-api";
import type { Goal, ProfileInput, Sex } from "@/lib/nutrition";

/** Objetivo do diagnóstico → objetivo do perfil ("saúde" não tem par: a pessoa escolhe) */
const GOAL_FROM_QUIZ: Record<string, Goal> = { emagrecer: "emagrecimento", massa: "hipertrofia", forca: "ganho-massa" };
const SEX_FROM_QUIZ: Record<string, Sex> = { f: "feminino", m: "masculino", x: "nao-informado" };

/** O que o diagnóstico já respondeu e o perfil também pergunta */
function prefillFromDiagnostic(answers: Record<string, string>): Partial<ProfileInput> {
  const number = (key: string) => {
    const n = Number((answers[key] ?? "").replace(",", "."));
    return Number.isFinite(n) && n > 0 ? n : undefined;
  };
  const days = number("dias");
  return {
    goal: GOAL_FROM_QUIZ[answers.objetivo],
    trainingDays: days && days >= 2 && days <= 6 ? days : undefined,
    sex: SEX_FROM_QUIZ[answers.sexo],
    heightCm: number("altura"),
    weightKg: number("peso"),
    targetWeightKg: number("peso_meta"),
    ...((answers.condicoes ?? "").split(",").includes("gestacao") ? { healthRestriction: true } : {}),
  };
}

export default async function ObjetivoPage() {
  const session = await auth();
  const userId = session?.user?.id;
  // Quem volta ao onboarding (ex.: refez o cadastro) encontra o que já preencheu
  const plan = userId ? await workerApi.getProfile(userId).catch(() => null) : null;
  if (plan?.profile) return <ProfileForm mode="onboarding" initial={plan.profile} />;

  // Quem fez o diagnóstico antes do cadastro já encontra essas respostas marcadas
  const diagnostic = userId ? await workerApi.getDiagnosticAnswers(userId).catch(() => null) : null;
  const prefill = diagnostic?.answers ? prefillFromDiagnostic(diagnostic.answers) : undefined;
  return <ProfileForm mode="onboarding" prefill={prefill} />;
}
