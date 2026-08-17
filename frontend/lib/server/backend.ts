import { cookies } from "next/headers";
import { NextResponse } from "next/server";

/**
 * Server-side gateway to the Spring API.
 *
 * The browser never holds a token: the access and refresh tokens live in an httpOnly, SameSite
 * cookie that only this process reads. A company slug is forwarded as a header, and the backend
 * re-verifies membership on every request before any row is returned.
 */
const BASE_URL = process.env.BACKEND_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";
export const SESSION_COOKIE = "bf_session";

export type Session = {
  token: string;
  refreshToken: string;
  expiresAt: number;
  userId: string;
  email: string;
  name: string;
};

const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "strict" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 60 * 60 * 24 * 14
};

export function encodeSession(session: Session) {
  return Buffer.from(JSON.stringify(session), "utf8").toString("base64url");
}

function decodeSession(raw: string): Session | null {
  try {
    return JSON.parse(Buffer.from(raw, "base64url").toString("utf8")) as Session;
  } catch {
    return null;
  }
}

export async function readSession(): Promise<Session | null> {
  const store = await cookies();
  const raw = store.get(SESSION_COOKIE)?.value;
  return raw ? decodeSession(raw) : null;
}

export function applySession(response: NextResponse, session: Session) {
  response.cookies.set(SESSION_COOKIE, encodeSession(session), COOKIE_OPTIONS);
  return response;
}

export function clearSession(response: NextResponse) {
  response.cookies.set(SESSION_COOKIE, "", { ...COOKIE_OPTIONS, maxAge: 0 });
  return response;
}

export type BackendResult =
  | { ok: true; status: number; data: unknown }
  | { ok: false; status: number; error: unknown };

export async function callBackend(
  path: string,
  init: {
    method?: string;
    body?: unknown;
    tenantSlug?: string;
    token?: string | null;
    search?: URLSearchParams;
  } = {}
): Promise<BackendResult> {
  const url = new URL(`/api/v1${path.startsWith("/") ? path : `/${path}`}`, BASE_URL);
  if (init.search) {
    init.search.forEach((value, key) => url.searchParams.set(key, value));
  }

  const headers: Record<string, string> = { Accept: "application/json" };
  if (init.body !== undefined) headers["Content-Type"] = "application/json";
  if (init.token) headers.Authorization = `Bearer ${init.token}`;
  if (init.tenantSlug) headers["X-Tenant-Slug"] = init.tenantSlug;

  try {
    const response = await fetch(url, {
      method: init.method ?? "GET",
      headers,
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      cache: "no-store"
    });
    const text = await response.text();
    const data = text ? JSON.parse(text) : null;
    return response.ok
      ? { ok: true, status: response.status, data }
      : { ok: false, status: response.status, error: data };
  } catch {
    return {
      ok: false,
      status: 503,
      error: {
        code: "BACKEND_UNAVAILABLE",
        message: "The API is not reachable. Start it with `docker compose up backend`."
      }
    };
  }
}

/** Exchanges the refresh token for a new pair. Rotation is enforced by the backend. */
async function refreshSession(session: Session): Promise<Session | null> {
  const result = await callBackend("/auth/refresh", {
    method: "POST",
    body: { refreshToken: session.refreshToken }
  });
  if (!result.ok) return null;
  const data = result.data as {
    token: string; refreshToken: string; expiresIn: number; userId: string; email: string; fullName: string;
  };
  return {
    token: data.token,
    refreshToken: data.refreshToken,
    expiresAt: Date.now() + data.expiresIn * 1000,
    userId: data.userId,
    email: data.email,
    name: data.fullName ?? data.email
  };
}

/** Cross-site requests cannot carry the cookie (SameSite=strict), and the origin is checked too. */
function originAllowed(request: Request) {
  const method = request.method.toUpperCase();
  if (method === "GET" || method === "HEAD") return true;
  const origin = request.headers.get("origin");
  if (!origin) return true;
  const host = request.headers.get("host");
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

/**
 * Proxies a request to the backend with the caller's session, refreshing the access token when it
 * has expired and rejecting cross-origin writes.
 */
export async function proxy(
  path: string,
  tenantSlug: string,
  init: { method?: string; body?: unknown; search?: URLSearchParams; request?: Request } = {}
) {
  if (init.request && !originAllowed(init.request)) {
    return NextResponse.json(
      { code: "CROSS_ORIGIN_BLOCKED", message: "This request did not come from the application." },
      { status: 403 }
    );
  }

  let session = await readSession();
  if (!session) {
    return NextResponse.json(
      { code: "UNAUTHENTICATED", message: "Your session has expired. Sign in again." },
      { status: 401 }
    );
  }

  let rotated: Session | null = null;
  if (session.expiresAt && session.expiresAt < Date.now() + 5000) {
    rotated = await refreshSession(session);
    if (!rotated) {
      return clearSession(NextResponse.json(
        { code: "SESSION_EXPIRED", message: "Your session has expired. Sign in again." },
        { status: 401 }
      ));
    }
    session = rotated;
  }

  let result = await callBackend(path, { ...init, tenantSlug, token: session.token });

  if (!result.ok && result.status === 401 && !rotated) {
    rotated = await refreshSession(session);
    if (rotated) {
      session = rotated;
      result = await callBackend(path, { ...init, tenantSlug, token: session.token });
    }
  }

  const response = result.ok
    ? NextResponse.json(result.data, { status: result.status })
    : NextResponse.json(
        result.error ?? { code: "REQUEST_FAILED", message: "The request failed." },
        { status: result.status }
      );

  return rotated ? applySession(response, rotated) : response;
}
