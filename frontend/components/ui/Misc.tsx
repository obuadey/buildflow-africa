import type { ReactNode } from "react";

export function Avatar({ name, initials, size = 28, tone = "brand" }: { name: string; initials?: string; size?: number; tone?: "brand" | "neutral" }) {
  const text = initials ?? name.split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");
  return (
    <span
      title={name}
      aria-hidden
      style={{ width: size, height: size, fontSize: size <= 24 ? 10 : 11 }}
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold ${
        tone === "brand" ? "bg-accent/12 text-accent" : "bg-sunken text-muted"
      }`}
    >
      {text}
    </span>
  );
}

export function Progress({ value, tone = "brand", className = "" }: { value: number; tone?: "brand" | "warning" | "danger" | "neutral"; className?: string }) {
  const colors = { brand: "bg-accent", warning: "bg-warning", danger: "bg-danger", neutral: "bg-strongline" };
  return (
    <span className={`block h-1.5 w-full overflow-hidden rounded-full bg-sunken ${className}`}>
      <span className={`block h-full rounded-full ${colors[tone]}`} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </span>
  );
}

export function Tooltip({ label, children, side = "right" }: { label: string; children: ReactNode; side?: "right" | "top" }) {
  return (
    <span className="group/tt relative inline-flex">
      {children}
      <span
        role="tooltip"
        className={`pointer-events-none absolute z-50 hidden whitespace-nowrap rounded border border-hairline bg-raised px-2 py-1 text-xs text-fg shadow-raised group-hover/tt:block ${
          side === "right" ? "left-full top-1/2 ml-2 -translate-y-1/2" : "bottom-full left-1/2 mb-2 -translate-x-1/2"
        }`}
      >
        {label}
      </span>
    </span>
  );
}

export function KeyHint({ children }: { children: ReactNode }) {
  return (
    <kbd className="num inline-flex h-5 min-w-[20px] items-center justify-center rounded border border-hairline bg-sunken px-1 text-2xs font-medium text-muted">
      {children}
    </kbd>
  );
}
