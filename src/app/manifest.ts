import type { MetadataRoute } from "next";

// Necessário para instalar o app na tela inicial (no iPhone, só assim as notificações funcionam)
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Treinai",
    short_name: "Treinai",
    description: "Seu treino, sua evolução e o Théo, seu coach com IA.",
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#0a0a0a",
    theme_color: "#0a0a0a",
    lang: "pt-BR",
    // O Chrome só oferece instalar com os dois tamanhos
    icons: [
      { src: "/logo-icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/logo-icon.png", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  };
}
