import { proxy } from "../../../../../../lib/server/backend";
import { RESOURCE_PATHS, isResource } from "../../../../../../lib/server/resource-map";
import { NextResponse } from "next/server";

type Params = { params: Promise<{ slug: string; resource: string; id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { slug, resource, id } = await params;
  if (!isResource(resource)) {
    return NextResponse.json({ code: "NOT_FOUND", message: "Unknown resource." }, { status: 404 });
  }
  return proxy(`${RESOURCE_PATHS[resource]}/${id}`, slug);
}

export async function PATCH(request: Request, { params }: Params) {
  const { slug, resource, id } = await params;
  if (!isResource(resource)) {
    return NextResponse.json({ code: "NOT_FOUND", message: "Unknown resource." }, { status: 404 });
  }
  const body = await request.json().catch(() => null);
  return proxy(`${RESOURCE_PATHS[resource]}/${id}`, slug, { method: "PATCH", body });
}

export async function POST(request: Request, { params }: Params) {
  const { slug, resource, id } = await params;
  if (!isResource(resource)) {
    return NextResponse.json({ code: "NOT_FOUND", message: "Unknown resource." }, { status: 404 });
  }
  const body = await request.json().catch(() => null);
  return proxy(`${RESOURCE_PATHS[resource]}/${id}`, slug, { method: "POST", body });
}

export async function DELETE(_request: Request, { params }: Params) {
  const { slug, resource, id } = await params;
  if (!isResource(resource)) {
    return NextResponse.json({ code: "NOT_FOUND", message: "Unknown resource." }, { status: 404 });
  }
  return proxy(`${RESOURCE_PATHS[resource]}/${id}`, slug, { method: "DELETE" });
}
