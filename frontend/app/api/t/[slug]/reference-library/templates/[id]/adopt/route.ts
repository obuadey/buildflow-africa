import { proxy } from "../../../../../../../../lib/server/backend";

export async function POST(request: Request,
                           { params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  const body = await request.json().catch(() => null);
  return proxy(`/reference-library/templates/${id}/adopt`, slug, { method: "POST", body, request });
}
