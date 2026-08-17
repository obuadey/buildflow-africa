"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowRight } from "lucide-react";

/* ------------------------------------------------------- palette lock */

/** The public site is always presented in the light palette, whatever the workspace theme is. */
export function useLightPalette() {
  useEffect(() => {
    const root = document.documentElement;
    const hadDark = root.classList.contains("dark");
    const previousColorScheme = root.style.colorScheme;
    root.classList.remove("dark");
    root.style.colorScheme = "light";
    return () => {
      root.classList.toggle("dark", hadDark);
      root.style.colorScheme = previousColorScheme;
    };
  }, []);
}

/* ------------------------------------------------------------------ layout */

export function Shell({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`mx-auto w-full max-w-[1240px] px-5 sm:px-8 ${className}`}>{children}</div>;
}

export function Band({ children, tone = "light", className = "", id }: {
  children: ReactNode; tone?: "light" | "paper" | "dark"; className?: string; id?: string;
}) {
  const tones = {
    light: "bg-white text-[#0B1220]",
    paper: "bg-[#F5F6F7] text-[#0B1220]",
    dark: "bg-[#0B1220] text-white"
  };
  return (
    <section id={id} className={`${tones[tone]} ${className}`}>
      {children}
    </section>
  );
}

export function Eyebrow({ children, tone = "dark" }: { children: ReactNode; tone?: "dark" | "light" }) {
  return (
    <p className={`text-[11px] font-medium uppercase tracking-[0.22em] ${tone === "dark" ? "text-[#5B6470]" : "text-white/55"}`}>
      {children}
    </p>
  );
}

/** Oversized statement heading. Accepts a trailing accent phrase rendered in a lighter weight. */
export function Statement({ children, className = "", as: Tag = "h2" }: {
  children: ReactNode; className?: string; as?: "h1" | "h2" | "h3";
}) {
  return (
    <Tag className={`text-balance font-semibold leading-[0.98] tracking-[-0.035em] ${className}`}>
      {children}
    </Tag>
  );
}

export function Lede({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <p className={`max-w-[62ch] text-lg leading-[1.65] sm:text-xl ${className}`}>{children}</p>;
}

export function Rule({ className = "" }: { className?: string }) {
  return <hr className={`border-0 border-t border-current/10 ${className}`} />;
}

/* ------------------------------------------------------------------- links */

export function EditorialLink({ href, children, tone = "dark", className = "" }: {
  href: string; children: ReactNode; tone?: "dark" | "light" | "accent"; className?: string;
}) {
  const tones = {
    dark: "text-[#0B1220] decoration-[#0B1220]/25 hover:decoration-[#0B1220]",
    light: "text-white decoration-white/35 hover:decoration-white",
    accent: "text-[#2563EB] decoration-[#2563EB]/35 hover:decoration-[#2563EB]"
  };
  return (
    <Link
      href={href}
      className={`group inline-flex items-baseline gap-2 text-base font-medium underline underline-offset-[6px] transition-colors ${tones[tone]} ${className}`}
    >
      {children}
      <ArrowRight className="h-4 w-4 translate-y-0.5 transition-transform group-hover:translate-x-1" aria-hidden />
    </Link>
  );
}

/* ---------------------------------------------------------------- counters */

function useInView<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const node = ref.current;
    if (!node || seen) return;
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((entry) => entry.isIntersecting && setSeen(true)),
      { threshold: 0.35 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [seen]);
  return { ref, seen };
}

/** Count-up figure. Respects prefers-reduced-motion by rendering the final value immediately. */
export function StatFigure({ value, prefix = "", suffix = "", decimals = 0, label, note }: {
  value: number; prefix?: string; suffix?: string; decimals?: number; label: string; note?: string;
}) {
  const { ref, seen } = useInView<HTMLDivElement>();
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!seen) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setDisplay(value); return; }
    const duration = 1100;
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      setDisplay(value * (1 - Math.pow(1 - t, 3)));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [seen, value]);

  return (
    <div ref={ref} className="border-t border-current/15 pt-5">
      <p className="num text-5xl font-semibold leading-none tracking-[-0.04em] sm:text-6xl">
        {prefix}
        {display.toLocaleString("en-GH", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}
        {suffix}
      </p>
      <p className="mt-3 text-[11px] font-medium uppercase leading-relaxed tracking-[0.18em] opacity-70">{label}</p>
      {note ? <p className="mt-1.5 text-sm opacity-60">{note}</p> : null}
    </div>
  );
}

/* ------------------------------------------------------------------ quotes */

export function QuoteBlock({ quote, name, role, tone = "dark" }: {
  quote: string; name: string; role: string; tone?: "dark" | "light";
}) {
  return (
    <figure className={`border-t pt-6 ${tone === "light" ? "border-white/15" : "border-[#0B1220]/12"}`}>
      <blockquote className="text-xl leading-[1.45] tracking-[-0.01em] sm:text-2xl">{quote}</blockquote>
      <figcaption className="mt-5">
        <p className="text-base font-semibold">{name}</p>
        <p className={`text-sm ${tone === "light" ? "text-white/60" : "text-[#5B6470]"}`}>{role}</p>
      </figcaption>
    </figure>
  );
}
