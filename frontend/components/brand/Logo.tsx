import { BRAND } from "../../lib/brand";

const BADGE = "/brand/buildflow-badge.png";
const BADGE_W = 604;
const BADGE_H = 561;
const ICON = "/brand/buildflow-icon-512.png";

/**
 * The badge  the primary brand asset. Sized by height; the width follows the artwork's ratio.
 * Use at 40px or more so the wordmark inside stays legible.
 */
export function LogoBadge({ height = 48, className = "", priority }: {
  height?: number; className?: string; priority?: boolean;
}) {
  const width = Math.round((height * BADGE_W) / BADGE_H);
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={BADGE}
      alt={BRAND.name}
      width={width}
      height={height}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      className={className}
      style={{ height, width }}
    />
  );
}

/** Square crop of the badge, for tight or square contexts: collapsed sidebar, tiles, avatars. */
export function LogoMark({ size = 28, className = "" }: { size?: number; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={ICON}
      alt=""
      aria-hidden="true"
      width={size}
      height={size}
      decoding="async"
      className={className}
      style={{ height: size, width: size }}
    />
  );
}

/**
 * Compact lockup for the workspace, where the badge would be too small to read: square mark plus
 * the wordmark set in the interface font.
 */
export function Logo({ size = 28, className = "", showWordmark = true }: {
  size?: number; className?: string; showWordmark?: boolean;
}) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <LogoMark size={size} />
      {showWordmark ? (
        <span className="text-[16px] font-semibold leading-none tracking-[-0.02em]">
          {BRAND.markWord}
          <span className="ml-1.5 font-normal tracking-normal text-muted">{BRAND.tailWord}</span>
        </span>
      ) : null}
    </span>
  );
}

/** Stacked badge and tagline, for auth screens, documents and empty states. */
export function LogoLockup({ className = "", height = 96 }: { className?: string; height?: number }) {
  return (
    <span className={`inline-flex flex-col items-center gap-3 text-center ${className}`}>
      <LogoBadge height={height} />
      <span className="text-xs uppercase tracking-[0.18em] opacity-60">{BRAND.tagline}</span>
    </span>
  );
}
