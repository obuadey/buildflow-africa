import type { Metadata } from "next";
import { MarketingShell } from "../../components/marketing/MarketingShell";
import { MediaFrame } from "../../components/marketing/MediaFrame";
import { Band, EditorialLink, Eyebrow, Lede, Shell, StatFigure, Statement } from "../../components/marketing/editorial";

export const metadata: Metadata = {
  title: "Platform",
  description:
    "Estimating, quotations, contracts, invoicing and project financials for construction businesses in Ghana."
};

type Module = {
  n: string;
  id: string;
  title: string;
  copy: string;
  points: [string, string][];
  media?: "productEstimating" | "productCash";
  flip?: boolean;
};

const MODULES: Module[] = [
  {
    n: "01",
    id: "estimating",
    title: "Estimating",
    copy: "The estimate is where the money is made or lost, so it behaves like a spreadsheet rather than a form  dense rows, inline editing, keyboard movement, and totals that move as you type.",
    media: "productEstimating",
    points: [
      ["Sections and line items", "Quantity, unit, rate, waste and markup on every line, each typed as material, labour, equipment or subcontractor."],
      ["Waste inside the quantity", "Per line or applied across the estimate. The adjusted quantity is what gets priced."],
      ["Rate library", "Reusable material, labour, equipment and subcontractor rates built from your own prices."],
      ["Templates and BOQ import", "Reusable structures, plus Excel and CSV bills mapped into estimate lines."],
      ["Live profit protection", "Direct cost, overhead, contingency, discount, tax and gross margin visible the whole time you edit."],
      ["Deterministic arithmetic", "Recalculated on the server before anything is issued. Decimal-safe, never floating point."]
    ]
  },
  {
    n: "02",
    id: "cost-library",
    title: "Cost library",
    copy: "A rate without a date is a guess. The cost library tracks freshness, flags what has gone stale, and always shows which source a number came from.",
    points: [
      ["Materials", "Brand, category, unit, purchase price, selling rate, city and the date last confirmed."],
      ["Freshness", "Current under 30 days, ageing to 60, stale beyond  filterable, so twenty rates take twenty minutes."],
      ["Labour and equipment", "Trades per day, hour or square metre; plant with hire, transport and operator in one all-in rate."],
      ["Price priority", "Project price, then city rate, then regional rate, then a reference figure."],
      ["Bulk update and import", "A percentage move across a filtered set, or an imported rate list mapped once."]
    ]
  },
  {
    n: "03",
    id: "quotations",
    title: "Quotations and approval",
    copy: "A quotation is a sales document and a legal record at the same time. It has to look right, and it has to be impossible to quietly change after it is sent.",
    points: [
      ["Three formats", "Detailed quote, client summary at section level, or a BOQ layout with item numbering."],
      ["Cost never leaks", "Client documents carry sell rates and totals only. Cost, markup and margin stay inside your workspace."],
      ["Secure approval links", "A tokenised URL with no company or database identifiers in it." ],
      ["Recorded decisions", "Acceptance stored with timestamp, device and IP, and written to the audit trail."],
      ["Versions preserved", "A revision creates a new version. Last month's document is still last month's document."]
    ]
  },
  {
    n: "04",
    id: "contracts",
    title: "Contracts and cash",
    copy: "The stage where spreadsheets give up. Contract value, variations, milestone invoices, part-payments and retention all have to agree with each other  permanently.",
    media: "productCash",
    flip: true,
    points: [
      ["Contracts", "Original value, approved variations, revised value, retention, start and completion dates."],
      ["Milestone schedules", "Mobilisation through practical completion, invoiceable the day a milestone is met."],
      ["Variations", "The original allowance shown beside the new cost, so a client approves a difference rather than a surprise."],
      ["Invoices", "Deposit, progress, milestone, variation and final, each with due date, paid amount and outstanding balance."],
      ["Payments", "Mobile Money, bank, cash, cheque or card, with part-payments and attached receipts."],
      ["Expenses", "Site spending by project and category, so actual cost drives profitability."]
    ]
  },
  {
    n: "05",
    id: "insight",
    title: "Reporting and assistance",
    copy: "Reporting is not a monthly ritual here. The dashboard answers what a contractor asks every morning, and the assistant points at what needs attention without touching a figure.",
    points: [
      ["Dashboard", "Revenue, outstanding, active projects, win rate, gross profit and cash collected, each clicking through."],
      ["Project profitability", "Contract value against recorded cost, with a flag when spending runs ahead of progress."],
      ["Cash flow", "Receipts against site spending by month, and what is owed by whom."],
      ["Sales reporting", "Pipeline by stage, win rate on decided quotations, and quotes opened repeatedly without an answer."],
      ["Estimate review", "Missing labour, absent transport, zero waste, thin margin, stale rates  as suggestions you accept or ignore."],
      ["Exports", "CSV and Excel for every list; print-ready PDF for every client document."]
    ]
  },
  {
    n: "06",
    id: "administration",
    title: "Administration and security",
    copy: "Practices and contractor groups run more than one company. Membership, roles and permissions are resolved from the authenticated user on every request.",
    points: [
      ["Multi-company", "Switch companies from the sidebar. A record from one will not open in another."],
      ["Seven roles", "Owner, admin, estimator, project manager, accountant, staff and viewer."],
      ["Configurable tax", "VAT, NHIL, GETFund levy and custom rates with effective dates  nothing hard-coded."],
      ["Numbering", "Per-company sequences for projects, estimates, quotations, invoices and variations."],
      ["Audit trail", "Estimate, price, quotation, contract, variation, invoice and payment changes with user and timestamp."],
      ["Notifications", "In-app today, with the same event model ready for email, WhatsApp and SMS."]
    ]
  }
];

