"use client";

import { useState } from "react";
import { PageHeader } from "../../../components/app/PageHeader";
import { Card } from "../../../components/ui/Card";
import { Badge } from "../../../components/ui/Badge";
import { Button } from "../../../components/ui/Button";
import { Input, Select } from "../../../components/ui/Field";
import { SkeletonRows } from "../../../components/ui/Skeleton";
import { ErrorState } from "../../../components/ui/EmptyState";
import { Modal } from "../../../components/ui/Overlay";
import { platformPost, usePlatform } from "../../../lib/platform";
import { formatRelative, humanize } from "../../../lib/format";
import { useDebounced } from "../../../lib/client";

type PlatformUser = {
  id: string; name: string; email: string; enabled: boolean; lockedUntil: string | null;
  platformRole: string | null; lastLogin: string | null; companies: number;
};

export default function PlatformUsersPage() {
  const [query, setQuery] = useState("");
  const q = useDebounced(query, 220);
  const { data, loading, error, refresh } = usePlatform<PlatformUser[]>(`users?q=${encodeURIComponent(q)}`);
  const [disabling, setDisabling] = useState<PlatformUser | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  async function act(path: string, body?: unknown) {
    setBusy(true);
    try {
      await platformPost(path, body);
      setNotice("Done.");
      setDisabling(null);
      refresh();
    } catch (problem) {
      setNotice((problem as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Users"
        description="Every account on the platform. Locked accounts, revoked sessions and platform roles are managed here."
      />

      {notice ? <p role="status" className="mb-3 rounded-lg border border-accent/25 bg-accent/5 px-3 py-2 text-sm text-accent">{notice}</p> : null}

      <Card className="mb-3 flex flex-wrap items-center gap-2 p-2">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by name or email…"
          aria-label="Search users"
          className="min-w-[240px] flex-1"
        />
        <span className="num ml-auto text-sm text-muted">{data?.length ?? 0} shown</span>
      </Card>

      <Card className="overflow-hidden">
        {error ? <ErrorState message={error} onRetry={refresh} /> : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-hairline">
                  {["User", "Companies", "Status", "Platform role", "Last sign-in", "Actions"].map((h, i) => (
                    <th key={h} className={`px-3 py-2 text-2xs font-medium uppercase tracking-wider text-muted ${i === 1 ? "text-right" : "text-left"}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? <SkeletonRows rows={6} cols={6} /> : (data ?? []).map((user) => {
                  const locked = user.lockedUntil && new Date(user.lockedUntil) > new Date();
                  return (
                    <tr key={user.id} className="border-b border-hairline last:border-0">
                      <td className="px-3 py-2.5 text-sm">
                        <span className="block font-medium">{user.name}</span>
                        <span className="num block text-xs text-subtle">{user.email}</span>
                      </td>
                      <td className="num px-3 py-2.5 text-right text-sm">{user.companies}</td>
                      <td className="px-3 py-2.5">
                        {!user.enabled ? <Badge tone="danger">disabled</Badge>
                          : locked ? <Badge tone="warning">locked</Badge>
                          : <Badge tone="success">active</Badge>}
                      </td>
                      <td className="px-3 py-2.5">
                        <Select
                          defaultValue={user.platformRole ?? ""}
                          aria-label={`Platform role for ${user.email}`}
                          className="w-auto"
                          onChange={(event) => act(`users/${user.id}/platform-role`,
                            { platformRole: event.target.value || null })}
                        >
                          <option value="">None</option>
                          {["PLATFORM_SUPPORT", "PLATFORM_ADMIN", "PLATFORM_OWNER"].map((role) => (
                            <option key={role} value={role}>{humanize(role.replace("PLATFORM_", ""))}</option>
                          ))}
                        </Select>
                      </td>
                      <td className="px-3 py-2.5 text-sm">{user.lastLogin ? formatRelative(user.lastLogin) : "never"}</td>
                      <td className="px-3 py-2.5">
                        <span className="flex flex-wrap gap-1.5">
                          {locked ? <Button size="sm" onClick={() => act(`users/${user.id}/unlock`)} disabled={busy}>Unlock</Button> : null}
                          <Button size="sm" onClick={() => act(`users/${user.id}/revoke-sessions`)} disabled={busy}>Revoke sessions</Button>
                          {user.enabled
                            ? <Button size="sm" variant="danger" onClick={() => setDisabling(user)}>Disable</Button>
                            : <Button size="sm" variant="primary" onClick={() => act(`users/${user.id}/enable`)} disabled={busy}>Enable</Button>}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {!loading && !(data ?? []).length ? (
                  <tr><td colSpan={6} className="px-3 py-10 text-center text-sm text-muted">No users match that search.</td></tr>
                ) : null}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal
        open={Boolean(disabling)}
        onClose={() => setDisabling(null)}
        title={disabling ? `Disable ${disabling.email}` : "Disable account"}
        description="The account cannot sign in and every session is revoked immediately."
      >
        <form onSubmit={(event) => {
          event.preventDefault();
          act(`users/${disabling!.id}/disable`, { reason: String(new FormData(event.currentTarget).get("reason")) });
        }} className="space-y-3">
          <Input name="reason" required placeholder="Reason — recorded in the audit trail" data-autofocus />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setDisabling(null)}>Cancel</Button>
            <Button type="submit" variant="danger" disabled={busy}>Disable account</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
