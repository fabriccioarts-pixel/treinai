/*
 * Visual dos e-mails do Treinai: fundo escuro, cartão com ilustração 3D, título forte, botão verde e
 * assinatura do Théo. Tudo em tabelas com estilo inline, que é o que Gmail, Outlook e Apple Mail entendem.
 * As imagens vêm do app publicado (APP_URL), então precisam existir em /public.
 */

export const COLORS = {
  bg: "#0b0d0b",
  card: "#131713",
  tile: "#1b211b",
  border: "#232a23",
  text: "#f1f5f1",
  muted: "#9aa59a",
  green: "#5ee36a",
  greenDark: "#0b1a0c",
};

const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const SUPPORT_EMAIL = "support@treinai.fit";

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]!);
}

/** Parágrafo do corpo */
export const p = (html: string) =>
  `<p style="margin:0 0 16px;font-family:${FONT};font-size:16px;line-height:1.6;color:${COLORS.text};">${html}</p>`;

/** Lista com marcador discreto (ex.: o que para sem assinatura) */
export const bullets = (items: string[]) =>
  `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 16px;">${items
    .map(
      (item) =>
        `<tr><td style="padding:5px 12px 5px 0;vertical-align:top;font-family:${FONT};font-size:16px;line-height:1.5;color:${COLORS.muted};">•</td><td style="padding:5px 0;font-family:${FONT};font-size:15px;line-height:1.5;color:${COLORS.text};">${item}</td></tr>`,
    )
    .join("")}</table>`;

/** Passos numerados em círculos verdes */
export const steps = (items: string[]) =>
  `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:4px 0 20px;">${items
    .map(
      (item, i) =>
        `<tr><td width="40" style="padding:8px 12px 8px 0;vertical-align:top;"><div style="width:28px;height:28px;line-height:28px;border-radius:14px;background:${COLORS.green};color:${COLORS.greenDark};font-family:${FONT};font-size:14px;font-weight:700;text-align:center;">${i + 1}</div></td><td style="padding:10px 0;font-family:${FONT};font-size:15px;line-height:1.5;color:${COLORS.text};border-bottom:${i < items.length - 1 ? `1px solid ${COLORS.border}` : "0"};">${item}</td></tr>`,
    )
    .join("")}</table>`;

/** Números em destaque, dois por linha (ex.: "4 treinos concluídos") */
export function stats(items: { value: string; label: string }[]): string {
  if (items.length === 0) return "";
  const rows: string[] = [];
  for (let i = 0; i < items.length; i += 2) {
    const cell = (item?: { value: string; label: string }) =>
      item
        ? `<td width="50%" style="padding:6px;vertical-align:top;"><div style="background:${COLORS.tile};border:1px solid ${COLORS.border};border-radius:16px;padding:16px;"><div style="font-family:${FONT};font-size:28px;line-height:1.1;font-weight:800;color:${COLORS.green};">${escapeHtml(item.value)}</div><div style="margin-top:4px;font-family:${FONT};font-size:13px;line-height:1.4;color:${COLORS.muted};">${escapeHtml(item.label)}</div></div></td>`
        : `<td width="50%" style="padding:6px;"></td>`;
    rows.push(`<tr>${cell(items[i])}${cell(items[i + 1])}</tr>`);
  }
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 16px;">${rows.join("")}</table>`;
}

export interface LayoutInput {
  appUrl: string;
  preheader: string;
  /** Etiqueta verde acima do título (ex.: "TESTE GRÁTIS") */
  eyebrow?: string;
  title: string;
  /** Ilustração 3D do app (caminho em /public, ex.: "/illustrations/trial.png") */
  /** round: foto em círculo com anel verde (o Théo); sem round, ilustração 3D solta */
  hero?: { src: string; alt: string; size?: number; round?: boolean };
  body: string;
  cta?: { label: string; href: string };
  /** Linha pequena abaixo do botão */
  ctaNote?: string;
  /** Por que a pessoa recebeu (rodapé) */
  reason: string;
}