export default function FeaturesPage() {
  return (
    <MarketingShell>
      <Band className="pt-16 sm:pt-24">
        <Shell>
          <Eyebrow>Platform</Eyebrow>
          <Statement as="h1" className="mt-6 max-w-5xl text-[44px] sm:text-[64px] lg:text-[82px]">
            Everything between the site visit and the bank transfer.
          </Statement>
          <div className="mt-8 grid gap-8 lg:grid-cols-[1.1fr_1fr] lg:items-end">
            <Lede className="text-[#3A4351]">
              Not a calculator with a dashboard bolted on. This is the record of a construction job: what it was priced
              at, what was agreed, what changed, what it cost and what it earned.
            </Lede>
            <div className="flex flex-wrap items-center gap-8 lg:justify-end">
              <EditorialLink href="/pricing">Pricing</EditorialLink>
              <EditorialLink href="/contact">Book a walkthrough</EditorialLink>
            </div>
          </div>
        </Shell>
        <div className="mt-14">
          <Shell><MediaFrame slot="productHero" priority /></Shell>
        </div>
      </Band>

      {MODULES.map((module, i) => (
        <Band
          key={module.id}
          id={module.id}
          tone={i % 2 === 1 ? "paper" : "light"}
          className="scroll-mt-24 py-20 sm:py-24"
        >
          <Shell>
            <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr]">
              <div>
                <p className="num text-sm text-[#5B6470]">{module.n}</p>
                <Statement className="mt-3 text-[32px] sm:text-[44px]">{module.title}</Statement>
              </div>
              <div className="lg:pt-14">
                <Lede className="text-[#3A4351]">{module.copy}</Lede>
              </div>
            </div>

            {module.media ? (
              <div className={`mt-14 grid gap-10 lg:grid-cols-[1.05fr_1fr] lg:items-start ${module.flip ? "" : ""}`}>
                <MediaFrame slot={module.media} className={module.flip ? "lg:order-2" : ""} />
                <dl className={`grid gap-x-10 gap-y-7 sm:grid-cols-2 ${module.flip ? "lg:order-1" : ""}`}>
                  {module.points.map(([title, copy]) => (
                    <div key={title} className="border-t border-[#0B1220]/12 pt-4">
                      <dt className="text-base font-semibold tracking-[-0.01em]">{title}</dt>
                      <dd className="mt-1.5 text-[15px] leading-relaxed text-[#3A4351]">{copy}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ) : (
              <dl className="mt-14 grid gap-x-10 gap-y-7 sm:grid-cols-2 lg:grid-cols-3">
                {module.points.map(([title, copy]) => (
                  <div key={title} className="border-t border-[#0B1220]/12 pt-4">
                    <dt className="text-base font-semibold tracking-[-0.01em]">{title}</dt>
                    <dd className="mt-1.5 text-[15px] leading-relaxed text-[#3A4351]">{copy}</dd>
                  </div>
                ))}
              </dl>
            )}
          </Shell>
        </Band>
      ))}

      <Band tone="dark" className="py-20 sm:py-28">
        <Shell>
          <Eyebrow tone="light">Specifics</Eyebrow>
          <Statement className="mt-5 max-w-4xl text-[34px] sm:text-[46px]">
            The details people ask about in the second meeting.
          </Statement>
          <div className="mt-16 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            <StatFigure value={19} label="Units of measurement" note="From bag and trip to m³ and lot, plus your own." />
            <StatFigure value={32} label="Construction categories" note="Extendable per company." />
            <StatFigure value={12} label="Seeded labour trades" note="Mason to HVAC technician, priced your way." />
            <StatFigure value={5} label="Payment methods" note="Bank, Mobile Money, cash, cheque and card." />
          </div>
          <div className="mt-16 grid gap-x-10 gap-y-7 border-t border-white/15 pt-10 sm:grid-cols-2 lg:grid-cols-3">
            {[
              ["Currency", "GHS by default and locally formatted, with multi-currency architecture for Nigeria, Kenya, Rwanda and Uganda."],
              ["Documents", "Detailed quote, client summary and BOQ layout; PDF for quotations, invoices, variations and schedules."],
              ["Exports", "CSV and Excel across every list and report."],
              ["Accessibility", "Keyboard operation throughout, visible focus states, semantic tables and forms, designed dark mode in the workspace."],
              ["Deployment", "Docker Compose for the full stack: PostgreSQL, object storage, backend, frontend and the AI service."],
              ["Isolation", "Company membership verified server-side on every request; a URL never authorises access."]
            ].map(([title, copy]) => (
              <div key={title}>
                <p className="text-base font-semibold">{title}</p>
                <p className="mt-1.5 text-[15px] leading-relaxed text-white/65">{copy}</p>
              </div>
            ))}
          </div>
        </Shell>
      </Band>

      <Band className="py-24 sm:py-28">
        <Shell>
          <Statement className="max-w-4xl text-[40px] sm:text-[56px]">
            Bring a bill you have already priced.
          </Statement>
          <p className="mt-7 max-w-[58ch] text-lg leading-[1.65] text-[#3A4351]">
            If our number and your number disagree, the interesting part is finding out which line explains it.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-10">
            <EditorialLink href="/register">Get Started</EditorialLink>
            <EditorialLink href="/contact">Book a walkthrough</EditorialLink>
          </div>
        </Shell>
      </Band>
    </MarketingShell>
  );
}
