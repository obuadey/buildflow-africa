import { NextResponse } from "next/server";
import { applySession, callBackend } from "../../../../lib/server/backend";

type AuthResponse = {
  token: string; refreshToken: string; expiresIn: number;
  userId: string; email: string; fullName: string; tenantSlug: string | null;
};

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const result = await callBackend("/auth/register", { method: "POST", body });

  if (!result.ok) {
    return NextResponse.json(result.error, { status: result.status });
  }

  const auth = result.data as AuthResponse;
  return applySession(
    NextResponse.json({ tenantSlug: auth.tenantSlug }, { status: 201 }),
    {
      token: auth.token,
      refreshToken: auth.refreshToken,
      expiresAt: Date.now() + auth.expiresIn * 1000,
      userId: auth.userId,
      email: auth.email,
      name: auth.fullName ?? auth.email
    }
  );
}
