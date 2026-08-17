"use client";

import Link from "next/link";
import { forwardRef } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "ai";
type Size = "sm" | "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-accent text-accent-fg border-transparent hover:bg-brand-700 dark:hover:bg-brand-300 active:bg-brand-800",
  secondary: "bg-surface text-fg border-hairline hover:bg-sunken active:bg-sunken",
  ghost: "bg-transparent text-muted border-transparent hover:bg-sunken hover:text-fg",
  danger: "bg-danger text-white border-transparent hover:opacity-90",
  ai: "border-laterite-200 bg-laterite-50 text-laterite-700 hover:bg-laterite-100 dark:border-laterite-600/40 dark:bg-laterite-600/15 dark:text-laterite-200 dark:hover:bg-laterite-600/25"
};

const SIZES: Record<Size, string> = {
  sm: "h-7 px-2 text-xs gap-1.5",
  md: "h-9 px-3 text-base gap-2",
  lg: "h-11 px-5 text-base gap-2"
};

const base =
  "inline-flex select-none items-center justify-center whitespace-nowrap rounded border font-medium transition-colors disabled:pointer-events-none disabled:opacity-50";

export function buttonClass(variant: Variant = "secondary", size: Size = "md", className = "") {
  return `${base} ${VARIANTS[variant]} ${SIZES[size]} ${className}`;
}

export const Button = forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }>(
  function Button({ variant = "secondary", size = "md", className = "", ...props }, ref) {
    return <button ref={ref} className={buttonClass(variant, size, className)} {...props} />;
  }
);

export function ButtonLink({
  href, variant = "secondary", size = "md", className = "", children, ...props
}: React.ComponentProps<typeof Link> & { variant?: Variant; size?: Size }) {
  return (
    <Link href={href} className={buttonClass(variant, size, className)} {...props}>
      {children}
    </Link>
  );
}

export function IconButton({
  label, variant = "ghost", className = "", ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string; variant?: Variant }) {
  return (
    <button
      aria-label={label}
      title={label}
      className={`${base} ${VARIANTS[variant]} h-8 w-8 shrink-0 rounded ${className}`}
      {...props}
    />
  );
}
