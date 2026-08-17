"use client";

import { useState } from "react";
import { Megaphone, Plus } from "lucide-react";
import { PageHeader } from "../../../components/app/PageHeader";
import { Card, CardHeader } from "../../../components/ui/Card";
import { Badge } from "../../../components/ui/Badge";
import { Button } from "../../../components/ui/Button";
import { Modal } from "../../../components/ui/Overlay";
import { Field, Input, Select, Textarea } from "../../../components/ui/Field";
import { SkeletonText } from "../../../components/ui/Skeleton";
import { EmptyState, ErrorState } from "../../../components/ui/EmptyState";
import { platformPost, usePlatform } from "../../../lib/platform";
import { formatDate, humanize } from "../../../lib/format";

type Announcement = {
  id: string; title: string; body: string; severity: string; audience: string;
  published: boolean; createdBy: string | null; startsAt: string;
};

export default function PlatformAnnouncementsPage() {
  const { data, loading, error, refresh } = usePlatform<Announcement[]>("announcements");
  const [composing, setComposing] = useState(false);
  const [busy, setBusy] = useState(false);

  async function create(form: FormData) {
    setBusy(true);
    await platformPost("announcements", {
      title: form.get("title"),
      body: form.get("body"),
      severity: form.get("severity"),
      audience: form.get("audience"),
      published: form.get("published") === "on"
    }).catch(() => undefined);
    setBusy(false);
    setComposing(false);
    refresh();
  }

  async function togglePublished(announcement: Announcement) {
    await platformPost(`announcements/${announcement.id}`, { published: !announcement.published }, "PATCH")
      .catch(() => undefined);
    refresh();
  }

  return (
    <>
      <PageHeader
        title="Announcements"
        description="Messages shown to companies in the product — maintenance windows, releases and service notices."
        actions={<Button variant="primary" onClick={() => setComposing(true)}><Plus className="h-4 w-4" /> New announcement</Button>}
      />

      {loading ? <Card className="p-6"><SkeletonText lines={5} /></Card>
        : error ? <Card><ErrorState message={error} onRetry={refresh} /></Card>
        : !(data ?? []).length ? (
          <Card>
            <EmptyState
              icon={Megaphone}
              title="No announcements yet"
              description="Publish a notice when there is planned maintenance or a release worth telling customers about."
              action={<Button variant="primary" onClick={() => setComposing(true)}>Write one</Button>}
            />
          </Card>
        ) : (
          <div className="space-y-3">
            {(data ?? []).map((announcement) => (
              <Card key={announcement.id}>
                <CardHeader
                  title={announcement.title}
                  subtitle={`${humanize(announcement.audience)} · ${formatDate(announcement.startsAt)} · ${announcement.createdBy ?? "operator"}`}
                  action={
                    <span className="flex items-center gap-2">
                      <Badge tone={announcement.severity === "CRITICAL" ? "danger"
                        : announcement.severity === "WARNING" ? "warning" : "info"}>
                        {announcement.severity.toLowerCase()}
                      </Badge>
                      <Badge tone={announcement.published ? "success" : "neutral"}>
                        {announcement.published ? "published" : "draft"}
                      </Badge>
                      <Button size="sm" onClick={() => togglePublished(announcement)}>
                        {announcement.published ? "Unpublish" : "Publish"}
                      </Button>
                    </span>
                  }
                />
                <p className="px-4 py-3 text-base leading-relaxed text-muted">{announcement.body}</p>
              </Card>
            ))}
          </div>
        )}

      <Modal
        open={composing}
        onClose={() => setComposing(false)}
        title="New announcement"
        description="Keep it short and factual: what is happening, when, and what a customer should do."
      >
        <form onSubmit={(event) => { event.preventDefault(); create(new FormData(event.currentTarget)); }} className="space-y-3">
          <Field label="Title" required><Input name="title" required data-autofocus placeholder="Planned maintenance, Sunday 02:00–04:00 GMT" /></Field>
          <Field label="Message" required>
            <Textarea name="body" rows={4} required placeholder="Estimating and invoicing will be unavailable for up to two hours. No data will be lost." />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Severity">
              <Select name="severity" defaultValue="INFO">
                {["INFO", "WARNING", "CRITICAL"].map((value) => <option key={value} value={value}>{humanize(value)}</option>)}
              </Select>
            </Field>
            <Field label="Audience">
              <Select name="audience" defaultValue="ALL">
                {["ALL", "ADMINS", "OWNERS"].map((value) => <option key={value} value={value}>{humanize(value)}</option>)}
              </Select>
            </Field>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="published" className="h-4 w-4 accent-[rgb(var(--accent))]" /> Publish immediately
          </label>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" onClick={() => setComposing(false)}>Cancel</Button>
            <Button type="submit" variant="primary" disabled={busy}>{busy ? "Saving…" : "Save announcement"}</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
