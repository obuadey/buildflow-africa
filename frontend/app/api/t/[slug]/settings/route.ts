import { proxy } from "../../../../../lib/server/backend";

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return proxy("/settings", slug);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const body = await request.json().catch(() => null);
  return proxy("/settings", slug, { method: "PATCH", body });
}
