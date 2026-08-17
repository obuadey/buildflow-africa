import type { Metadata } from "next";
import { MarketingShell } from "../../components/marketing/MarketingShell";
import { MediaFrame } from "../../components/marketing/MediaFrame";
import { Band, EditorialLink, Eyebrow, Lede, QuoteBlock, Shell, StatFigure, Statement } from "../../components/marketing/editorial";

export const metadata: Metadata = { title: "About", description: "Why this exists, and the principles it is built on." };

const PRINCIPLES: [string, string][] = [
  ["Money is never guessed", "Quantities, totals, tax, markup and margin are produced by deterministic business logic that can be unit-tested  never by a language model."],
  ["Local before generic", "Ghana regions, cedis, Mobile Money, sandcrete blocks and trip-based haulage are first-class, not a localisation afterthought."],
  ["History is permanent", "Issued quotations, contracts, variations and invoices are versioned and preserved. Nothing an office has relied on is silently rewritten."],
  ["Your data is yours", "Companies are isolated at every layer, and your prices are never pooled into another contractor's average."]
];

export default function AboutPage() {
  return (
    <MarketingShell>
      <Band className="pt-16 sm:pt-24">
        <Shell>
          <Eyebrow>About</Eyebrow>
          <Statement as="h1" className="mt-6 max-w-5xl text-[44px] sm:text-[64px] lg:text-[82px]">
            Built from the practice, not from a template.
          </Statement>
          <div className="mt-8 grid gap-8 lg:grid-cols-[1.1fr_1fr] lg:items-end">
            <Lede className="text-[#3A4351]">
              Most contractors in Ghana price work in a notebook, or in a spreadsheet only one person understands. When
              the cement price moves, the margin quietly goes with it. This exists to make that margin visible before
              the quotation is sent.
            </Lede>
            <div className="flex flex-wrap items-center gap-8 lg:justify-end">
              <EditorialLink href="/blog">Field notes</EditorialLink>
              <EditorialLink href="/contact">Connect</EditorialLink>
            </div>
          </div>
        </Shell>
        <div className="mt-14"><Shell><MediaFrame slot="aboutHero" priority /></Shell></div>
      </Band>

      <Band tone="paper" className="py-20 sm:py-28">
        <Shell>
          <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr]">
            <div>
              <Eyebrow>Position</Eyebrow>
              <Statement className="mt-5 text-[32px] sm:text-[46px]">
                A contractor should never discover a loss at the end of a job.
              </Statement>
            </div>
            <div className="lg:pt-14">
              <Lede className="text-[#3A4351]">
                We build financial correctness first, then speed, then everything else. That order is unusual for
                software and completely ordinary for a quantity surveyor  which is the point.
              </Lede>
              <p className="mt-6 max-w-[62ch] text-lg leading-[1.65] text-[#3A4351]">
                Ghana first, because that is the practice we know: the units work is bought in, the way haulage is
                priced, how Mobile Money arrives in parts. Nigeria, Kenya, Rwanda and Uganda follow the same method,
                not a copy of the same defaults.
              </p>
            </div>
          </div>
        </Shell>
      </Band>

      <Band className="py-20 sm:py-28">
        <Shell>
          <Eyebrow>Principles</Eyebrow>
          <Statement className="mt-5 max-w-3xl text-[32px] sm:text-[46px]">What we hold to.</Statement>
          <ol className="mt-14 grid gap-x-12 gap-y-10 sm:grid-cols-2">
            {PRINCIPLES.map(([title, copy], i) => (
              <li key={title} className="border-t border-[#0B1220]/12 pt-5">
                <p className="num text-sm text-[#5B6470]">{String(i + 1).padStart(2, "0")}</p>
                <p className="mt-3 text-2xl font-semibold tracking-[-0.025em]">{title}</p>
                <p className="mt-2.5 max-w-[52ch] text-[15px] leading-relaxed text-[#3A4351]">{copy}</p>
              </li>
            ))}
          </ol>
        </Shell>
      </Band>

      <Band className="pb-20 sm:pb-28">
        <Shell><MediaFrame slot="aboutTeam" /></Shell>
      </Band>

      <Band tone="dark" className="py-20 sm:py-28">
        <Shell>
          <div className="grid gap-10 lg:grid-cols-[1fr_1.1fr]">
            <div>
              <Eyebrow tone="light">Where it came from</Eyebrow>
              <Statement className="mt-5 text-[32px] sm:text-[46px]">Interviews before code.</Statement>
            </div>
            <div className="lg:pt-14">
              <p className="max-w-[58ch] text-lg leading-[1.65] text-white/70">
                The estimate builder, the price-book freshness flags and the variation format all came out of sitting
                with contractors and quantity surveyors and watching where the work slowed down.
              </p>
            </div>
          </div>
          <div className="mt-16 grid gap-10 sm:grid-cols-3">
            <StatFigure value={40} suffix="+" label="Practitioner interviews" note="Accra, Tema, Kumasi and Takoradi." />
            <StatFigure value={16} label="Regions modelled" note="Pricing by region, city and supplier." />
            <StatFigure value={0} label="Prices set by AI" note="The rule the product is built around." />
          </div>
          <div className="mt-16 grid gap-10 border-t border-white/15 pt-10 lg:grid-cols-2">
            <QuoteBlock
              tone="light"
              quote="I do not need software that guesses what a building costs. I need software that stops me forgetting the crane."
              name="Contractor"
              role="Tema · residential and light industrial"
            />
            <QuoteBlock
              tone="light"
              quote="The fastest estimators are the ones who never derive the same factor twice."
              name="Quantity surveyor"
              role="Kumasi · 14 years in practice"
            />
          </div>
        </Shell>
      </Band>

      <Band className="py-24 sm:py-28">
        <Shell>
          <Statement className="max-w-4xl text-[40px] sm:text-[56px]">Build with us.</Statement>
          <p className="mt-7 max-w-[58ch] text-lg leading-[1.65] text-[#3A4351]">
            We work closely with the contractors who use this. Tell us what your office needs next.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-10">
            <EditorialLink href="/contact">Connect</EditorialLink>
            <EditorialLink href="/register">Get Started</EditorialLink>
          </div>
        </Shell>
      </Band>
    </MarketingShell>
  );
}
