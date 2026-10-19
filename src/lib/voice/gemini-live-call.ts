/*
 * Ligação de voz com o Théo pela Gemini Live API (WebSocket direto do navegador).
 * Microfone → PCM 16-bit mono → Gemini; resposta em PCM 24 kHz tocada numa fila
 * que é esvaziada na hora quando o usuário interrompe.
 * Protocolo: https://ai.google.dev/api/live
 */

const WS_URL =
  "wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContentConstrained";
const OUTPUT_SAMPLE_RATE = 24_000;
/** Sem ninguém falar por esse tempo, a ligação encerra sozinha (áudio ao vivo custa caro) */
const IDLE_TIMEOUT_MS = 90_000;

const GREETING =
  "(O usuário acabou de abrir a conversa por voz com você. Cumprimente em uma frase curta e pergunte como pode ajudar. Se já houver conversa anterior, retome de onde parou.)";

/** Converte o áudio do microfone para PCM 16-bit e manda pedaços de ~100 ms */
const CAPTURE_WORKLET = `
class PcmCapture extends AudioWorkletProcessor {
  constructor() {
    super();
    this.size = Math.round(sampleRate * 0.1);
    this.buf = new Int16Array(this.size);
    this.len = 0;
  }
  process(inputs) {
    const ch = inputs[0] && inputs[0][0];
    if (!ch) return true;
    for (let i = 0; i < ch.length; i++) {
      const s = Math.max(-1, Math.min(1, ch[i]));
      this.buf[this.len++] = s < 0 ? s * 0x8000 : s * 0x7fff;
      if (this.len === this.size) {
        this.port.postMessage(this.buf.buffer, [this.buf.buffer]);
        this.buf = new Int16Array(this.size);
        this.len = 0;
      }
    }
    return true;
  }
}
registerProcessor("pcm-capture", PcmCapture);
`;

/** Só os campos das mensagens do servidor que a ligação usa */
interface LiveServerMessage {
  setupComplete?: object;
  serverContent?: {
    modelTurn?: { parts?: { inlineData?: { data?: string } }[] };
    interrupted?: boolean;
    turnComplete?: boolean;
    inputTranscription?: { text?: string };
    outputTranscription?: { text?: string };
  };
  toolCall?: { functionCalls?: { id: string; name: string; args?: unknown }[] };
  goAway?: object;
}

export type CallStatus ="connecting" | "listening" | "speaking" | "ended";

export interface LiveSessionConfig {
  token: string;
  expiresAt: string;
  setup: Record<string, unknown>;
  /** A ligação acaba no prazo porque terminaram os minutos de voz do dia (não pelo teto de 15 min) */
  endsByDailyLimit?: boolean;
}

export interface CallHandlers {
  /** Pede o token ao servidor; chamado depois de liberar o microfone */
  getSession: () => Promise<LiveSessionConfig>;
  /** Executa a ferramenta no worker e devolve o texto para o modelo */
  onToolCall: (name: string, args: unknown) => Promise<string>;
  onStatus: (status: CallStatus) => void;
  /** Transcrição parcial do que está sendo dito agora */
  onCaption: (caption: { user: string; assistant: string }) => void;
  /** Fim de uma troca: o que o usuário disse e o que o Théo respondeu */
  onTurn: (turn: { userText: string; reply: string }) => void;
  /** A ligação acabou; `error` explica quando não foi o usuário que desligou */
  onEnd: (error?: string) => void;
}

function toBase64(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

function pcm16ToFloat32(base64: string) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const pcm = new Int16Array(bytes.buffer, 0, bytes.length >> 1);
  const out = new Float32Array(pcm.length);
  for (let i = 0; i < pcm.length; i++) out[i] = pcm[i] / 0x8000;
  return out;
}