export function layout(input: LayoutInput): string {
  const { appUrl } = input;
  const asset = (path: string) => `${appUrl.replace(/\/$/, "")}${path}`;
  const heroSize = input.hero?.size ?? 140;

  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="dark"><meta name="supported-color-schemes" content="dark">
<title>${escapeHtml(input.title)}</title></head>
<body style="margin:0;padding:0;background:${COLORS.bg};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(input.preheader)}&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COLORS.bg};">
<tr><td align="center" style="padding:28px 12px 40px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">

<tr><td style="padding:0 8px 18px;">
  <table role="presentation" cellpadding="0" cellspacing="0"><tr>
    <td style="vertical-align:middle;"><img src="${asset("/logo-icon-192.png")}" width="36" height="36" alt="" style="display:block;border:0;border-radius:10px;"></td>
    <td style="vertical-align:middle;padding-left:10px;font-family:${FONT};font-size:18px;font-weight:800;letter-spacing:-0.3px;color:${COLORS.text};">Treinai</td>
  </tr></table>
</td></tr>

<tr><td style="background:${COLORS.card};border:1px solid ${COLORS.border};border-radius:24px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
  ${
    input.hero
      ? `<tr><td align="center" style="padding:32px 28px 4px;"><img src="${asset(input.hero.src)}" width="${heroSize}" height="${heroSize}" alt="${escapeHtml(input.hero.alt)}" style="display:block;width:${heroSize}px;height:${heroSize}px;${input.hero.round ? `border:3px solid ${COLORS.green};border-radius:${heroSize}px;` : "border:0;"}"></td></tr>`
      : ""
  }
  <tr><td style="padding:${input.hero ? "16px" : "32px"} 28px 0;">
    ${input.eyebrow ? `<div style="margin:0 0 10px;font-family:${FONT};font-size:12px;font-weight:700;letter-spacing:1.4px;color:${COLORS.green};">${escapeHtml(input.eyebrow)}</div>` : ""}
    <h1 style="margin:0 0 18px;font-family:${FONT};font-size:26px;line-height:1.25;font-weight:800;letter-spacing:-0.5px;color:${COLORS.text};">${escapeHtml(input.title)}</h1>
    ${input.body}
  </td></tr>
  ${
    input.cta
      ? `<tr><td style="padding:8px 28px ${input.ctaNote ? "10px" : "28px"};">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="border-radius:999px;background:${COLORS.green};">
      <a href="${input.cta.href}" style="display:block;padding:16px 24px;font-family:${FONT};font-size:16px;font-weight:700;color:${COLORS.greenDark};text-decoration:none;border-radius:999px;">${escapeHtml(input.cta.label)}</a>
    </td></tr></table>
  </td></tr>`
      : ""
  }
  ${input.ctaNote ? `<tr><td align="center" style="padding:0 28px 28px;font-family:${FONT};font-size:13px;line-height:1.5;color:${COLORS.muted};">${input.ctaNote}</td></tr>` : ""}
  <tr><td style="padding:0 28px 28px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid ${COLORS.border};"><tr>
      <td width="52" style="padding-top:20px;vertical-align:middle;"><img src="${asset("/email/theo-avatar.png")}" width="44" height="44" alt="Théo" style="display:block;border:0;border-radius:22px;"></td>
      <td style="padding-top:20px;vertical-align:middle;font-family:${FONT};">
        <div style="font-size:15px;font-weight:700;color:${COLORS.text};">Théo</div>
        <div style="font-size:13px;color:${COLORS.muted};">Seu personal no Treinai</div>
      </td>
    </tr></table>
  </td></tr>
  </table>
</td></tr>

<tr><td style="padding:22px 12px 0;font-family:${FONT};font-size:12px;line-height:1.6;color:${COLORS.muted};text-align:center;">
  Dúvidas? É só responder este e-mail ou escrever para <a href="mailto:${SUPPORT_EMAIL}" style="color:${COLORS.green};text-decoration:none;">${SUPPORT_EMAIL}</a>.<br>
  ${input.reason}<br>
  <a href="${appUrl}" style="color:${COLORS.muted};text-decoration:underline;">${escapeHtml(new URL(appUrl).host)}</a>
</td></tr>

</table>
</td></tr></table>
</body></html>`;
}
