import Link from "next/link";
import { MarketingShell } from "../components/marketing/MarketingShell";
import { MediaFrame } from "../components/marketing/MediaFrame";
import {
  Band, EditorialLink, Eyebrow, Lede, QuoteBlock, Shell, StatFigure, Statement
} from "../components/marketing/editorial";
import { POSTS } from "../lib/blog";
import { formatDate } from "../lib/format";

export default function HomePage() {
  return (
    <MarketingShell>
      {/* Statement hero */}
      <Band className="pt-16 sm:pt-24">
        <Shell>
          <Eyebrow>Ghana Construction estimating</Eyebrow>
          <Statement as="h1" className="mt-6 text-[52px] sm:text-[76px] lg:text-[104px]">
            Know your numbers.
          </Statement>
          <div className="mt-8 grid gap-8 lg:grid-cols-[1.1fr_1fr] lg:items-end">
            <Lede className="text-[#3A4351]">
              Contractors lose money in the quiet places.  From a markup mistaken for a margin, waste left out of a
              quantity to a rate quoted from memory. We built the system that closes them, from the first site visit to
              the last retention payment.
            </Lede>
            <div className="flex flex-wrap items-center gap-8 lg:justify-end">
              <EditorialLink href="/features">What it does</EditorialLink>
              <EditorialLink href="/pricing">Pricing</EditorialLink>
            </div>
          </div>
        </Shell>

        <div className="mt-14">
          <Shell>
            <MediaFrame slot="homeHero" priority />
          </Shell>
        </div>
      </Band>

      {/* What we do */}
      <Band tone="paper" className="mt-20 py-20 sm:mt-28 sm:py-28" id="what-we-do">
        <Shell>
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <Eyebrow>What we do</Eyebrow>
              <Statement className="mt-5 text-[34px] sm:text-[46px]">
                One record of the job  priced, agreed, changed, delivered and paid.
              </Statement>
            </div>
            <div className="lg:pt-16">
              <Lede className="text-[#3A4351]">
                {BRAND_LEDE}
              </Lede>
              <p className="mt-6 max-w-[62ch] text-lg leading-[1.65] text-[#3A4351]">
                Every stage carries its figures forward. Nothing is retyped between a spreadsheet and a letterhead, and
                nothing that has been issued to a client is quietly overwritten.
              </p>
              <div className="mt-8">
                <EditorialLink href="/features">The full platform</EditorialLink>
              </div>
            </div>
          </div>

          <div className="mt-16">
            <MediaFrame slot="homeWhoWeAre" />
          </div>
        </Shell>
      </Band>

      {/* Three differences, alternating */}
      <Band className="py-20 sm:py-28">
        <Shell>
          <Eyebrow>The difference</Eyebrow>
          <Statement className="mt-5 max-w-4xl text-[34px] sm:text-[46px]">
            Method, money and discipline  the three things a contractor cannot afford to guess.
          </Statement>
        </Shell>

        <Shell className="mt-16 space-y-24">
          <article className="grid gap-10 lg:grid-cols-2 lg:items-center">
            <MediaFrame slot="homeMethod" />
            <div className="lg:pl-6">
              <p className="num text-sm text-[#5B6470]">01</p>
              <Statement as="h3" className="mt-3 text-[28px] sm:text-[36px]">Method</Statement>
              <p className="mt-5 max-w-[54ch] text-lg leading-[1.65] text-[#3A4351]">
                Estimates are built the way a quantity surveyor works: measure once, apply a composite rate, let waste
                sit inside the quantity. One square metre of six-inch blockwork carries its blocks, mortar, sand and
                mason hours every time it is used, priced from your saved rate library.
              </p>
              <div className="mt-7"><EditorialLink href="/blog/pricing-a-boundary-wall">A wall, priced in twenty minutes</EditorialLink></div>
            </div>
          </article>

          <article className="grid gap-10 lg:grid-cols-2 lg:items-center">
            <div className="lg:order-2">
              <MediaFrame slot="homeMoney" />
            </div>
            <div className="lg:order-1 lg:pr-6">
              <p className="num text-sm text-[#5B6470]">02</p>
              <Statement as="h3" className="mt-3 text-[28px] sm:text-[36px]">Money</Statement>
              <p className="mt-5 max-w-[54ch] text-lg leading-[1.65] text-[#3A4351]">
                Overhead is recovered before profit, not out of it. Markup and margin are shown as the different
                figures they are. Milestone invoices follow the spending curve, and part-payments by Mobile Money land
                against the invoice they belong to.
              </p>
              <div className="mt-7"><EditorialLink href="/blog/markup-is-not-margin">Markup is not margin</EditorialLink></div>
            </div>
          </article>

          <article className="grid gap-10 lg:grid-cols-2 lg:items-center">
            <MediaFrame slot="homeFootprint" ratio="wide" />
            <div className="lg:pl-6">
              <p className="num text-sm text-[#5B6470]">03</p>
              <Statement as="h3" className="mt-3 text-[28px] sm:text-[36px]">Discipline</Statement>
              <p className="mt-5 max-w-[54ch] text-lg leading-[1.65] text-[#3A4351]">
                Rates carry the date they were confirmed and the source they came from. Issued quotations keep every
                version. Variations adjust the contract value without rewriting the original. When a job is questioned
                months later, the answer is a filing exercise rather than an argument.
              </p>
              <div className="mt-7"><EditorialLink href="/blog/price-book-discipline">Keeping a price book current</EditorialLink></div>
            </div>
          </article>
        </Shell>
      </Band>

      {/* Numbers */}
      <Band tone="dark" className="py-20 sm:py-28">
        <Shell>
          <div className="grid gap-10 lg:grid-cols-[1fr_1.1fr]">
            <div>
              <Eyebrow tone="light">By the numbers</Eyebrow>
              <Statement className="mt-5 text-[34px] sm:text-[46px]">
                Built for the way work is bought here.
              </Statement>
            </div>
            <div className="lg:pt-16">
              <p className="max-w-[58ch] text-lg leading-[1.65] text-white/70">
                Not a global template with a currency switch. Regions, units, trades, taxes and payment habits are
                modelled on Ghanaian practice, and the arithmetic that decides your margin is written in code that can
                be tested  never generated.
              </p>
            </div>
          </div>

          <div className="mt-16 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            <StatFigure value={16} label="Ghana regions" note="Prices held nationally, regionally and by city." />
            <StatFigure value={32} label="Construction categories" note="Preliminaries and earthworks through MEP to external works." />
            <StatFigure value={7} label="Roles, enforced server-side" note="Owner through viewer, checked on every request." />
            <StatFigure value={0} label="Prices generated by AI" note="The model suggests scope. The platform calculates money." />
          </div>
        </Shell>
      </Band>

      {/* Footprint */}
      <Band className="py-20 sm:py-28">
        <Shell>
          <div className="grid gap-10 lg:grid-cols-[1.05fr_1fr] lg:items-end">
            <Statement className="text-[34px] sm:text-[46px]">
              From an enquiry on WhatsApp to a final account that reconciles.
            </Statement>
            <Lede className="text-[#3A4351]">
              Leads, clients, projects, estimates, quotations, contracts, variations, invoices, payments and site
              expenses  one system, one set of figures, one history.
            </Lede>
          </div>

          <ol className="mt-16 grid gap-px overflow-hidden border border-[#0B1220]/10 bg-[#0B1220]/10 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Lead", "The enquiry, the site visit, the next action  logged before it is forgotten."],
              ["Estimate", "Measured, priced from your rate book, with margin visible while you type."],
              ["Quotation", "Issued as a document the client accepts, declines or questions from a phone."],
              ["Final account", "Milestones invoiced, variations agreed, retention tracked to release."]
            ].map(([title, copy], i) => (
              <li key={title} className="bg-white p-7">
                <p className="num text-sm text-[#5B6470]">{String(i + 1).padStart(2, "0")}</p>
                <p className="mt-3 text-xl font-semibold tracking-[-0.02em]">{title}</p>
                <p className="mt-2 text-[15px] leading-relaxed text-[#3A4351]">{copy}</p>
              </li>
            ))}
          </ol>
        </Shell>
      </Band>

      {/* Voices */}
      <Band tone="paper" className="py-20 sm:py-28">
        <Shell>
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <Eyebrow>What we hear on site</Eyebrow>
              <Statement className="mt-5 text-[34px] sm:text-[46px]">
                The product came out of these conversations.
              </Statement>
              <p className="mt-6 max-w-[46ch] text-[15px] leading-relaxed text-[#5B6470]">
                Recorded during product interviews with contractors and quantity surveyors in Accra, Tema and Kumasi.
                Quoted with permission; these are observations from practice, not endorsements.
              </p>
            </div>
            <div className="grid gap-10">
              <QuoteBlock
                quote="I do not need software that guesses what a building costs. I need software that stops me forgetting the crane."
                name="Contractor"
                role="Tema · residential and light industrial"
              />
              <QuoteBlock
                quote="The fastest estimators are not the ones who type quickly. They are the ones who never derive the same factor twice."
                name="Quantity surveyor"
                role="Kumasi · 14 years in practice"
              />
              <QuoteBlock
                quote="The client is not resisting the price. They are resisting the surprise."
                name="Project manager"
                role="Accra · fit-out and renovation"
              />
            </div>
          </div>
        </Shell>
      </Band>

      {/* Field notes */}
      <Band className="py-20 sm:py-28">
        <Shell>
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <Eyebrow>Field notes</Eyebrow>
              <Statement className="mt-5 text-[34px] sm:text-[46px]">Method, not marketing.</Statement>
            </div>
            <EditorialLink href="/blog">All articles</EditorialLink>
          </div>

          <div className="mt-14 grid gap-px border-t border-[#0B1220]/10 md:grid-cols-3">
            {POSTS.slice(0, 3).map((post) => (
              <Link
                key={post.slug}
                href={`/blog/${post.slug}`}
                className="group border-b border-[#0B1220]/10 py-7 pr-8 md:border-b-0 md:border-r md:last:border-r-0 md:pl-8 md:first:pl-0"
              >
                <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#5B6470]">
                  {post.category} · {post.readMinutes} min
                </p>
                <p className="mt-4 text-2xl font-semibold leading-[1.15] tracking-[-0.025em] group-hover:text-[#2563EB]">
                  {post.title}
                </p>
                <p className="mt-3 text-[15px] leading-relaxed text-[#3A4351]">{post.deck}</p>
                <p className="mt-4 text-sm text-[#5B6470]">{formatDate(post.date)}</p>
              </Link>
            ))}
          </div>
        </Shell>
      </Band>

      {/* Close */}
      <Band tone="dark" className="py-24 sm:py-32">
        <Shell>
          <Statement className="max-w-4xl text-[40px] sm:text-[60px]">
            Price your next job properly.
          </Statement>
          <p className="mt-7 max-w-[58ch] text-lg leading-[1.65] text-white/70">
            Load a handful of your own rates, build one estimate, and look at the margin before you send it. That is
            enough to know whether this belongs in your office.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-10">
            <EditorialLink href="/register" tone="light">Get Started</EditorialLink>
            <EditorialLink href="/contact" tone="light">Book a walkthrough</EditorialLink>
          </div>
        </Shell>
      </Band>
    </MarketingShell>
  );
}

const BRAND_LEDE =
  "Estimating, quotations, contracts, invoicing and project financials for contractors, builders and quantity surveyors working in cedis  with your own rates, your regions and your milestones.";
