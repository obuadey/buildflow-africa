import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE = "bf_session";
const BASE_URL = process.env.BACKEND_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

/** Public paths. Everything else under a company slug requires a session. */
const PUBLIC = [
  "/", "/login", "/register", "/onboarding", "/features", "/pricing", "/about", "/contact",
  "/privacy", "/terms", "/blog", "/q", "/forgot-password", "/reset-password"
];

const SECURITY_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  "Cross-Origin-Opener-Policy": "same-origin",
  "X-DNS-Prefetch-Control": "off"
};

const DEVELOPMENT = process.env.NODE_ENV !== "production";

/**
 * Next's development server compiles modules through `eval`, and its hot reload channel is a
 * WebSocket. Without those two allowances in development the bundle never evaluates, React never
 * hydrates, and every button on the site does nothing. Neither is granted in a production build,
 * where the policy stays as tight as it reads.
 */
const CSP = [
  "default-src 'self'",
  // Next injects inline bootstrap scripts; styles come from the bundle and Google Fonts.
  `script-src 'self' 'unsafe-inline'${DEVELOPMENT ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: blob:",
  "media-src 'self'",
  `connect-src 'self'${DEVELOPMENT ? " ws: wss:" : ""}`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'"
].join("; ");

const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "strict" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 60 * 60 * 24 * 14
};

type Session = {
  token: string;
  refreshToken: string;
  expiresAt: number;
  userId: string;
  email: string;
  name: string;
};

/* Middleware runs on the Edge runtime, where Buffer does not exist. */
function decodeSession(raw: string): Session | null {
  try {
    const padded = raw.replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(decodeURIComponent(escape(atob(padded)))) as Session;
  } catch {
    return null;
  }
}

function encodeSession(session: Session) {
  return btoa(unescape(encodeURIComponent(JSON.stringify(session))))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * Access tokens last fifteen minutes. Server-rendered pages cannot rotate a cookie, so without a
 * refresh here every page would start answering "you are not a member of this company" a quarter of
 * an hour after signing in. Middleware runs before the page and can write the new cookie, so the
 * rotation happens in the one place that is able to persist it.
 */
async function refresh(session: Session): Promise<Session | null> {
  try {
    const response = await fetch(new URL("/api/v1/auth/refresh", BASE_URL), {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ refreshToken: session.refreshToken }),
      cache: "no-store"
    });
    if (!response.ok) return null;
    const data = await response.json() as {
      token: string; refreshToken: string; expiresIn: number;
      userId: string; email: string; fullName: string;
    };
    return {
      token: data.token,
      refreshToken: data.refreshToken,
      expiresAt: Date.now() + data.expiresIn * 1000,
      userId: data.userId,
      email: data.email,
      name: data.fullName ?? data.email
    };
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isPublic =
    PUBLIC.some((path) => pathname === path || pathname.startsWith(`${path}/`)) ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/platform") ||
    pathname.startsWith("/api/public") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/media") ||
    pathname.startsWith("/brand") ||
    /\.[a-z0-9]+$/i.test(pathname);

  const raw = request.cookies.get(SESSION_COOKIE)?.value;

  if (!isPublic && !raw) {
    return unauthenticated(request, pathname);
  }

  // Renew a session that is about to expire, so the page behind this request renders signed in.
  let rotated: Session | null = null;
  const session = raw ? decodeSession(raw) : null;
  if (!isPublic && session && session.expiresAt && session.expiresAt < Date.now() + 30_000) {
    rotated = await refresh(session);
    if (!rotated) {
      const response = unauthenticated(request, pathname);
      response.cookies.set(SESSION_COOKIE, "", { ...COOKIE_OPTIONS, maxAge: 0 });
      return response;
    }
  }

  const headers = new Headers(request.headers);
  if (rotated) {
    // The page is rendered in this same pass, so it has to read the new cookie from the request.
    headers.set("cookie", `${SESSION_COOKIE}=${encodeSession(rotated)}`);
  }

  const response = NextResponse.next({ request: { headers } });
  Object.entries(SECURITY_HEADERS).forEach(([header, value]) => response.headers.set(header, value));
  response.headers.set("Content-Security-Policy", CSP);
  if (process.env.NODE_ENV === "production") {
    response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
  if (rotated) {
    response.cookies.set(SESSION_COOKIE, encodeSession(rotated), COOKIE_OPTIONS);
  }
  return response;
}

function unauthenticated(request: NextRequest, pathname: string) {
  if (pathname.startsWith("/api/")) {
    return NextResponse.json(
      { code: "UNAUTHENTICATED", message: "Sign in to continue." },
      { status: 401 }
    );
  }
  const login = request.nextUrl.clone();
  login.pathname = "/login";
  login.search = `?next=${encodeURIComponent(pathname)}`;
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};
