"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthLayout } from "../../components/marketing/AuthLayout";
import { Button } from "../../components/ui/Button";
import { Field, Input, Select } from "../../components/ui/Field";
import { GHANA_REGIONS } from "../../lib/regions";

export default function RegisterPage() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: form.get("fullName"),
          email: form.get("email"),
          password: form.get("password"),
          companyName: form.get("companyName"),
          region: form.get("region"),
          city: form.get("city")
        })
      });
      if (!response.ok) {
        const problem = await response.json().catch(() => ({}));
        setError(problem.message ?? "That company could not be created.");
        return;
      }
      const { tenantSlug } = (await response.json().catch(() => ({}))) as { tenantSlug?: string };
      router.push(tenantSlug ? `/${tenantSlug}/dashboard` : "/onboarding");
      router.refresh();
    } catch {
      setError("The API is not reachable. Start it with `docker compose up`.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthLayout
      title="Create your company"
      description="Set up your workspace in a minute. You can invite your team afterwards."
      aside={
        <>
          <p className="text-[38px] font-semibold leading-[1.06] tracking-[-0.035em]">Launch a modern construction command center</p>
          <dl className="mt-6 space-y-4 text-blue-100">
            {[
              ["One company workspace", "Projects, roles, documents, costs, field work and finance are tenant-scoped from day one."],
              ["AI with controls", "Every company uses the platform OpenAI configuration while retrieval remains tenant-safe."],
              ["Business clarity", "See project health, outstanding cash, quotation pipeline and margin before small issues become expensive."]
            ].map(([title, copy]) => (
              <div key={title}>
                <dt className="text-base font-medium text-white">{title}</dt>
                <dd className="mt-0.5 text-sm">{copy}</dd>
              </div>
            ))}
          </dl>
        </>
      }
    >
      <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
        <Field label="Full name" required className="sm:col-span-2"><Input name="fullName" required placeholder="Obed Buadey" /></Field>
        <Field label="Work email" required className="sm:col-span-2"><Input name="email" type="email" required placeholder="you@company.com" /></Field>
        <Field label="Company name" required className="sm:col-span-2"><Input name="companyName" required placeholder="Obuadey Construction" /></Field>
        <Field label="Region" required>
          <Select name="region" defaultValue="Greater Accra">
            {GHANA_REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
          </Select>
        </Field>
        <Field label="City" required><Input name="city" required placeholder="Accra" /></Field>
        <Field label="Password" required className="sm:col-span-2"><Input name="password" type="password" required placeholder="At least 12 characters" minLength={12} autoComplete="new-password" /></Field>
        {error ? <p className="sm:col-span-2 rounded border border-danger/25 bg-danger/5 px-3 py-2 text-sm text-danger">{error}</p> : null}
        <Button type="submit" variant="primary" size="lg" className="sm:col-span-2 w-full" disabled={busy}>
          {busy ? "Creating company…" : "Create company"}
        </Button>
        <p className="sm:col-span-2 text-center text-sm text-muted">
          Already have an account? <Link href="/login" className="font-medium text-accent hover:underline">Sign in</Link>
        </p>
      </form>
    </AuthLayout>
  );
}
