import type { SessionSummary } from "@/lib/gamification";

const W = 1080;
const H = 1920;
const GREEN = "#5BE36B";
const GOLD = "#F5C542";

function formatDuration(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  return h > 0 ? `${h}h${String(m).padStart(2, "0")}` : `${m} min`;
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/** Quebra o texto em linhas que cabem na largura */
function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines.slice(0, 3);
}

/** Imagem 9:16 (stories) com o resumo do treino */
export async function renderShareImage(summary: SessionSummary): Promise<Blob | null> {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  const font = (weight: number, size: number) =>
    `${weight} ${size}px ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`;

  // Fundo grafite com brilho verde
  ctx.fillStyle = "#0B0D0B";
  ctx.fillRect(0, 0, W, H);
  const glow = ctx.createRadialGradient(W * 0.8, H * 0.15, 0, W * 0.8, H * 0.15, W);
  glow.addColorStop(0, "rgba(91,227,107,0.28)");
  glow.addColorStop(1, "rgba(91,227,107,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  const logo = await loadImage("/logo-icon.png");
  if (logo) ctx.drawImage(logo, 90, 120, 110, 110);
  ctx.fillStyle = "#FFFFFF";
  ctx.font = font(800, 56);
  ctx.fillText("Treinai", logo ? 225 : 90, 195);

  ctx.fillStyle = GREEN;
  ctx.font = font(700, 40);
  ctx.fillText("TREINO CONCLUÍDO", 90, 400);
  ctx.fillStyle = "#FFFFFF";
  ctx.font = font(800, 92);
  let y = 510;
  for (const line of wrap(ctx, summary.workoutName, W - 180)) {
    ctx.fillText(line, 90, y);
    y += 108;
  }

  // Grade de números
  const stats = [
    { label: "Duração", value: formatDuration(summary.durationSeconds) },
    { label: "Séries", value: String(summary.sets) },
    { label: "Volume", value: `${summary.volumeKg.toLocaleString("pt-BR")} kg` },
    { label: "Recordes", value: String(summary.prs.length), gold: summary.prs.length > 0 },
  ];
  const top = Math.max(y + 60, 860);
  stats.forEach((s, i) => {
    const x = 90 + (i % 2) * 465;
    const sy = top + Math.floor(i / 2) * 270;
    ctx.fillStyle = "rgba(255,255,255,0.06)";
    ctx.beginPath();
    ctx.roundRect(x, sy, 435, 230, 36);
    ctx.fill();
    ctx.fillStyle = s.gold ? GOLD : "#FFFFFF";
    ctx.font = font(800, 76);
    ctx.fillText(s.value, x + 40, sy + 120);
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.font = font(600, 36);
    ctx.fillText(s.label, x + 40, sy + 182);
  });

  // XP e constância
  const xpY = top + 600;
  ctx.fillStyle = GREEN;
  ctx.font = font(800, 84);
  ctx.fillText(`+${summary.xpGained} XP`, 90, xpY);
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.font = font(600, 40);
  ctx.fillText(
    `Nível ${summary.levelAfter.level}${summary.streakDays > 1 ? ` · ${summary.streakDays} dias de constância` : ""}`,
    90,
    xpY + 70,
  );

  if (summary.prs[0]) {
    ctx.fillStyle = GOLD;
    ctx.font = font(700, 40);
    ctx.fillText(`Novo recorde: ${summary.prs[0].exerciseName} ${summary.prs[0].weight} kg`, 90, xpY + 150);
  }

  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.font = font(600, 34);
  ctx.fillText("Treine com o Théo no Treinai", 90, H - 120);

  return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), "image/png"));
}
