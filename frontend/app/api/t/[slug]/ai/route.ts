import { proxy } from "../../../../../lib/server/backend";

/** Assistant. Figures are computed by the backend; the model only phrases them. */
export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const body = await request.json().catch(() => null);
  return proxy("/ai/assistant", slug, { method: "POST", body });
}
