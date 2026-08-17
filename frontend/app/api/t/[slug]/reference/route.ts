import { proxy } from "../../../../../lib/server/backend";

/** Regions, units, categories, statuses and the role matrix — served by the API, not the bundle. */
export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return proxy("/reference", slug);
}
