"use client";

import React, { useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Sparkles, ArrowRight, CornerDownLeft } from "lucide-react";
import { motion } from "framer-motion";

interface AiMessageRendererProps {
  content: string;
  isLatest?: boolean;
  disabled?: boolean;
  onSelectOption?: (option: string) => void;
}

/**
 * Heurísticas para sugerir botões de resposta rápida caso a IA não retorne <options>
 */
function getFallbackOptions(text: string): string[] {
  const lower = text.toLowerCase();

  if (
    lower.includes("ajustes em carga, séries ou repetições") ||
    lower.includes("ajustes de carga") ||
    lower.includes("quer fazer ajustes") ||
    lower.includes("deseja fazer algum ajuste")
  ) {
    return [
      "Ajustar cargas e repetições",
      "Trocar algum exercício",
      "O treino está perfeito, obrigado!",
    ];
  }

  if (
    lower.includes("pode criar") ||
    lower.includes("quer que eu crie") ||
    lower.includes("posso salvar") ||
    lower.includes("deseja que eu salve")
  ) {
    return ["Sim, pode criar!", "Quero mudar alguns exercícios primeiro"];
  }

  if (
    lower.includes("quantos dias") ||
    lower.includes("frequência") ||
    lower.includes("dias na semana")
  ) {
    return ["3 dias por semana", "4 dias por semana", "5 dias por semana"];
  }

  if (
    lower.includes("qual seu objetivo") ||
    lower.includes("foco principal") ||
    lower.includes("hipertrofia ou força")
  ) {
    return ["Hipertrofia muscular", "Ganho de força", "Condicionamento e resistência"];
  }

  return [];
}

/**
 * Extrai opções estruturadas <options><option>...</option></options> e limpa o texto
 */
export function parseAiMessage(rawText: string): { cleanText: string; options: string[] } {
  let text = rawText || "";
  const options: string[] = [];

  // 1. Extrair tags <options>...</options>
  const optionsBlockMatch = text.match(/<options>([\s\S]*?)<\/options>/i);
  if (optionsBlockMatch) {
    text = text.replace(optionsBlockMatch[0], "").trim();
    const optionMatches = optionsBlockMatch[1].matchAll(/<option>([\s\S]*?)<\/option>/gi);
    for (const match of optionMatches) {
      const opt = match[1].trim();
      if (opt) options.push(opt);
    }
  }

  // 2. Extrair blocos alternativos :::options ou ```options
  if (options.length === 0) {
    const blockMatch = text.match(/(?:```options|:::options)([\s\S]*?)(?:```|:::)/i);
    if (blockMatch) {
      text = text.replace(blockMatch[0], "").trim();
      const lines = blockMatch[1].split("\n");
      for (const line of lines) {
        const cleaned = line.replace(/^[-*•\d.)\s]+/, "").trim();
        if (cleaned) options.push(cleaned);
      }
    }
  }

  // 3. Fallback heurístico se nenhuma tag foi fornecida
  if (options.length === 0) {
    options.push(...getFallbackOptions(text));
  }

  // 4. Limpeza de artefatos de markdown problemáticos:
  // - Aspas dentro de triplo asterisco: ***"Costas e Bíceps"*** -> **Costas e Bíceps**
  text = text.replace(/\*\*\*+"?([^"*\n]+)"?\*\*\*+/g, "**$1**");

  // - Aspas dentro de duplo asterisco: **"Treino"** -> **Treino**
  text = text.replace(/\*\*"([^"\n]+)"\*\*/g, "**$1**");

  // - Transformar linhas no estilo "**Costas:** Remada..." em tópicos com marcador consistente
  text = text.replace(/(^|\n)\s*(?![-*•\d])\*\*([^*:\n]+):\*\*/g, "$1• **$2:**");

  // - Normalizar marcadores '• ' para '- ' para compatibilidade perfeita com markdown
  text = text.replace(/(^|\n)\s*•\s+/g, "$1- ");

  return { cleanText: text.trim(), options };
}

