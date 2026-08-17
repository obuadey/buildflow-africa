import { proxy } from "../../../../../lib/server/backend";
import { RESOURCE_PATHS, isResource } from "../../../../../lib/server/resource-map";
import { NextResponse } from "next/server";

export async function GET(request: Request, { params }: { params: Promise<{ slug: string; resource: string }> }) {
  const { slug, resource } = await params;
  if (!isResource(resource)) {
    return NextResponse.json({ code: "NOT_FOUND", message: "Unknown resource." }, { status: 404 });
  }
  const search = new URL(request.url).searchParams;
  return proxy(RESOURCE_PATHS[resource], slug, { search });
}

export async function POST(request: Request, { params }: { params: Promise<{ slug: string; resource: string }> }) {
  const { slug, resource } = await params;
  if (!isResource(resource)) {
    return NextResponse.json({ code: "NOT_FOUND", message: "Unknown resource." }, { status: 404 });
  }
  const body = await request.json().catch(() => null);
  return proxy(RESOURCE_PATHS[resource], slug, { method: "POST", body });
}
