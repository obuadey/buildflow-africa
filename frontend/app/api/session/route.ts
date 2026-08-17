import { NextResponse } from "next/server";
import { callBackend, readSession } from "../../../lib/server/backend";

/** The signed-in user and the companies they may open. Both come from the backend. */
export async function GET() {
  const session = await readSession();
  if (!session) {
    return NextResponse.json({ code: "UNAUTHENTICATED", message: "Sign in to continue." }, { status: 401 });
  }
  const result = await callBackend("/tenants", { token: session.token });
  if (!result.ok) {
    return NextResponse.json(result.error, { status: result.status });
  }
  const tenants = result.data as { id: string; slug: string; name: string; role: string }[];
  return NextResponse.json({
    user: {
      id: session.userId,
      name: session.name,
      email: session.email,
      initials: session.name.split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join(""),
      memberships: tenants.map((tenant) => ({ tenantSlug: tenant.slug, role: tenant.role }))
    },
    tenants
  });
}
