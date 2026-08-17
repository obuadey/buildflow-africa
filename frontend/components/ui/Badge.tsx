import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { humanize } from "../../lib/format";

type Tone = "neutral" | "success" | "warning" | "danger" | "info" | "brand";

const TONES: Record<Tone, string> = {
  neutral: "border-hairline bg-sunken text-muted",
  success: "border-success/25 bg-success/10 text-success",
  warning: "border-warning/30 bg-warning/10 text-warning",
  danger: "border-danger/25 bg-danger/10 text-danger",
  info: "border-info/25 bg-info/10 text-info",
  brand: "border-accent/25 bg-accent/10 text-accent"
};

const STATUS_TONE: Record<string, Tone> = {
  DRAFT: "neutral", ARCHIVED: "neutral", CANCELLED: "neutral", NEW: "neutral", PENDING: "neutral",
  SENT: "info", VIEWED: "info", CONTACTED: "info", SITE_VISIT: "info", ESTIMATING: "info",
  QUOTED: "info", INVOICED: "info", ACTIVE: "brand", APPROVED: "success", READY: "brand",
  ACCEPTED: "success", WON: "success", PAID: "success", COMPLETED: "success", ON_TRACK: "success",
  NEGOTIATING: "warning", PARTIALLY_PAID: "warning", ON_HOLD: "warning", AT_RISK: "warning",
  SUSPENDED: "warning", INVITED: "warning", EXPIRED: "warning",
  REJECTED: "danger", LOST: "danger", OVERDUE: "danger", DELAYED: "danger", DISABLED: "danger"
};

export function Badge({ tone = "neutral", children, className = "" }: { tone?: Tone; children: React.ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-2xs font-medium uppercase tracking-wider ${TONES[tone]} ${className}`}>
      {children}
    </span>
  );
}

export function StatusBadge({ status, className = "" }: { status: string; className?: string }) {
  return (
    <Badge tone={STATUS_TONE[status] ?? "neutral"} className={className}>
      {humanize(status)}
    </Badge>
  );
}

export function Delta({ value, suffix = "%", invert = false }: { value: number; suffix?: string; invert?: boolean }) {
  const positive = invert ? value < 0 : value > 0;
  const flat = Math.abs(value) < 0.05;
  const Icon = flat ? Minus : value > 0 ? ArrowUpRight : ArrowDownRight;
  const tone = flat ? "text-muted" : positive ? "text-success" : "text-danger";
  return (
    <span className={`num inline-flex items-center gap-0.5 text-xs font-medium ${tone}`}>
      <Icon className="h-3.5 w-3.5" aria-hidden />
      {`${Math.abs(value).toFixed(1)}${suffix}`}
    </span>
  );
}
