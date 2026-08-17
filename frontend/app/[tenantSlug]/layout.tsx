import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "../../components/app/AppShell";
import { LogoBadge } from "../../components/brand/Logo";
import { callBackend, readSession } from "../../lib/server/backend";
import type { Role } from "../../lib/types";

type TenantResponse = {
  id: string; slug: string; name: string; region: string; city: string;
  currency: string; plan: string; tin: string; initials: string; accentColor: string; role: string;
};

/**
 * Tenant layout. The slug in the URL identifies a company; the backend resolves it against the
 * caller's membership and answers 403 when there is none. Nothing is trusted from the address bar.
 */
export default async function TenantLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  const session = await readSession();
  if (!session) {
    redirect(`/login?next=/${tenantSlug}/dashboard`);
  }

  const resolved = await callBackend(`/tenants/${tenantSlug}`, { token: session.token });
  const available = await callBackend("/tenants", { token: session.token });
  const tenants = (available.ok ? (available.data as TenantResponse[]) : []) ?? [];

  // Middleware renews an expiring session before the page renders, so a 401 here means the session
  // is genuinely finished rather than merely stale.
  if (resolved.status === 401) {
    redirect(`/login?next=/${tenantSlug}/dashboard`);
  }
  if (!resolved.ok) {
    return <AccessBlocked slug={tenantSlug} status={resolved.status} tenants={tenants} />;
  }

  const tenant = resolved.data as TenantResponse;

  return (
    <AppShell
      value={{
        tenant: {
          id: tenant.id,
          slug: tenant.slug,
          name: tenant.name,
          region: tenant.region ?? "",
          city: tenant.city ?? "",
          currency: tenant.currency ?? "GHS",
          initials: tenant.initials || tenant.name.split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join(""),
          tin: tenant.tin ?? "",
          plan: tenant.plan ?? "Starter"
        },
        role: (tenant.role as Role) ?? "VIEWER",
        user: {
          id: session.userId,
          name: session.name,
          email: session.email,
          initials: session.name.split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join(""),
          memberships: tenants.map((entry) => ({ tenantSlug: entry.slug, role: entry.role as Role }))
        },
        tenants: tenants.map((entry) => ({
          id: entry.id, slug: entry.slug, name: entry.name, region: entry.region ?? "",
          city: entry.city ?? "", currency: entry.currency ?? "GHS",
          initials: entry.initials || entry.name.split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join(""),
          tin: entry.tin ?? "", plan: entry.plan ?? "Starter", role: entry.role
        }))
      }}
    >
      {children}
    </AppShell>
  );
}

function AccessBlocked({ slug, status, tenants }: {
  slug: string; status: number; tenants: TenantResponse[];
}) {
  const unavailable = status === 503;
  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4">
      <div className="w-full max-w-md rounded-xl border border-hairline bg-surface p-6">
        <LogoBadge height={48} />
        <p className="num mt-6 text-2xs uppercase tracking-wider text-subtle">Error {status}</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          {unavailable
            ? "The API is not reachable."
            : status === 404
            ? "That company does not exist."
            : "You do not have access to this company."}
        </h1>
        <p className="mt-2 text-sm text-muted">
          {unavailable
            ? "Start the stack with `docker compose up` and reload this page."
            : `Your account is not a member of “${slug}”. Membership is verified on the server for every request, so changing the address bar will not grant access.`}
        </p>
        {tenants.length ? (
          <div className="mt-5">
            <p className="label-micro mb-2">Companies you can open</p>
            <ul className="divide-y divide-hairline rounded-lg border border-hairline">
              {tenants.map((tenant) => (
                <li key={tenant.slug}>
                  <Link href={`/${tenant.slug}/dashboard`} className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm hover:bg-sunken">
                    {tenant.name}
                    <span className="text-2xs uppercase tracking-wider text-subtle">{tenant.role?.toLowerCase()}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  );
}
