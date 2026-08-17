import { NextResponse } from "next/server";
import { readSession } from "../../../../../../../lib/server/backend";

const BASE_URL = process.env.BACKEND_URL ?? "http://localhost:8080";

type Params = { params: Promise<{ slug: string; id: string }> };

export async function POST(request: Request, { params }: Params) {
  const { slug, id } = await params;
  const session = await readSession();
  if (!session) {
    return NextResponse.json({ code: "UNAUTHENTICATED", message: "Sign in to continue." }, { status: 401 });
  }

  try {
    const response = await fetch(new URL(`/api/v1/expenses/${id}/receipt`, BASE_URL), {
      method: "POST",
      headers: { Authorization: `Bearer ${session.token}`, "X-Tenant-Slug": slug },
      body: await request.formData()
    });
    const text = await response.text();
    return NextResponse.json(text ? JSON.parse(text) : null, { status: response.status });
  } catch {
    return NextResponse.json({ code: "BACKEND_UNAVAILABLE", message: "The API is not reachable." }, { status: 503 });
  }
}

export async function GET(_request: Request, { params }: Params) {
  const { slug, id } = await params;
  const session = await readSession();
  if (!session) {
    return NextResponse.json({ code: "UNAUTHENTICATED", message: "Sign in to continue." }, { status: 401 });
  }

  try {
    const response = await fetch(new URL(`/api/v1/expenses/${id}/receipt`, BASE_URL), {
      headers: { Authorization: `Bearer ${session.token}`, "X-Tenant-Slug": slug }
    });
    if (!response.ok || !response.body) {
      return NextResponse.json({ code: "RECEIPT_NOT_FOUND", message: "That receipt is not available." }, { status: response.status });
    }
    return new NextResponse(response.body, {
      status: 200,
      headers: {
        "Content-Type": response.headers.get("content-type") ?? "application/octet-stream",
        "Content-Disposition": response.headers.get("content-disposition") ?? "attachment"
      }
    });
  } catch {
    return NextResponse.json({ code: "BACKEND_UNAVAILABLE", message: "The API is not reachable." }, { status: 503 });
  }
}
