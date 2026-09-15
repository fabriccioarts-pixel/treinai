import { auth } from "@/auth";
import { NextResponse } from "next/server";

const AUTH_PAGES = ["/login", "/cadastro", "/esqueci-senha", "/redefinir-senha"];
// Match exato — "/bem-vindo/conversa" (boas-vindas da IA) continua exigindo login.
const PUBLIC_ONLY_EXACT_PAGES = ["/bem-vindo"];

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const path = req.nextUrl.pathname;
  const isPublicOnlyPage =
    AUTH_PAGES.some((page) => path.startsWith(page)) || PUBLIC_ONLY_EXACT_PAGES.includes(path);

  // Visitante não logado abrindo a home direto vê a landing page, não o login.
  if (!isLoggedIn && path === "/") {
    return NextResponse.redirect(new URL("/bem-vindo", req.nextUrl));
  }

  if (!isLoggedIn && !isPublicOnlyPage) {
    const loginUrl = new URL("/login", req.nextUrl);
    loginUrl.searchParams.set("callbackUrl", path);
    return NextResponse.redirect(loginUrl);
  }

  if (isLoggedIn && isPublicOnlyPage) {
    return NextResponse.redirect(new URL("/", req.nextUrl));
  }
});

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico)$).*)",
  ],
};
