"use client";

import { Check, Minus } from "lucide-react";
import { Card, CardHeader } from "../../../../components/ui/Card";
import { SkeletonText } from "../../../../components/ui/Skeleton";
import { useReference } from "../../../../lib/reference";
import { humanize } from "../../../../lib/format";

/**
 * The permission matrix is served by the API — the same source the service layer checks against,
 * so what the screen shows and what the server enforces cannot drift apart.
 */
export default function RolesSettingsPage() {
  const { roles, permissions, loading } = useReference();

  if (loading) {
    return <Card className="p-6"><SkeletonText lines={8} /></Card>;
  }

  return (
    <Card>
      <CardHeader
        title="Roles & permissions"
        subtitle="Navigation hides what a role cannot use; the API enforces the same rules independently."
      />
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-hairline">
              <th scope="col" className="sticky left-0 bg-surface px-4 py-2 text-left text-2xs font-medium uppercase tracking-wider text-muted">
                Capability
              </th>
              {roles.map((role) => (
                <th key={role} scope="col" className="px-3 py-2 text-center text-2xs font-medium uppercase tracking-wider text-muted">
                  {humanize(role)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {permissions.map((permission) => (
              <tr key={permission.area} className="border-b border-hairline last:border-0">
                <th scope="row" className="sticky left-0 bg-surface px-4 py-2.5 text-left text-sm font-normal">
                  {permission.area}
                </th>
                {roles.map((role) => (
                  <td key={role} className="px-3 py-2.5 text-center">
                    {permission.roles.includes(role) ? (
                      <span className="inline-flex items-center gap-1 text-success">
                        <Check className="h-4 w-4" /><span className="sr-only">Allowed</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-subtle">
                        <Minus className="h-4 w-4" /><span className="sr-only">Not allowed</span>
                      </span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!permissions.length ? (
        <p className="px-4 py-8 text-center text-sm text-muted">The permission matrix could not be loaded.</p>
      ) : null}
    </Card>
  );
}