export class GeminiLiveCall {
  private ctx: AudioContext | null = null;
  private mic: MediaStream | null = null;
  private ws: WebSocket | null = null;
  private playing = new Set<AudioBufferSourceNode>();
  private playhead = 0;
  private userText = "";
  private reply = "";
  private muted = false;
  private ended = false;
  private lastActivity = Date.now();
  private watchdog: ReturnType<typeof setInterval> | undefined;
  private status: CallStatus = "connecting";

  constructor(private handlers: CallHandlers) {}

  /** Precisa ser chamado direto no clique: o iOS só libera áudio dentro do gesto do usuário */
  async start() {
    this.ctx = new AudioContext();
    void this.ctx.resume();
    this.setStatus("connecting");

    try {
      this.mic = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 },
      });
    } catch {
      return this.finish("Libere o microfone para conversar por voz com o Théo.");
    }
    if (this.ended) return;

    let session: LiveSessionConfig;
    try {
      session = await this.handlers.getSession();
    } catch (err) {
      return this.finish(err instanceof Error ? err.message : "Não foi possível ligar para o Théo agora.");
    }
    if (this.ended) return;

    const workletUrl = URL.createObjectURL(new Blob([CAPTURE_WORKLET], { type: "application/javascript" }));
    try {
      await this.ctx.audioWorklet.addModule(workletUrl);
    } catch {
      return this.finish("Este navegador não suporta a conversa por voz.");
    } finally {
      URL.revokeObjectURL(workletUrl);
    }
    if (this.ended) return;

    const ws = new WebSocket(`${WS_URL}?access_token=${encodeURIComponent(session.token)}`);
    ws.binaryType = "arraybuffer";
    this.ws = ws;
    ws.onopen = () => ws.send(JSON.stringify({ setup: session.setup }));
    ws.onmessage = (event) => this.onMessage(event.data);
    ws.onerror = () => console.error("[voice] websocket error");
    ws.onclose = (event) => {
      if (this.ended) return;
      console.error("[voice] websocket closed", event.code, event.reason);
      this.finish("A ligação caiu. Toque no microfone para chamar o Théo de novo.");
    };

    const msLeft = Date.parse(session.expiresAt) - Date.now();
    const timeUp = session.endsByDailyLimit
      ? "Acabaram seus minutos de voz de hoje. Amanhã tem mais! Pode continuar comigo por escrito."
      : "Chegamos no limite de tempo da ligação.";
    this.watchdog = setInterval(() => {
      if (Date.now() - this.lastActivity > IDLE_TIMEOUT_MS) this.finish("Encerrei a ligação porque ficou em silêncio.");
      else if (Date.parse(session.expiresAt) - Date.now() < 5_000) this.finish(timeUp);
    }, 5_000);
    if (msLeft <= 0) this.finish(timeUp);
  }

  setMuted(muted: boolean) {
    this.muted = muted;
    if (muted) this.send({ realtimeInput: { audioStreamEnd: true } });
  }

  /** Desligar pelo usuário */
  hangUp() {
    this.finish();
  }

  private send(message: object) {
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(message));
  }

  private setStatus(status: CallStatus) {
    if (this.status === status || this.ended) return;
    this.status = status;
    this.handlers.onStatus(status);
  }

  private startMic() {
    if (!this.ctx || !this.mic) return;
    const source = this.ctx.createMediaStreamSource(this.mic);
    const capture = new AudioWorkletNode(this.ctx, "pcm-capture");
    const mimeType = `audio/pcm;rate=${this.ctx.sampleRate}`;
    capture.port.onmessage = (event: MessageEvent<ArrayBuffer>) => {
      if (this.muted) return;
      this.send({ realtimeInput: { audio: { data: toBase64(event.data), mimeType } } });
    };
    // O nó só processa se estiver ligado ao destino; o ganho zero evita ouvir o próprio microfone
    const silence = this.ctx.createGain();
    silence.gain.value = 0;
    source.connect(capture).connect(silence).connect(this.ctx.destination);
  }

  private async onMessage(data: ArrayBuffer | string) {
    const text = typeof data === "string" ? data : new TextDecoder().decode(data);
    let msg: LiveServerMessage;
    try {
      msg = JSON.parse(text) as LiveServerMessage;
    } catch {
      return;
    }

    if (msg.setupComplete) {
      this.startMic();
      this.setStatus("listening");
      this.send({
        clientContent: { turns: [{ role: "user", parts: [{ text: GREETING }] }], turnComplete: true },
      });
      return;
    }

    if (msg.serverContent) {
      const content = msg.serverContent;
      if (content.interrupted) this.stopPlayback();
      for (const part of content.modelTurn?.parts ?? []) {
        if (part.inlineData?.data) this.play(part.inlineData.data);
      }
      if (content.inputTranscription?.text) {
        this.userText += content.inputTranscription.text;
        this.lastActivity = Date.now();
      }
      if (content.outputTranscription?.text) this.reply += content.outputTranscription.text;
      if (content.inputTranscription || content.outputTranscription) {
        this.handlers.onCaption({ user: this.userText.trim(), assistant: this.reply.trim() });
      }
      // Ao chamar ferramenta, o Gemini fecha uma troca sem fala e responde na seguinte:
      // segura a fala do usuário até a resposta chegar, para salvar o par junto
      if (content.turnComplete && this.reply.trim()) {
        const turn = { userText: this.userText.trim(), reply: this.reply.trim() };
        this.userText = "";
        this.reply = "";
        this.handlers.onTurn(turn);
      }
      return;
    }

    if (msg.toolCall) {
      this.lastActivity = Date.now();
      const responses = await Promise.all(
        (msg.toolCall.functionCalls ?? []).map(async (call) => ({
          id: call.id,
          name: call.name,
          // WHEN_IDLE: o Théo termina a frase em andamento antes de comentar o resultado
          response: { result: await this.handlers.onToolCall(call.name, call.args ?? {}), scheduling: "WHEN_IDLE" },
        })),
      );
      if (responses.length) this.send({ toolResponse: { functionResponses: responses } });
      return;
    }

    if (msg.goAway) {
      this.finish("Chegamos no limite de tempo da ligação.");
    }
  }

  private play(base64: string) {
    if (!this.ctx) return;
    this.lastActivity = Date.now();
    const samples = pcm16ToFloat32(base64);
    if (!samples.length) return;
    const buffer = this.ctx.createBuffer(1, samples.length, OUTPUT_SAMPLE_RATE);
    buffer.copyToChannel(samples, 0);
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(this.ctx.destination);
    this.playhead = Math.max(this.playhead, this.ctx.currentTime);
    source.start(this.playhead);
    this.playhead += buffer.duration;
    this.playing.add(source);
    this.setStatus("speaking");
    source.onended = () => {
      this.playing.delete(source);
      if (this.playing.size === 0) this.setStatus("listening");
    };
  }

  /** Usuário interrompeu: corta a fala na hora e volta a ouvir */
  private stopPlayback() {
    this.stopPlaybackSilently();
    this.playhead = 0;
    this.setStatus("listening");
  }

  private finish(error?: string) {
    if (this.ended) return;
    // O que ficou no meio (desligou com o Théo falando) ainda vale para o histórico
    const pending = { userText: this.userText.trim(), reply: this.reply.trim() };
    if (pending.userText || pending.reply) this.handlers.onTurn(pending);
    this.setStatus("ended");
    this.ended = true;
    clearInterval(this.watchdog);
    this.stopPlaybackSilently();
    this.mic?.getTracks().forEach((t) => t.stop());
    if (this.ws && this.ws.readyState <= WebSocket.OPEN) this.ws.close();
    void this.ctx?.close();
    this.handlers.onEnd(error);
  }

  private stopPlaybackSilently() {
    for (const source of this.playing) {
      source.onended = null;
      try {
        source.stop();
      } catch {
        // já tinha terminado
      }
    }
    this.playing.clear();
  }
}
