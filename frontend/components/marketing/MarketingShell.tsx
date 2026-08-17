"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Menu as MenuIcon, X } from "lucide-react";
import { LogoBadge } from "../brand/Logo";
import { EditorialLink, Shell, useLightPalette } from "./editorial";
import { BRAND } from "../../lib/brand";

const LINKS = [
  { href: "/features", label: "Platform" },
  { href: "/pricing", label: "Pricing" },
  { href: "/blog", label: "Field notes" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Connect" }
];

const FOOTER = [
  {
    title: "Platform",
    links: [
      ["What it does", "/features"],
      ["Pricing", "/pricing"],
      ["Sign in", "/login"]
    ]
  },
  {
    title: "Company",
    links: [
      ["About", "/about"],
      ["Field notes", "/blog"],
      ["Connect", "/contact"]
    ]
  },
  {
    title: "Legal",
    links: [
      ["Privacy policy", "/privacy"],
      ["Terms of service", "/terms"]
    ]
  }
];

export function MarketingShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  useLightPalette();

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <div className="min-h-screen bg-white text-[#0B1220] [color-scheme:light]">
      <a href="#content" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-[#0B1220] focus:px-3 focus:py-2 focus:text-white">
        Skip to content
      </a>

      <header className="sticky top-0 z-40 border-b border-[#0B1220]/10 bg-white/90 backdrop-blur-md">
        <Shell>
          <div className="grid h-[76px] grid-cols-[auto_1fr_auto] items-center gap-4">
            <Link href="/" aria-label={`${BRAND.name} home`} className="justify-self-start">
              <LogoBadge height={46} priority />
            </Link>

            <nav aria-label="Main" className="hidden justify-self-center lg:block">
              <ul className="flex items-center gap-8">
                {LINKS.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-[15px] font-medium tracking-[-0.01em] text-[#0B1220]/70 transition-colors hover:text-[#0B1220]"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            <div className="hidden items-center gap-7 justify-self-end lg:flex">
              <Link href="/login" className="text-[15px] font-medium text-[#0B1220]/70 transition-colors hover:text-[#0B1220]">
                Sign in
              </Link>
              <EditorialLink href="/register">Get Started</EditorialLink>
            </div>

            <button
              onClick={() => setOpen(true)}
              aria-label="Open menu"
              className="col-start-3 flex h-10 w-10 items-center justify-center justify-self-end rounded-full border border-[#0B1220]/15 lg:hidden"
            >
              <MenuIcon className="h-4.5 w-4.5" style={{ width: 18, height: 18 }} />
            </button>
          </div>
        </Shell>
      </header>

      {open ? (
        <div className="fixed inset-0 z-50 bg-[#0B1220] text-white lg:hidden">
          <Shell>
            <div className="flex h-[76px] items-center justify-between">
              <LogoBadge height={44} />
              <button
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <nav aria-label="Mobile" className="mt-10">
              <ul className="space-y-2">
                {LINKS.map((link, i) => (
                  <li key={link.href} className="border-b border-white/10 pb-4">
                    <Link
                      href={link.href}
                      onClick={() => setOpen(false)}
                      className="flex items-baseline gap-4 text-4xl font-semibold tracking-[-0.03em]"
                    >
                      <span className="num text-xs font-normal tracking-widest text-white/35">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
              <div className="mt-10 flex flex-col gap-4">
                <Link href="/login" onClick={() => setOpen(false)} className="text-lg text-white/70">Sign in</Link>
                <EditorialLink href="/register" tone="light">Get Started</EditorialLink>
              </div>
            </nav>
          </Shell>
        </div>
      ) : null}

      <main id="content">{children}</main>

      <footer className="bg-[#0B1220] text-white">
        <Shell className="py-16">
          <div className="grid gap-12 lg:grid-cols-[1.4fr_2fr]">
            <div>
              <LogoBadge height={104} />
              <p className="mt-5 max-w-sm text-lg leading-[1.55] text-white/70">{BRAND.tagline}</p>
              <p className="mt-6 max-w-sm text-sm leading-relaxed text-white/45">
                Estimating, quotations, contracts and project financials for construction businesses in Ghana and
                across Africa.
              </p>
            </div>

            <div className="grid gap-8 sm:grid-cols-3">
              {FOOTER.map((group) => (
                <div key={group.title}>
                  <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-white/45">{group.title}</p>
                  <ul className="mt-4 space-y-2.5">
                    {group.links.map(([label, href]) => (
                      <li key={href}>
                        <Link href={href} className="text-[15px] text-white/75 transition-colors hover:text-white">
                          {label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-14 flex flex-col gap-3 border-t border-white/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-white/45">© {new Date().getFullYear()} {BRAND.name}. Accra, Ghana.</p>
            <p className="max-w-xl text-sm text-white/40">
              Rates shown in product demonstrations are sample data, not verified market prices.
            </p>
          </div>
        </Shell>
      </footer>
    </div>
  );
}
