import Link from "next/link";
import { redirect } from "next/navigation";
import { callBackend, readSession } from "../../lib/server/backend";
import { PlatformShell } from "../../components/platform/PlatformShell";

/**
 * Operator console. A platform role is checked on the server before anything renders, and again on
 * every API call — a company OWNER has no access here.
 */
export default async function PlatformLayout({ children }: { children: React.ReactNode }) {
  const session = await readSession();
  if (!session) {
    redirect("/login?next=/platform");
  }

  const result = await callBackend("/platform/me", { token: session.token });
  if (!result.ok) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas px-4">
        <div className="w-full max-w-md rounded-xl border border-hairline bg-surface p-6">
          <p className="num text-2xs uppercase tracking-wider text-subtle">Error {result.status}</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            {result.status === 503 ? "The API is not reachable." : "This console is for platform operators."}
          </h1>
          <p className="mt-2 text-sm text-muted">
            {result.status === 503
              ? "Start the stack with `docker compose up` and reload."
              : "Your account does not hold a platform role. Company administration is available inside your own workspace."}
          </p>
          <Link href="/" className="mt-5 inline-block text-base font-medium text-accent hover:underline">
            Back to the application
          </Link>
        </div>
      </div>
    );
  }

  const operator = result.data as {
    id: string; email: string; name: string; platformRole: string; mustChangePassword?: boolean;
  };

  // Until the password chosen for this operator is replaced, the backend refuses every
  // administrative call. Sending them somewhere they can act beats a console full of 403s. The
  // page sits outside this layout so the redirect cannot loop through it.
  if (operator.mustChangePassword) {
    redirect("/platform-password");
  }

  return <PlatformShell operator={operator}>{children}</PlatformShell>;
}
