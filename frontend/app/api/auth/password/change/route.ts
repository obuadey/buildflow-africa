import { NextResponse } from "next/server";
import { callBackend, readSession } from "../../../../../lib/server/backend";

/** Changing a password needs the caller's own token, which only this process holds. */
export async function POST(request: Request) {
  const session = await readSession();
  if (!session) {
    return NextResponse.json(
      { code: "UNAUTHENTICATED", message: "Sign in to continue." }, { status: 401 });
  }
  const body = await request.json().catch(() => null);
  const result = await callBackend("/auth/password/change",
    { method: "POST", body, token: session.token });
  return result.ok
    ? NextResponse.json(result.data)
    : NextResponse.json(result.error, { status: result.status });
}
