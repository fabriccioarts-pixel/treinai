import { auth } from "@/auth";
import { NextResponse } from "next/server";

const AUTH_PAGES = ["/login", "/cadastro", "/esqueci-senha", "/redefinir-senha"];

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isAuthPage = AUTH_PAGES.some((page) => req.nextUrl.pathname.startsWith(page));

  if (!isLoggedIn && !isAuthPage) {
    const loginUrl = new URL("/login", req.nextUrl);
    loginUrl.searchParams.set("callbackUrl", req.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isLoggedIn && isAuthPage) {
    return NextResponse.redirect(new URL("/", req.nextUrl));
  }
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
