import { NextResponse } from "next/server";
import { SESSION_COOKIE, callBackend, encodeSession, readSession } from "../../../../../../lib/server/backend";

/**
 * Raises the user's token version on the backend, invalidating every other access token, and
 * replaces this device's cookie with the freshly issued one.
 */
export async function POST(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const session = await readSession();
  if (!session) {
    return NextResponse.json({ code: "UNAUTHENTICATED", message: "Sign in to continue." }, { status: 401 });
  }
  const result = await callBackend("/auth/sessions/revoke-others", {
    method: "POST", token: session.token, tenantSlug: slug
  });
  if (!result.ok) {
    return NextResponse.json(result.error, { status: result.status });
  }
  const data = result.data as { token: string; message: string };
  const response = NextResponse.json({ message: data.message });
  response.cookies.set(SESSION_COOKIE, encodeSession({ ...session, token: data.token }), {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 12
  });
  return response;
}
