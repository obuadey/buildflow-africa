const MONEY_CACHE = new Map<string, Intl.NumberFormat>();

function moneyFormatter(currency: string, decimals: number) {
  const key = `${currency}:${decimals}`;
  let f = MONEY_CACHE.get(key);
  if (!f) {
    f = new Intl.NumberFormat("en-GH", {
      style: "currency",
      currency,
      currencyDisplay: "code",
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
    MONEY_CACHE.set(key, f);
  }
  return f;
}

/** Canonical money renderer. Never concatenate currency strings by hand. */
export function formatMoney(value: number | null | undefined, currency = "GHS", decimals = 2) {
  const n = Number(value ?? 0);
  return moneyFormatter(currency, decimals).format(n).replace(/ /g, " ");
}

/** Compact money for KPI tiles and chart axes: GHS 1.8M */
export function formatMoneyCompact(value: number | null | undefined, currency = "GHS") {
  const n = Number(value ?? 0);
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1_000_000_000) return `${sign}${currency} ${(abs / 1_000_000_000).toFixed(1)}B`;
  if (abs >= 1_000_000) return `${sign}${currency} ${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 10_000) return `${sign}${currency} ${Math.round(abs / 1000)}k`;
  return `${sign}${currency} ${abs.toLocaleString("en-GH", { maximumFractionDigits: 0 })}`;
}

export function formatNumber(value: number | null | undefined, decimals = 2) {
  return Number(value ?? 0).toLocaleString("en-GH", { minimumFractionDigits: 0, maximumFractionDigits: decimals });
}

export function formatPercent(value: number | null | undefined, decimals = 1) {
  return `${Number(value ?? 0).toFixed(decimals)}%`;
}

export function formatSignedPercent(value: number | null | undefined, decimals = 1) {
  const n = Number(value ?? 0);
  return `${n > 0 ? "+" : ""}${n.toFixed(decimals)}%`;
}

export function formatDate(value: string | Date | null | undefined) {
  if (!value) return "";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function formatDateInput(value: string | Date | null | undefined) {
  if (!value) return "";
  const d = typeof value === "string" ? new Date(value) : value;
  return Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
}

export function formatRelative(value: string | Date | null | undefined) {
  if (!value) return "";
  const d = typeof value === "string" ? new Date(value) : value;
  const diff = Date.now() - d.getTime();
  const mins = Math.round(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days} d ago`;
  return formatDate(d);
}

export function daysBetween(value: string | Date) {
  const d = typeof value === "string" ? new Date(value) : value;
  return Math.round((Date.now() - d.getTime()) / 86_400_000);
}

export function dueLabel(value: string) {
  const days = -daysBetween(value);
  if (days < 0) return `${Math.abs(days)} d overdue`;
  if (days === 0) return "Due today";
  if (days <= 7) return `Due in ${days} d`;
  return formatDate(value);
}

/** ENUM_VALUE -> Enum value */
export function humanize(value: string | null | undefined) {
  if (!value) return "";
  const s = value.replace(/_/g, " ").toLowerCase();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function initialsOf(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}
