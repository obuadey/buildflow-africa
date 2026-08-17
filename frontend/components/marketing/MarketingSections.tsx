import Link from "next/link";
import type { ReactNode } from "react";
import { ButtonLink } from "../ui/Button";

export function Section({ children, className = "", id }: { children: ReactNode; className?: string; id?: string }) {
  return <section id={id} className={`mx-auto max-w-6xl px-4 ${className}`}>{children}</section>;
}

export function SectionHeading({ eyebrow, title, copy, className = "" }: {
  eyebrow?: string; title: string; copy?: string; className?: string;
}) {
  return (
    <div className={`max-w-2xl ${className}`}>
      {eyebrow ? <p className="label-micro mb-2">{eyebrow}</p> : null}
      <h2 className="text-4xl font-semibold tracking-tight text-slate-950 dark:text-white">{title}</h2>
      {copy ? <p className="mt-3 text-lg leading-relaxed text-muted">{copy}</p> : null}
    </div>
  );
}

export function PageHero({ eyebrow, title, copy, image, imageAlt = "", primary, secondary, stats = [] }: {
  eyebrow: string;
  title: string;
  copy: string;
  image: string;
  imageAlt?: string;
  primary?: { href: string; label: string };
  secondary?: { href: string; label: string };
  stats?: { value: string; label: string }[];
}) {
  return (
    <section className="relative overflow-hidden border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950">
      <Section className="grid gap-10 py-16 lg:grid-cols-[1fr_.95fr] lg:items-center lg:py-20">
        <div>
          <p className="label-micro mb-3 text-blue-700 dark:text-blue-300">{eyebrow}</p>
          <h1 className="max-w-4xl text-5xl font-semibold tracking-tight text-slate-950 lg:text-6xl dark:text-white">{title}</h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-muted">{copy}</p>
          {(primary || secondary) ? (
            <div className="mt-8 flex flex-wrap gap-3">
              {primary ? <ButtonLink href={primary.href} variant="primary" size="lg">{primary.label}</ButtonLink> : null}
              {secondary ? <ButtonLink href={secondary.href} size="lg">{secondary.label}</ButtonLink> : null}
            </div>
          ) : null}
          {stats.length ? (
            <div className="mt-8 grid max-w-2xl gap-px overflow-hidden rounded-xl border border-slate-200 bg-slate-200 sm:grid-cols-3 dark:border-slate-800 dark:bg-slate-800">
              {stats.map((stat) => (
                <div key={stat.label} className="bg-white p-4 dark:bg-slate-900">
                  <p className="num text-2xl font-semibold text-slate-950 dark:text-white">{stat.value}</p>
                  <p className="mt-1 text-xs font-medium text-muted">{stat.label}</p>
                </div>
              ))}
            </div>
          ) : null}
        </div>
        <div className="relative">
          <div className="absolute -left-4 -top-4 h-20 w-20 rounded-2xl border border-blue-200 bg-blue-50/70 dark:border-blue-900 dark:bg-blue-950/30" aria-hidden />
          <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <img src={image} alt={imageAlt} className="h-[360px] w-full rounded-xl object-cover transition duration-700 hover:scale-[1.025]" />
          </div>
        </div>
      </Section>
    </section>
  );
}

export function FeatureGrid({ items }: { items: { icon: React.ComponentType<{ className?: string }>; title: string; copy: string }[] }) {
  return (
    <div className="grid gap-px overflow-hidden rounded-xl border border-slate-200 bg-slate-200 sm:grid-cols-2 lg:grid-cols-3 dark:border-slate-800 dark:bg-slate-800">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <div key={item.title} className="group bg-surface p-5 transition duration-300 hover:bg-slate-50 dark:hover:bg-slate-900">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-blue-100 bg-blue-50 text-accent transition duration-300 group-hover:-translate-y-0.5 dark:border-blue-900 dark:bg-blue-950/30">
              <Icon className="h-5 w-5" />
            </span>
            <p className="mt-3 text-base font-semibold">{item.title}</p>
            <p className="mt-1 text-sm leading-relaxed text-muted">{item.copy}</p>
          </div>
        );
      })}
    </div>
  );
}

export function CallToAction({ title, copy, primary = { href: "/register", label: "Get Started" }, secondary = { href: "/contact", label: "Talk to us" } }: {
  title: string;
  copy: string;
  primary?: { href: string; label: string };
  secondary?: { href: string; label: string };
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-950 px-6 py-12 text-center text-white shadow-sm">
      <div className="absolute inset-0 opacity-30" style={{ backgroundImage: "url(https://commons.wikimedia.org/wiki/Special:FilePath/A%20construction%20site%20near%20a%20body%20of%20water.jpg)", backgroundSize: "cover", backgroundPosition: "center" }} aria-hidden />
      <div className="absolute inset-0 bg-slate-950/78" aria-hidden />
      <div className="relative">
      <h2 className="text-4xl font-semibold tracking-tight">{title}</h2>
      <p className="mx-auto mt-3 max-w-xl text-lg text-blue-100">{copy}</p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
        <ButtonLink href={primary.href} variant="primary" size="lg">{primary.label}</ButtonLink>
        <ButtonLink href={secondary.href} size="lg" className="border-white/20 bg-white/10 text-white hover:bg-white/15">{secondary.label}</ButtonLink>
      </div>
      <p className="mt-4 text-sm text-blue-100/80">
        Prefer a walkthrough? <Link href="/contact" className="underline underline-offset-2">Book a demo</Link>.
      </p>
      </div>
    </div>
  );
}

export function PhotoBand({ src, alt, children, reverse = false }: {
  src: string;
  alt: string;
  children: ReactNode;
  reverse?: boolean;
}) {
  return (
    <div className={`grid overflow-hidden rounded-2xl border border-slate-200 bg-surface shadow-sm lg:grid-cols-2 dark:border-slate-800 ${reverse ? "lg:[&>*:first-child]:order-2" : ""}`}>
      <div className="relative min-h-[320px] overflow-hidden">
        <img src={src} alt={alt} className="h-full w-full object-cover transition duration-700 hover:scale-[1.03]" />
        <div className="absolute inset-0 bg-slate-950/10" aria-hidden />
      </div>
      <div className="flex items-center p-6 lg:p-10">{children}</div>
    </div>
  );
}
