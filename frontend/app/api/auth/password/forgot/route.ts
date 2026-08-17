import { NextResponse } from "next/server";
import { callBackend } from "../../../../../lib/server/backend";

/** Always answers the same way, so the form cannot be used to discover which emails have accounts. */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const result = await callBackend("/auth/password/forgot", { method: "POST", body });
  return NextResponse.json(
    result.ok ? result.data : { message: "If that email has an account, a reset link is on its way." },
    { status: 202 }
  );
}
