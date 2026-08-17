import type { ReactNode } from "react";

export function PageHeader({ title, description, meta, actions, className = "" }: {
  title: ReactNode; description?: ReactNode; meta?: ReactNode; actions?: ReactNode; className?: string;
}) {
  return (
    <div data-tour="page-header" className={`mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between ${className}`}>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {meta}
        </div>
        {description ? <p className="mt-1 max-w-3xl text-sm text-muted">{description}</p> : null}
      </div>
      {actions ? <div data-tour="page-actions" className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function SectionTitle({ title, action, className = "" }: { title: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={`mb-2 flex items-center justify-between gap-2 ${className}`}>
      <h2 className="text-base font-semibold tracking-tight">{title}</h2>
      {action}
    </div>
  );
}
