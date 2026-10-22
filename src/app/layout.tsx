import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Geist, Geist_Mono } from "next/font/google";
import { INSTALL_CAPTURE_SCRIPT } from "@/lib/install-capture";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Treinai — Treinos e Progressão",
  description:
    "Monte treinos, registre séries e acompanhe sua evolução de carga, volume e PRs.",
  icons: {
    icon: "/logo-icon.png",
    apple: "/logo-icon.png",
  },
  // Aberto pela Tela de Início do iPhone: tela cheia, com o nome curto embaixo do ícone
  appleWebApp: {
    capable: true,
    title: "Treinai",
    statusBarStyle: "black",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#181f18",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`dark ${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        {children}
        {/* O Chrome pode avisar que dá para instalar antes do React carregar: guarda o aviso para o convite */}
        <Script id="install-capture" strategy="beforeInteractive">
          {INSTALL_CAPTURE_SCRIPT}
        </Script>
      </body>
    </html>
  );
}
