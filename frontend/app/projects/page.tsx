import { redirect } from "next/navigation";
import { callBackend, readSession } from "../../lib/server/backend";

/** Legacy tenant-less route. Every workspace page lives under /{tenantSlug}/projects. */
export default async function LegacyRedirect() {
  const session = await readSession();
  if (!session) redirect("/login");
  const result = await callBackend("/tenants", { token: session.token });
  const tenants = result.ok ? (result.data as { slug: string }[]) : [];
  redirect(tenants.length ? `/${tenants[0].slug}/projects` : "/onboarding");
}
