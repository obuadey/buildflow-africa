"use client";

import { useState } from "react";
import Link from "next/link";
import { AuthLayout } from "../../components/marketing/AuthLayout";
import { Button } from "../../components/ui/Button";
import { Field, Input } from "../../components/ui/Field";

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const email = new FormData(event.currentTarget).get("email");
    setBusy(true);
    await fetch("/api/auth/password/forgot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email })
    });
    setBusy(false);
    setSent(true);
  }

  return (
    <AuthLayout
      title="Reset your password"
      description="Enter the email on your account and we will send a link to set a new password."
      aside={
        <>
          <p className="text-[38px] font-semibold leading-[1.06] tracking-[-0.035em]">
            Your records stay where they are.
          </p>
          <p className="mt-6 max-w-[46ch] text-lg leading-[1.6] text-blue-100/85">
            Resetting a password signs out every other device on the account and leaves your
            estimates, quotations and invoices untouched.
          </p>
        </>
      }
    >
      {sent ? (
        <div role="status" className="space-y-4">
          <p className="text-base">
            If that email has an account, a reset link is on its way. The link is valid for one hour
            and can be used once.
          </p>
          <Link href="/login" className="inline-block text-base font-medium text-accent hover:underline">
            Back to sign in
          </Link>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-3">
          <Field label="Email" required>
            <Input name="email" type="email" required placeholder="you@company.com" autoComplete="email" />
          </Field>
          <Button type="submit" variant="primary" size="lg" className="w-full" disabled={busy}>
            {busy ? "Sending…" : "Send reset link"}
          </Button>
          <p className="text-center text-sm text-muted">
            Remembered it? <Link href="/login" className="font-medium text-accent hover:underline">Sign in</Link>
          </p>
        </form>
      )}
    </AuthLayout>
  );
}