export function AiMessageRenderer({
  content,
  isLatest = false,
  disabled = false,
  onSelectOption,
}: AiMessageRendererProps) {
  const { cleanText, options } = useMemo(() => parseAiMessage(content), [content]);

  return (
    <div className="space-y-3">
      {/* Conteúdo Markdown com tipografia e tópicos refinados */}
      <div className="prose prose-invert max-w-none text-sm leading-relaxed">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            h1: ({ children }) => (
              <h1 className="my-2.5 flex items-center gap-2 text-base font-bold tracking-tight text-foreground first:mt-0">
                <span className="h-2 w-2 rounded-full bg-primary" />
                {children}
              </h1>
            ),
            h2: ({ children }) => (
              <h2 className="my-2 flex items-center gap-2 text-base font-bold tracking-tight text-foreground first:mt-0">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                {children}
              </h2>
            ),
            h3: ({ children }) => (
              <h3 className="my-2 flex items-center gap-2 text-sm font-bold tracking-tight text-foreground first:mt-0">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                {children}
              </h3>
            ),
            p: ({ children }) => (
              <p className="my-1.5 text-sm leading-relaxed text-foreground/90 first:mt-0 last:mb-0">
                {children}
              </p>
            ),
            strong: ({ children }) => {
              const textContent = String(children ?? "");
              const isCategory = textContent.endsWith(":");
              return (
                <strong
                  className={`font-semibold ${
                    isCategory
                      ? "rounded bg-primary/15 px-1.5 py-0.5 text-primary text-[0.92em] inline-block mr-1"
                      : "text-foreground"
                  }`}
                >
                  {children}
                </strong>
              );
            },
            em: ({ children }) => (
              <em className="text-xs text-muted-foreground italic font-normal">
                {children}
              </em>
            ),
            ul: ({ children }) => (
              <ul className="my-2 space-y-1.5 pl-1">
                {children}
              </ul>
            ),
            ol: ({ children }) => (
              <ol className="my-2 space-y-1.5 pl-4 list-decimal marker:text-primary marker:font-semibold">
                {children}
              </ol>
            ),
            li: ({ children }) => (
              <li className="flex items-start gap-2 text-sm leading-relaxed text-foreground/90">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/70" />
                <div className="flex-1">{children}</div>
              </li>
            ),
            blockquote: ({ children }) => (
              <blockquote className="my-2 rounded-xl border-l-2 border-primary/70 bg-primary/5 px-3 py-2 text-xs italic text-foreground/80">
                {children}
              </blockquote>
            ),
            code: ({ children }) => (
              <code className="rounded bg-secondary/80 px-1.5 py-0.5 text-xs font-mono font-medium text-primary">
                {children}
              </code>
            ),
            hr: () => <hr className="my-3 border-border/50" />,
          }}
        >
          {cleanText}
        </ReactMarkdown>
      </div>

      {/* Opções interativas em formato de botões elegantes */}
      {options.length > 0 && onSelectOption && (
        <div className="space-y-1.5 border-t border-border/40 pt-2.5">
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
            <Sparkles className="h-3 w-3 text-primary" />
            <span>Opções sugeridas:</span>
          </div>

          <div className="flex flex-wrap gap-2">
            {options.map((option, idx) => (
              <motion.button
                key={idx}
                type="button"
                disabled={disabled || !isLatest}
                onClick={() => onSelectOption(option)}
                whileHover={!disabled && isLatest ? { scale: 1.02 } : undefined}
                whileTap={!disabled && isLatest ? { scale: 0.98 } : undefined}
                className="group/opt relative inline-flex items-center gap-2 rounded-xl border border-border/60 bg-secondary/60 px-3 py-2 text-xs font-medium text-secondary-foreground transition-all duration-200 hover:border-primary/40 hover:bg-primary hover:text-primary-foreground hover:shadow-md hover:shadow-primary/20 active:scale-95 disabled:pointer-events-none disabled:opacity-40"
              >
                <span>{option}</span>
                <CornerDownLeft className="h-3 w-3 shrink-0 opacity-40 transition-all duration-200 group-hover/opt:translate-x-0.5 group-hover/opt:opacity-100" />
              </motion.button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
