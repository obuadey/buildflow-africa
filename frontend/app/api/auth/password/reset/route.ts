import { NextResponse } from "next/server";
import { callBackend } from "../../../../../lib/server/backend";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const result = await callBackend("/auth/password/reset", { method: "POST", body });
  return result.ok
    ? NextResponse.json(result.data)
    : NextResponse.json(result.error, { status: result.status });
}
