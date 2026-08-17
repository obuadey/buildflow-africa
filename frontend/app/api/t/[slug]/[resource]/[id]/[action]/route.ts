import { proxy } from "../../../../../../../lib/server/backend";
import { RESOURCE_PATHS, isResource } from "../../../../../../../lib/server/resource-map";
import { NextResponse } from "next/server";

/** Record actions: invoices/{id}/send, invoices/{id}/payments, variations/{id}/approve, notifications/{id}/read. */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string; resource: string; id: string; action: string }> }
) {
  const { slug, resource, id, action } = await params;
  if (!isResource(resource)) {
    return NextResponse.json({ code: "NOT_FOUND", message: "Unknown resource." }, { status: 404 });
  }
  const body = await request.json().catch(() => null);
  return proxy(`${RESOURCE_PATHS[resource]}/${id}/${action}`, slug, { method: "POST", body });
}
