import { proxy } from "../../../../../../lib/server/backend";

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return proxy("/reference-library/templates", slug, { request });
}
