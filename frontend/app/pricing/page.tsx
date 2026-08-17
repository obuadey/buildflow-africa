import type { Metadata } from "next";
import { Check } from "lucide-react";
import { MarketingShell } from "../../components/marketing/MarketingShell";
import { MediaFrame } from "../../components/marketing/MediaFrame";
import { Band, EditorialLink, Eyebrow, Lede, Shell, Statement } from "../../components/marketing/editorial";

export const metadata: Metadata = { title: "Pricing", description: "Priced in cedis, billed per active user." };

const PLANS = [
  {
    name: "Starter",
    price: "GHS 180",
    unit: "per user, per month",
    copy: "For small crews issuing a few quotations a month.",
    features: [
      "Up to 3 users",
      "Unlimited estimates and quotations",
      "Material, labour and equipment rates",
      "Invoices and payment tracking",
      "Client approval links"
    ]
  },
  {
    name: "Business",
    price: "GHS 320",
    unit: "per user, per month",
    copy: "For established contractors running several projects at once.",
    features: [
      "Unlimited users",
      "Contracts, variations and milestone schedules",
      "Rate library and estimate templates",
      "Scope drafting and estimate review",
      "Profitability and cash-flow reporting",
      "Roles and permissions"
    ],
    featured: true
  },
  {
    name: "Enterprise",
    price: "By agreement",
    unit: "annual",
    copy: "For multi-company groups and quantity surveying practices.",
    features: [
      "Multiple companies under one account",
      "BOQ import and custom document formats",
      "Priority support and onboarding",
      "Data export and integration support"
    ]
  }
];

const FAQ: [string, string][] = [
  ["Do I have to use your prices?", "No. Your own rates take priority everywhere. Regional and national figures exist only as a fallback, and the source of every rate is shown on screen."],
  ["Is there a free tier?", "Yes  one user, with the full estimating and quotation workflow. Move to a paid plan when your team grows."],
  ["How is a seat counted?", "Only active users are billed. Deactivating someone removes them from the next invoice; their records stay."],
  ["Can my client approve without an account?", "Yes. Each quotation has a secure tokenised link where a client can view, accept, decline or ask for changes, with the response timestamped."],
  ["What happens to a quotation I revise?", "It is preserved. A revision creates a new version and the original stays available, which matters when a job is questioned months later."],
  ["Do you support other countries?", "GHS and Ghanaian practice are the default. Currency, regions and tax rates are configurable, and Nigeria, Kenya, Rwanda and Uganda are next."]
];

export default function PricingPage() {
  return (
    <MarketingShell>
      <Band className="pt-16 sm:pt-24">
        <Shell>
          <Eyebrow>Pricing</Eyebrow>
          <Statement as="h1" className="mt-6 max-w-4xl text-[44px] sm:text-[64px] lg:text-[78px]">
            Priced in cedis. Billed per active user.
          </Statement>
          <div className="mt-8 grid gap-8 lg:grid-cols-[1.1fr_1fr] lg:items-end">
            <Lede className="text-[#3A4351]">
              Every plan carries the full estimating and quotation workflow. Nothing that affects the accuracy of your
              numbers is held back for a higher tier.
            </Lede>
            <div className="flex flex-wrap items-center gap-8 lg:justify-end">
              <EditorialLink href="/register">Get Started</EditorialLink>
              <EditorialLink href="/contact">Talk to us</EditorialLink>
            </div>
          </div>
        </Shell>
      </Band>

      <Band className="py-16 sm:py-20">
        <Shell>
          <div className="grid gap-px border-t border-[#0B1220]/12 lg:grid-cols-3">
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                className={`flex flex-col border-b border-[#0B1220]/12 py-9 lg:border-b-0 lg:border-r lg:last:border-r-0 lg:px-9 lg:first:pl-0 lg:last:pr-0 ${
                  plan.featured ? "lg:bg-[#F5F6F7]" : ""
                }`}
              >
                <div className="flex items-baseline justify-between gap-3">
                  <p className="text-xl font-semibold tracking-[-0.02em]">{plan.name}</p>
                  {plan.featured ? (
                    <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#2563EB]">Most chosen</span>
                  ) : null}
                </div>
                <p className="num mt-7 text-5xl font-semibold leading-none tracking-[-0.04em]">{plan.price}</p>
                <p className="mt-2 text-sm text-[#5B6470]">{plan.unit}</p>
                <p className="mt-5 text-[15px] leading-relaxed text-[#3A4351]">{plan.copy}</p>
                <ul className="mt-7 flex-1 space-y-2.5">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex gap-2.5 text-[15px] leading-relaxed">
                      <Check className="mt-1 h-4 w-4 shrink-0 text-[#2563EB]" aria-hidden />
                      {feature}
                    </li>
                  ))}
                </ul>
                <div className="mt-9">
                  <EditorialLink href={plan.name === "Enterprise" ? "/contact" : "/register"}>
                    {plan.name === "Enterprise" ? "Talk to us" : "Get Started"}
                  </EditorialLink>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-8 max-w-[70ch] text-sm text-[#5B6470]">
            Prices exclude VAT, NHIL and the GETFund levy where applicable. Annual billing saves two months. Rates
            shown in product demonstrations are sample data, not verified market prices.
          </p>
        </Shell>
      </Band>

      <Band tone="paper" className="py-20 sm:py-24">
        <Shell>
          <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr]">
            <div>
              <Eyebrow>Questions</Eyebrow>
              <Statement className="mt-5 text-[32px] sm:text-[44px]">Straight answers.</Statement>
            </div>
            <dl className="grid gap-x-10 gap-y-8 sm:grid-cols-2">
              {FAQ.map(([q, a]) => (
                <div key={q} className="border-t border-[#0B1220]/12 pt-4">
                  <dt className="text-base font-semibold tracking-[-0.01em]">{q}</dt>
                  <dd className="mt-1.5 text-[15px] leading-relaxed text-[#3A4351]">{a}</dd>
                </div>
              ))}
            </dl>
          </div>
        </Shell>
      </Band>

      <Band className="py-20 sm:py-24">
        <Shell>
          <MediaFrame slot="pricingHero" />
        </Shell>
      </Band>

      <Band tone="dark" className="py-24 sm:py-28">
        <Shell>
          <Statement className="max-w-4xl text-[40px] sm:text-[56px]">Start with the free tier.</Statement>
          <p className="mt-7 max-w-[56ch] text-lg leading-[1.65] text-white/70">
            One user, no card, the whole estimating and quotation workflow. Upgrade when your team grows.
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
