"use client";

import Link from "next/link";
import { AlertTriangle, Bell, CheckCheck, CircleAlert, Info, PartyPopper } from "lucide-react";
import { useState } from "react";
import { Menu } from "../ui/Menu";
import { IconButton } from "../ui/Button";
import { useList } from "../../lib/client";
import { formatRelative } from "../../lib/format";
import { tenantPath } from "../../lib/tenant";
import { useTenantContext } from "./TenantProvider";
import type { Notification } from "../../lib/types";

const ICONS = { success: PartyPopper, warning: AlertTriangle, danger: CircleAlert, info: Info };
const TONES = { success: "text-success", warning: "text-warning", danger: "text-danger", info: "text-info" };

export function NotificationCenter() {
  const { tenant } = useTenantContext();
  const { rows, refresh } = useList<Notification>("notifications", { size: 20 });
  const [busy, setBusy] = useState(false);
  const unread = rows.filter((n) => !n.read).length;

  async function markAll() {
    setBusy(true);
    await fetch(`/api/t/${tenant.slug}/notifications/read-all`, { method: "POST" });
    setBusy(false);
    refresh();
  }

  return (
    <Menu
      width="w-[360px]"
      trigger={({ toggle }) => (
        <span className="relative">
          <IconButton label={`Notifications${unread ? `, ${unread} unread` : ""}`} onClick={toggle}>
            <Bell className="h-4 w-4" />
          </IconButton>
          {unread ? (
            <span className="num absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-danger px-1 text-[10px] font-semibold text-white">
              {unread}
            </span>
          ) : null}
        </span>
      )}
    >
      {(close) => (
        <div>
          <div className="flex items-center justify-between px-2 py-1.5">
            <p className="text-sm font-semibold">Notifications</p>
            <button onClick={markAll} disabled={busy || !unread} className="flex items-center gap-1 text-xs text-muted hover:text-fg disabled:opacity-40">
              <CheckCheck className="h-3.5 w-3.5" /> Mark all read
            </button>
          </div>
          <div className="max-h-[380px] overflow-y-auto">
            {rows.length === 0 ? <p className="px-3 py-6 text-center text-sm text-muted">Nothing new.</p> : null}
            {rows.map((n) => {
              const Icon = ICONS[n.tone];
              return (
                <Link
                  key={n.id}
                  href={tenantPath(tenant.slug, n.href)}
                  onClick={async () => { close(); await fetch(`/api/t/${tenant.slug}/notifications/${n.id}/read`, { method: "POST" }); refresh(); }}
                  className={`flex gap-2.5 rounded-md px-2 py-2 transition-colors hover:bg-sunken ${n.read ? "" : "bg-accent/[0.05]"}`}
                >
                  <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${TONES[n.tone]}`} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium">{n.title}</span>
                      {!n.read ? <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" aria-label="Unread" /> : null}
                    </span>
                    <span className="mt-0.5 block truncate text-sm text-muted">{n.body}</span>
                    <span className="mt-0.5 block text-2xs uppercase tracking-wider text-subtle">{formatRelative(n.at)}</span>
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </Menu>
  );
}
