import { NextRequest, NextResponse } from "next/server";

import { getAuthEnv, getCookieValue, getSessionByToken, getSessionCookieName } from "@/server/auth";

const PUBLIC_PATH_PREFIXES = ["/login", "/accept-invite", "/api/auth", "/api/health"];
const STATIC_PATH_PREFIXES = ["/_next", "/favicon.ico", "/icons", "/images"];
const PUBLIC_FILE = /\.[^/]+$/;

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublicPath(pathname) || isStaticAsset(pathname)) {
    return NextResponse.next();
  }

  const cookieName = getSessionCookieName();
  const token = request.cookies.get(cookieName)?.value ?? getCookieValue(request, cookieName);

  if (!token) {
    return redirectToLogin(request);
  }

  try {
    const env = await getAuthEnv();
    const session = await getSessionByToken(env.DB, token);

    if (!session) {
      return redirectToLogin(request);
    }

    if (pathname.startsWith("/admin") && session.user.role !== "admin") {
      return redirectToHome(request);
    }

    return NextResponse.next();
  } catch (error) {
    console.error("Auth middleware failed", error);
    return redirectToLogin(request);
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

function isPublicPath(pathname: string) {
  return PUBLIC_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

function isStaticAsset(pathname: string) {
  if (STATIC_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return true;
  }

  return PUBLIC_FILE.test(pathname);
}

function redirectToLogin(request: NextRequest) {
  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  return NextResponse.redirect(url);
}

function redirectToHome(request: NextRequest) {
  const url = request.nextUrl.clone();
  url.pathname = "/";
  url.search = "";
  return NextResponse.redirect(url);
}
