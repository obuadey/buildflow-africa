"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import { Card, CardBody, CardHeader } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Field, Input } from "../../components/ui/Field";
import { postJson } from "../../lib/client";

/**
 * Where a newly seeded operator lands. Until the password chosen for them is replaced, every other
 * platform call is refused, so this page is the only thing the console will let them do.
 */
export default function PlatformPasswordPage() {
  const router = useRouter();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mismatch = confirm.length > 0 && next !== confirm;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (mismatch) return;
    setBusy(true);
    setError(null);
    try {
      await postJson("/api/auth/password/change", { currentPassword: current, newPassword: next });
      // Changing a password signs every other device out, including this one's older tokens.
      router.push("/login?next=/platform");
    } catch (e) {
      setError((e as { message?: string }).message ?? "The password could not be changed.");
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto mt-16 max-w-lg px-4">
      <Card>
        <CardHeader
          title={<span className="flex items-center gap-2"><ShieldAlert size={18} /> Set your own password</span>}
          subtitle="This account was created with a password someone else chose. Replace it before administering the platform."
        />
        <CardBody>
          <form onSubmit={submit} className="grid gap-3">
            <Field label="The password you were given">
              <Input type="password" autoComplete="current-password" required
                value={current} onChange={(event) => setCurrent(event.target.value)} />
            </Field>
            <Field label="New password" hint="At least 12 characters, and not your name or email.">
              <Input type="password" autoComplete="new-password" required minLength={12}
                value={next} onChange={(event) => setNext(event.target.value)} />
            </Field>
            <Field label="New password again" error={mismatch ? "These do not match." : undefined}>
              <Input type="password" autoComplete="new-password" required
                value={confirm} onChange={(event) => setConfirm(event.target.value)} />
            </Field>
            {error ? <p className="text-sm text-danger">{error}</p> : null}
            <Button type="submit" disabled={busy || mismatch || next.length < 12}>
              {busy ? "Saving…" : "Change password and sign in again"}
            </Button>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
