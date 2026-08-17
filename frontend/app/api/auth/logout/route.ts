import { NextResponse } from "next/server";
import { callBackend, clearSession, readSession } from "../../../../lib/server/backend";

/** Revokes the refresh token on the server, then clears the cookie. */
export async function POST() {
  const session = await readSession();
  if (session) {
    await callBackend("/auth/logout", { method: "POST", body: { refreshToken: session.refreshToken } });
  }
  return clearSession(NextResponse.json({ ok: true }));
}
