"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { UserPlus } from "lucide-react";
import { useTenantContext } from "../../../../components/app/TenantProvider";
import { CreateRecordDrawer } from "../../../../components/app/CreateRecordDrawer";
import { DataTable, type Column } from "../../../../components/ui/DataTable";
import { Button } from "../../../../components/ui/Button";
import { StatusBadge } from "../../../../components/ui/Badge";
import { Menu, MenuItem, MenuLabel } from "../../../../components/ui/Menu";
import { Avatar } from "../../../../components/ui/Misc";
import { patchRecord, useList } from "../../../../lib/client";
import { formatRelative, humanize } from "../../../../lib/format";
import type { Role, TeamMember } from "../../../../lib/types";

const ROLES: Role[] = ["OWNER", "ADMIN", "ESTIMATOR", "PROJECT_MANAGER", "ACCOUNTANT", "STAFF", "VIEWER"];

export default function TeamSettingsPage() {
  const { tenant } = useTenantContext();
  const search = useSearchParams();
  const [inviting, setInviting] = useState(search.get("invite") === "1");
  const { rows, total, loading, error, refresh } = useList<TeamMember>("team", { size: 50 });

  const columns: Column<TeamMember>[] = [
    {
      key: "name", header: "Name", hideable: false,
      render: (u) => (
        <span className="flex items-center gap-2">
          <Avatar name={u.name} size={26} />
          <span className="font-medium">{u.name}</span>
        </span>
      )
    },
    { key: "email", header: "Email", render: (u) => <span className="num text-muted">{u.email}</span> },
    { key: "role", header: "Role", render: (u) => humanize(u.role) },
    { key: "status", header: "Status", render: (u) => <StatusBadge status={u.status} /> },
    { key: "lastActive", header: "Last active", render: (u) => formatRelative(u.lastActive) },
    {
      key: "actions", header: "", align: "right", hideable: false,
      render: (u) => (
        <Menu
          trigger={({ toggle }) => <Button size="sm" onClick={toggle}>Manage</Button>}
        >
          {(close) => (
            <>
              <MenuLabel>Change role</MenuLabel>
              {ROLES.map((role) => (
                <MenuItem key={role} onClick={async () => { close(); await patchRecord(tenant.slug, "team", u.id, { role }); refresh(); }}>
                  {humanize(role)}
                </MenuItem>
              ))}
              <MenuItem
                danger
                onClick={async () => { close(); await patchRecord(tenant.slug, "team", u.id, { status: u.status === "DISABLED" ? "ACTIVE" : "DISABLED" }); refresh(); }}
              >
                {u.status === "DISABLED" ? "Reactivate" : "Deactivate"}
              </MenuItem>
            </>
          )}
        </Menu>
      )
    }
  ];

  return (
    <>
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Team</h2>
          <p className="text-sm text-muted">{total} people can access {tenant.name}. Permissions are enforced on the server.</p>
        </div>
        <Button variant="primary" onClick={() => setInviting(true)}><UserPlus className="h-4 w-4" /> Invite user</Button>
      </div>

      <DataTable
        rows={rows}
        columns={columns}
        getId={(u) => u.id}
        loading={loading}
        error={error}
        onRetry={refresh}
        total={total}
        exportName="team"
        empty={{ title: "No team members", description: "Invite estimators, project managers and accountants to collaborate." }}
      />

      <CreateRecordDrawer
        open={inviting}
        onClose={() => setInviting(false)}
        resource="team"
        title="Invite team member"
        subtitle="They will receive an email invitation to join this company."
        submitLabel="Send invitation"
        onCreated={refresh}
        fields={[
          { name: "name", label: "Full name", required: true },
          { name: "email", label: "Email", type: "email", required: true },
          { name: "role", label: "Role", type: "select", required: true, defaultValue: "ESTIMATOR", options: ROLES.map((r) => ({ value: r, label: humanize(r) })) },
          { name: "status", label: "Status", type: "select", defaultValue: "INVITED", options: [{ value: "INVITED", label: "Invited" }, { value: "ACTIVE", label: "Active" }] }
        ]}
      />
    </>
  );
}
