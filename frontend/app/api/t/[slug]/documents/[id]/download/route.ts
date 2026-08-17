import { NextResponse } from "next/server";
import { readSession } from "../../../../../../../lib/server/backend";

const BASE_URL = process.env.BACKEND_URL ?? "http://localhost:8080";

/** Streams a stored document back through the session, so storage stays private. */
export async function GET(_request: Request, { params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  const session = await readSession();
  if (!session) {
    return NextResponse.json({ code: "UNAUTHENTICATED", message: "Sign in to continue." }, { status: 401 });
  }
  try {
    const response = await fetch(new URL(`/api/v1/documents/${id}/download`, BASE_URL), {
      headers: { Authorization: `Bearer ${session.token}`, "X-Tenant-Slug": slug }
    });
    if (!response.ok || !response.body) {
      return NextResponse.json({ code: "DOCUMENT_NOT_FOUND", message: "That document is not available." },
        { status: response.status });
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
