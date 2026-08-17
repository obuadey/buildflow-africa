import { proxy } from "../../../../../../lib/server/backend";

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const body = await request.json().catch(() => null);
  return proxy("/quick-estimate/questionnaire", slug, { method: "POST", body, request });
}
