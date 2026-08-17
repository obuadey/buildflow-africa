import type { ReactNode } from "react";

export function EmptyState({ title, description, action, icon: Icon }: {
  title: string;
  description: string;
  action?: ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      {Icon ? (
        <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-md border border-hairline bg-sunken">
          <Icon className="h-4 w-4 text-muted" />
        </div>
      ) : null}
      <p className="text-base font-semibold">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-muted">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function ErrorState({ title = "We couldn't load this view.", message, onRetry }: { title?: string; message?: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <p className="text-base font-semibold">{title}</p>
      {message ? <p className="mt-1 max-w-sm text-sm text-muted">{message}</p> : null}
      {onRetry ? (
        <button onClick={onRetry} className="mt-4 inline-flex h-9 items-center rounded border border-hairline bg-surface px-3 text-base font-medium hover:bg-sunken">
          Retry
        </button>
      ) : null}
    </div>
  );
}
