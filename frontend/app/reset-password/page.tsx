"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthLayout } from "../../components/marketing/AuthLayout";
import { Button } from "../../components/ui/Button";
import { Field, Input } from "../../components/ui/Field";

function ResetForm() {
  const router = useRouter();
  const token = useSearchParams().get("token") ?? "";
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password"));
    if (password !== String(form.get("confirm"))) {
      setError("Those passwords do not match.");
      return;
    }
    setBusy(true);
    setError("");
    const response = await fetch("/api/auth/password/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password })
    });
    setBusy(false);
    if (!response.ok) {
      const problem = await response.json().catch(() => ({}));
      setError(problem.message ?? "That reset link is not valid.");
      return;
    }
    setDone(true);
    setTimeout(() => router.push("/login"), 1600);
  }

  if (!token) {
    return (
      <p className="text-base">
        This link is missing its token.{" "}
        <Link href="/forgot-password" className="font-medium text-accent hover:underline">Request a new one</Link>.
      </p>
    );
  }

  if (done) {
    return (
      <p role="status" className="text-base">
        Your password has been changed and every other device has been signed out. Taking you to sign in…
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <Field label="New password" required hint="at least 12 characters">
        <Input name="password" type="password" required minLength={12} autoComplete="new-password" />
      </Field>
      <Field label="Confirm password" required>
        <Input name="confirm" type="password" required minLength={12} autoComplete="new-password" />
      </Field>
      {error ? <p className="rounded border border-danger/25 bg-danger/5 px-3 py-2 text-sm text-danger">{error}</p> : null}
      <Button type="submit" variant="primary" size="lg" className="w-full" disabled={busy}>
        {busy ? "Saving…" : "Set new password"}
      </Button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <AuthLayout
      title="Choose a new password"
      description="Use at least twelve characters. Avoid your name, your email and anything you use elsewhere."
      aside={
        <>
          <p className="text-[38px] font-semibold leading-[1.06] tracking-[-0.035em]">
            One link, one use, one hour.
          </p>
          <p className="mt-6 max-w-[46ch] text-lg leading-[1.6] text-blue-100/85">
            Reset links expire after an hour and cannot be reused. Setting a new password signs out
            every other device on the account.
          </p>
        </>
      }
    >
      <Suspense fallback={<p className="text-base text-muted">Loading…</p>}>
        <ResetForm />
      </Suspense>
    </AuthLayout>
  );
}
