import { NextResponse } from "next/server";
import { callBackend, readSession } from "../../../../lib/server/backend";

/**
 * Operator console gateway.
 *
 * Platform routes never carry a company header: an operator's privileges come from their platform
 * role, and reaching a company's data requires an audited impersonation session instead.
 */
async function forward(request: Request, path: string[], method: string) {
  const session = await readSession();
  if (!session) {
    return NextResponse.json({ code: "UNAUTHENTICATED", message: "Sign in to continue." }, { status: 401 });
  }
  if (method !== "GET") {
    const origin = request.headers.get("origin");
    if (origin) {
      try {
        if (new URL(origin).host !== request.headers.get("host")) {
          return NextResponse.json(
            { code: "CROSS_ORIGIN_BLOCKED", message: "This request did not come from the console." },
            { status: 403 }
          );
        }
      } catch {
        return NextResponse.json({ code: "CROSS_ORIGIN_BLOCKED", message: "Invalid origin." }, { status: 403 });
      }
    }
  }

  const body = method === "GET" || method === "DELETE"
    ? undefined
    : await request.json().catch(() => ({}));
  const result = await callBackend(`/platform/${path.join("/")}`, {
    method,
    body,
    token: session.token,
    search: new URL(request.url).searchParams
  });
  return result.ok
    ? NextResponse.json(result.data, { status: result.status })
    : NextResponse.json(result.error, { status: result.status });
}

type Params = { params: Promise<{ path: string[] }> };

export async function GET(request: Request, { params }: Params) {
  return forward(request, (await params).path, "GET");
}

export async function POST(request: Request, { params }: Params) {
  return forward(request, (await params).path, "POST");
}

export async function PATCH(request: Request, { params }: Params) {
  return forward(request, (await params).path, "PATCH");
}

export async function DELETE(request: Request, { params }: Params) {
  return forward(request, (await params).path, "DELETE");
}
