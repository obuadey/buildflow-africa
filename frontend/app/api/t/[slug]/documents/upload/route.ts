import { NextResponse } from "next/server";
import { readSession } from "../../../../../../lib/server/backend";

const BASE_URL = process.env.BACKEND_URL ?? "http://localhost:8080";

/** Streams a multipart upload to the API with the caller's token and company attached. */
export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const session = await readSession();
  if (!session) {
    return NextResponse.json({ code: "UNAUTHENTICATED", message: "Sign in to continue." }, { status: 401 });
  }

  const incoming = await request.formData();
  const search = new URL(request.url).searchParams;
  const url = new URL("/api/v1/documents", BASE_URL);
  search.forEach((value, key) => url.searchParams.set(key, value));

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${session.token}`, "X-Tenant-Slug": slug },
      body: incoming
    });
    const text = await response.text();
    return NextResponse.json(text ? JSON.parse(text) : null, { status: response.status });
  } catch {
    return NextResponse.json(
      { code: "BACKEND_UNAVAILABLE", message: "The API is not reachable." },
      { status: 503 }
    );
  }
}
