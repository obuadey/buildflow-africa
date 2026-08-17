import { proxy } from "../../../../../lib/server/backend";

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const search = new URL(request.url).searchParams;
  return proxy("/dashboard/summary", slug, { search });
}
