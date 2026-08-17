import { NextResponse } from "next/server";
import { callBackend } from "../../../../../lib/server/backend";

/** Public, tokenised quotation access. No session, no tenant identifiers, no cost data. */
export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const result = await callBackend(`/public/quotations/${token}`);
  return result.ok
    ? NextResponse.json(result.data)
    : NextResponse.json(result.error, { status: result.status });
}

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const body = await request.json().catch(() => null);
  const forwarded = request.headers.get("x-forwarded-for") ?? "";
  const result = await callBackend(`/public/quotations/${token}/decision`, {
    method: "POST",
    body: { ...(body ?? {}), ipAddress: forwarded, userAgent: request.headers.get("user-agent") ?? "" }
  });
  return result.ok
    ? NextResponse.json(result.data)
    : NextResponse.json(result.error, { status: result.status });
}
