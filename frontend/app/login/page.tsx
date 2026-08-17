"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthLayout } from "../../components/marketing/AuthLayout";
import { Button } from "../../components/ui/Button";
import { Field, Input, Checkbox } from "../../components/ui/Field";
import { tenantPath } from "../../lib/tenant";

function LoginForm() {
  const router = useRouter();
  const next = useSearchParams().get("next");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.get("email"), password: form.get("password") })
      });
      if (!response.ok) {
        const problem = await response.json().catch(() => ({}));
        setError(problem.message ?? "That email and password did not match an account.");
        return;
      }
      const { tenantSlug } = (await response.json().catch(() => ({}))) as { tenantSlug?: string };
      if (next && next.startsWith("/") && !next.startsWith("//")) {
        router.push(next);
      } else {
        router.push(tenantSlug ? tenantPath(tenantSlug, "/dashboard") : "/onboarding");
      }
      router.refresh();
    } catch {
      setError("The API is not reachable. Start it with `docker compose up`.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <Field label="Email" required>
        <Input name="email" type="email" required placeholder="you@company.com" autoComplete="email" />
      </Field>
      <Field label="Password" required>
        <Input name="password" type="password" required placeholder="••••••••"  />
      </Field>
      <div className="flex items-center justify-between">
        <Checkbox label="Keep me signed in" defaultChecked />
        <Link href="/forgot-password" className="text-sm text-muted hover:text-fg">Forgot password?</Link>
      </div>
      {error ? <p className="rounded border border-danger/25 bg-danger/5 px-3 py-2 text-sm text-danger">{error}</p> : null}
      <Button type="submit" variant="primary" size="lg" className="w-full" disabled={busy}>
        {busy ? "Signing in…" : "Sign in"}
      </Button>
      <p className="text-center text-sm text-muted">
        New here? <Link href="/register" className="font-medium text-accent hover:underline">Create a company</Link>
      </p>
    </form>
  );
}

export default function LoginPage() {
  return (
    <AuthLayout
      title="Sign in"
      description="Pick up where your projects, finance, documents and AI workspace left off."
      aside={
        <>
          <p className="text-[38px] font-semibold leading-[1.06] tracking-[-0.035em]">Projects, finance and site work in one operating system.</p>
          <p className="mt-6 max-w-[46ch] text-lg leading-[1.6] text-blue-100/85">
            BuildFlow Africa keeps estimating, documents, schedules, invoices, field records and AI insight in one tenant-safe platform.
          </p>
          <ul className="mt-9 space-y-3 text-[15px] text-blue-100/85">
            {[
              "Tenant-aware projects, documents and permissions",
              "BOQ, quotations and contracts",
              "Invoices, payments, expenses and cash flow",
              "AI Chat powered by platform OpenAI configuration"
            ].map((line) => (
              <li key={line} className="flex gap-2"><span className="text-blue-300"></span>{line}</li>
            ))}
          </ul>
        </>
      }
    >
      <Suspense fallback={<p className="text-base text-muted">Loading…</p>}>
        <LoginForm />
      </Suspense>
    </AuthLayout>
  );
}
