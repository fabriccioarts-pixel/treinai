"use client";

import { useSyncExternalStore } from "react";

/**
 * Preferências do aparelho (som, vibração, tela acesa, incremento de carga).
 * Ficam no localStorage: são ajustes de quem segura o celular, não dados da conta.
 */
export interface Preferences {
  /** Quanto o + e o − da carga somam na tela de treino */
  weightStep: 1 | 2.5 | 5;
  /** Bipe quando o descanso acaba */
  restSound: boolean;
  /** Vibração quando o descanso acaba */
  restVibration: boolean;
  /** Impede a tela de apagar durante o treino */
  keepScreenOn: boolean;
}

export const DEFAULT_PREFERENCES: Preferences = {
  weightStep: 2.5,
  restSound: true,
  restVibration: true,
  keepScreenOn: true,
};

export const WEIGHT_STEPS: Preferences["weightStep"][] = [1, 2.5, 5];

const STORAGE_KEY = "treinai:preferences";
// O evento "storage" só chega em outras abas; este avisa a própria aba
const CHANGE_EVENT = "treinai:preferences-change";

// useSyncExternalStore exige o mesmo objeto enquanto nada mudou: guarda a última leitura
let cachedRaw: string | null | undefined;
let cachedValue: Preferences = DEFAULT_PREFERENCES;

function read(): Preferences {
  let raw: string | null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch {
    // Armazenamento bloqueado: vale o que foi escolhido nesta visita (ou o padrão)
    return cachedValue;
  }
  if (raw === cachedRaw) return cachedValue;
  cachedRaw = raw;
  try {
    const parsed = raw ? (JSON.parse(raw) as Partial<Preferences>) : {};
    cachedValue = {
      ...DEFAULT_PREFERENCES,
      ...parsed,
      weightStep: WEIGHT_STEPS.includes(parsed.weightStep as Preferences["weightStep"])
        ? (parsed.weightStep as Preferences["weightStep"])
        : DEFAULT_PREFERENCES.weightStep,
    };
  } catch {
    cachedValue = DEFAULT_PREFERENCES;
  }
  return cachedValue;
}

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

export function savePreferences(patch: Partial<Preferences>) {
  const next = { ...read(), ...patch };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Sem armazenamento a mudança vale só até recarregar
    cachedValue = next;
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

/** Preferências atuais; no servidor (e no primeiro render) devolve o padrão */
export function usePreferences(): Preferences {
  return useSyncExternalStore(subscribe, read, () => DEFAULT_PREFERENCES);
}
