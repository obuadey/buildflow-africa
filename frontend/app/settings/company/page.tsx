import { redirect } from "next/navigation";
import { callBackend, readSession } from "../../../lib/server/backend";

/** Legacy tenant-less route. Company settings live at /{tenantSlug}/settings. */
export default async function LegacySettingsRedirect() {
  const session = await readSession();
  if (!session) redirect("/login");
  const result = await callBackend("/tenants", { token: session.token });
  const tenants = result.ok ? (result.data as { slug: string }[]) : [];
  redirect(tenants.length ? `/${tenants[0].slug}/settings` : "/onboarding");
}
