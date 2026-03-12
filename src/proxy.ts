import createMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";
import { routing } from "./i18n/routing";

const intlMiddleware = createMiddleware(routing);

// Routes that require authentication
const protectedPaths = [
  "/dashboard",
  "/ai-chat",
  "/article",
  "/ai-tools",
  "/code-generator",
  "/image-generator",
  "/image-editor",
  "/email-generator",
  "/video-generator",
  "/collection",
  "/profile",
  "/appearance",
  "/plans-billing",
  "/sessions",
  "/notification",
  "/help",
  "/security",
  "/settings",
];

// Routes that should redirect to app if already authenticated
const authPaths = [
  "/signin",
  "/signup",
  "/email-confirmation",
  "/reset-password",
];

function getPathWithoutLocale(pathname: string): string {
  return pathname.replace(/^\/(en|id)/, "") || "/";
}

function isTokenValid(token: string | undefined): boolean {
  if (!token) return false;
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return false;
    const payload = JSON.parse(atob(parts[1]));
    if (payload.exp && payload.exp * 1000 < Date.now()) return false;
    return true;
  } catch {
    return false;
  }
}

export default function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const cleanPath = getPathWithoutLocale(pathname);
  const token = request.cookies.get("access_token")?.value;
  const validToken = isTokenValid(token);

  const isProtected = protectedPaths.some(
    (p) => cleanPath === p || cleanPath.startsWith(p + "/"),
  );
  const isAuthPage = authPaths.some(
    (p) => cleanPath === p || cleanPath.startsWith(p + "/"),
  );

  if (isProtected && !validToken) {
    const locale = pathname.match(/^\/(en|id)/)?.[1] || "en";
    const signinUrl = new URL(`/${locale}/signin`, request.url);
    signinUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(signinUrl);
  }

  if (isAuthPage && validToken) {
    const locale = pathname.match(/^\/(en|id)/)?.[1] || "en";
    return NextResponse.redirect(new URL(`/${locale}/dashboard`, request.url));
  }

  return intlMiddleware(request);
}

export const config = {
  matcher: "/((?!api|trpc|_next|_vercel|.*\\..*).*)",
};
