import { proxy } from "../../../../../../lib/server/backend";

export async function GET(_: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return proxy("/ai/health", slug);
}
