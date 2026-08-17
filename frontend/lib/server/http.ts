import { NextResponse } from "next/server";

const MESSAGES: Record<number, { code: string; message: string }> = {
  400: { code: "BAD_REQUEST", message: "The request payload was not valid." },
  403: { code: "TENANT_FORBIDDEN", message: "You do not have access to this company." },
  404: { code: "NOT_FOUND", message: "The requested record could not be found." }
};

export function deny(status: 400 | 403 | 404, message?: string) {
  const body = { ...MESSAGES[status], ...(message ? { message } : {}) };
  return NextResponse.json(
    { ...body, timestamp: new Date().toISOString(), traceId: Math.random().toString(36).slice(2, 12) },
    { status }
  );
}
