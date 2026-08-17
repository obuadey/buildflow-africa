"use client";

import Link from "next/link";
import { useMemo } from "react";
import { PageHeader } from "../../../components/app/PageHeader";
import { FilterBar } from "../../../components/app/FilterBar";
import { useListState, optionsFrom } from "../../../components/app/useListState";
import { useTenantContext } from "../../../components/app/TenantProvider";
import { Card } from "../../../components/ui/Card";
import { Badge } from "../../../components/ui/Badge";
import { Avatar } from "../../../components/ui/Misc";
import { Skeleton } from "../../../components/ui/Skeleton";
import { EmptyState, ErrorState } from "../../../components/ui/EmptyState";
import { useList } from "../../../lib/client";
import { formatDate, formatRelative, humanize } from "../../../lib/format";
import { tenantPath } from "../../../lib/tenant";
import type { Activity } from "../../../lib/types";

type AuditRow = {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  actor: string | null;
  previousValues: string | null;
  newValues: string | null;
  ipAddress: string | null;
  at: string;
};

type TimelineItem = {
  id: string;
  source: "activity" | "audit";
  actor: string;
  channel: string;
  text: string;
  entity?: string;
  href?: string;
  at: string;
};

const ACTIONS = ["PAYMENT_RECORDED", "VARIATION_APPROVED", "TENANT_SUSPENDED", "TENANT_PLAN_CHANGED", "AI_SCOPE_GENERATED"];
const ENTITY_TYPES = ["ESTIMATE", "QUOTE", "CONTRACT", "PAYMENT", "VARIATION", "INVOICE", "COST_ITEM", "PROJECT", "CLIENT", "TENANT"];

export default function ActivityPage() {
  const { tenant } = useTenantContext();
  const state = useListState({}, "createdAt");
  const source = state.filters.source;
  const includeActivity = !source || source === "activity";
  const includeAudit = !source || source === "audit";
  const commonParams = { q: state.params.q, page: 1, size: 100, sort: "createdAt", dir: state.dir };
  const activityParams = { ...commonParams, channel: state.filters.channel, entityType: state.filters.entityType };
  const auditParams = { ...commonParams, action: state.filters.action, entityType: state.filters.entityType };
  const activity = useList<Activity>("activity", activityParams);
  const audit = useList<AuditRow>("audit", auditParams);
  const loading = (includeActivity && activity.loading) || (includeAudit && audit.loading);

  const rows = useMemo(() => {
    const activityItems: TimelineItem[] = includeActivity ? activity.rows.map((item) => ({
      id: item.id,
      source: "activity",
      actor: item.actor,
      channel: item.channel,
      text: item.text,
      entity: item.entity,
      href: item.href,
      at: item.at
    })) : [];

    const auditItems: TimelineItem[] = includeAudit ? audit.rows.map((item) => ({
      id: item.id,
      source: "audit",
      actor: item.actor ?? "system",
      channel: "AUDIT",
      text: `${humanize(item.action)}${item.entityType ? ` on ${humanize(item.entityType)}` : ""}`,
      entity: item.entityType,
      at: item.at
    })) : [];

    return [...activityItems, ...auditItems].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  }, [activity.rows, audit.rows, includeActivity, includeAudit]);

  const grouped = rows.reduce<Record<string, TimelineItem[]>>((acc, item) => {
    const key = formatDate(item.at);
    (acc[key] ??= []).push(item);
    return acc;
  }, {});
  const selectedErrors = [includeActivity ? activity.error : null, includeAudit ? audit.error : null].filter(Boolean);
  const retryAll = () => {
    if (includeActivity) activity.refresh();
    if (includeAudit) audit.refresh();
  };

  return (
    <>
      <PageHeader
        title="Activity"
        description="All activities, audit events and system logs across the company."
      />

      <FilterBar
        query={state.query}
        onQuery={state.setQuery}
        placeholder="Search activity, audit events or logs..."
        values={state.filters}
        onChange={state.setFilter}
        filters={[
          { key: "source", label: "Source", options: [{ value: "activity", label: "Activity" }, { value: "audit", label: "Audit log" }] },
          { key: "channel", label: "Channel", options: optionsFrom(["PROJECTS", "FINANCE", "SALES", "TEAM"]) },
          { key: "action", label: "Audit action", options: optionsFrom(ACTIONS) },
          { key: "entityType", label: "Record", options: optionsFrom(ENTITY_TYPES) }
        ]}
      />

      <Card>
        {loading ? (
          <div className="space-y-3 p-4">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-4" />)}</div>
        ) : rows.length === 0 && selectedErrors.length > 0 ? (
          <ErrorState
            message="The selected activity sources could not be loaded."
            onRetry={retryAll}
          />
        ) : rows.length === 0 ? (
          <EmptyState title="No activity in this filter" description="Activity, audit events and logs are recorded automatically as your team works." />
        ) : (
          <>
            {selectedErrors.length > 0 ? (
              <div className="border-b border-hairline bg-warning-soft px-4 py-2 text-sm text-warning">
                Some activity sources could not be loaded. Showing the available records.
                <button onClick={retryAll} className="ml-2 font-medium underline underline-offset-2">Retry</button>
              </div>
            ) : null}
            {Object.entries(grouped).map(([day, items]) => (
              <section key={day}>
                <p className="label-micro border-b border-hairline bg-sunken/60 px-4 py-1.5">{day}</p>
                <ul className="divide-y divide-hairline">
                  {items.map((item) => (
                    <li key={`${item.source}-${item.id}`} className="flex items-center gap-3 px-4 py-2.5">
                      <Avatar name={item.actor} size={26} tone={item.source === "audit" ? "brand" : "neutral"} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm">
                          {item.href ? (
                            <Link href={tenantPath(tenant.slug, item.href)} className="hover:text-accent">{item.text}</Link>
                          ) : item.text}
                        </span>
                        <span className="text-xs text-subtle">
                          {item.actor}{item.entity ? ` · ${humanize(item.entity)}` : ""}
                        </span>
                      </span>
                      <Badge tone={item.source === "audit" ? "brand" : "neutral"}>{item.channel.toLowerCase()}</Badge>
                      <span className="w-20 shrink-0 text-right text-xs text-subtle">{formatRelative(item.at)}</span>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </>
        )}
      </Card>
    </>
  );
}
