import Image from "next/image";
import { OnboardingChat } from "@/components/workout/onboarding-chat";
import { MUSCLE_GROUP_LABEL } from "@/lib/muscle-groups";
import type { MuscleGroup } from "@/lib/types";

const OBJETIVO_LABEL: Record<string, string> = {
  hipertrofia: "Hipertrofia (crescer massa muscular de forma geral)",
  emagrecimento: "Emagrecimento (perder gordura e definir o corpo)",
  "ganho-massa": "Ganho de massa (força e volume corporal)",
  enfase: "Ênfase específica em um grupo muscular",
};

function buildGreetingPrompt(params: { objetivo?: string; enfase?: string; dias?: string }): string {
  const { objetivo, enfase, dias } = params;

  if (!objetivo || !dias) {
    return "Você está conversando com um usuário que acabou de criar a conta no Treinai e ainda não tem nenhum treino montado. Dê boas-vindas de forma breve e calorosa, se apresente como o personal trainer dele, e pergunte qual é o objetivo principal dele (hipertrofia, emagrecimento, ganho de massa ou ênfase em algum grupo muscular) e quantos dias por semana ele consegue treinar, para você montar o primeiro treino personalizado.";
  }

  const objetivoText = OBJETIVO_LABEL[objetivo] ?? objetivo;
  const enfaseText = enfase
    ? ` com ênfase especial em ${MUSCLE_GROUP_LABEL[enfase as MuscleGroup] ?? enfase}`
    : "";

  return `O usuário acabou de criar a conta no Treinai e respondeu a um questionário inicial: objetivo principal é "${objetivoText}"${enfaseText}, e ele consegue treinar ${dias} dias por semana. Ele ainda não tem nenhum treino cadastrado. Monte agora o plano de treino inicial dele usando a ferramenta create_workout — crie quantos treinos fizerem sentido para ${dias} dias por semana (pode ser o mesmo treino repetido no ciclo, ou uma divisão como A/B/C, dependendo do que for mais adequado para o objetivo). Se o contexto tiver o DIAGNÓSTICO INICIAL, use-o para escolher exercícios, volume e duração: onde a pessoa treina, quanto tempo tem, a experiência e as condições de saúde. Não peça confirmação, o usuário já autorizou ao responder o questionário — crie os treinos diretamente. Depois de criar, dê boas-vindas e explique em poucas frases a lógica da divisão escolhida, citando o que você levou em conta do diagnóstico.`;
}

export default async function BemVindoConversaPage({
  searchParams,
}: {
  searchParams: Promise<{ objetivo?: string; enfase?: string; dias?: string }>;
}) {
  const params = await searchParams;
  const greeting = buildGreetingPrompt(params);

  return (
    <div className="mx-auto flex h-dvh w-full max-w-md flex-col px-4 py-4 sm:max-w-lg lg:max-w-2xl">
      <div className="mb-4 flex items-center gap-3">
        <Image
          src="/ai-coach-avatar.png"
          alt="Théo"
          width={40}
          height={40}
          className="h-10 w-10 rounded-full ring-1 ring-primary/30"
        />
        <div>
          <h1 className="text-lg font-semibold text-foreground">Montando seu treino… 🎯</h1>
          <p className="text-xs text-muted-foreground">Seu personal trainer está preparando tudo</p>
        </div>
      </div>

      <OnboardingChat greeting={greeting} />
    </div>
  );
}
