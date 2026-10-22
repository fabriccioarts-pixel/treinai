/*
 * Script curto que o layout raiz põe na página: guarda o beforeinstallprompt do Chrome/Edge mesmo que ele
 * chegue antes do React, para o convite de instalar (src/lib/install-app.ts) usar depois.
 * Fica fora de install-app.ts porque aquele módulo é "use client" e o layout raiz roda no servidor.
 */
export const INSTALL_CHANGE_EVENT = "treinai:install-change";

export const INSTALL_CAPTURE_SCRIPT = `window.addEventListener("beforeinstallprompt",function(e){e.preventDefault();window.__treinaiInstallPrompt=e;window.dispatchEvent(new Event("${INSTALL_CHANGE_EVENT}"));});window.addEventListener("appinstalled",function(){window.__treinaiInstallPrompt=null;window.dispatchEvent(new Event("${INSTALL_CHANGE_EVENT}"));});`;
