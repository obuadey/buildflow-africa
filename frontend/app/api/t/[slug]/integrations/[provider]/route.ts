import { proxy } from "../../../../../../lib/server/backend";

export async function PATCH(request: Request, { params }: { params: Promise<{ slug: string; provider: string }> }) {
  const { slug, provider } = await params;
  const body = await request.json().catch(() => null);
  return proxy(`/integrations/${provider}`, slug, { method: "PATCH", body, request });
}
