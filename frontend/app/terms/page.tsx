import type { Metadata } from "next";
import { MarketingShell } from "../../components/marketing/MarketingShell";
import { Band, Eyebrow, Lede, Shell, Statement } from "../../components/marketing/editorial";

export const metadata: Metadata = { title: "Terms of service" };

const SECTIONS: [string, string][] = [
  ["The service", "We provide software for construction estimating, quotations, contracts, invoicing and project financial tracking. You are responsible for the accuracy of the rates, quantities and commercial terms you enter."],
  ["Your account", "You must keep your credentials confidential and are responsible for activity under your account. Company owners and administrators control who may access their company's records."],
  ["Professional judgement", "Calculations are performed exactly as configured by you. Suggested scope, review findings and budget options are aids to professional judgement, not professional advice, and must be reviewed by a competent person before being relied upon."],
  ["Seeded and sample data", "Any starter or demonstration rates supplied with the product are illustrative only. They are not verified current market prices and must be replaced with your own supplier prices before quoting."],
  ["Fees", "Paid plans are billed per active user per month in the currency shown at sign-up. Deactivated users are not billed. Fees exclude applicable taxes and levies."],
  ["Availability", "We aim for continuous availability but do not warrant uninterrupted service. Planned maintenance is announced in advance where practical."],
  ["Liability", "To the extent permitted by law, our aggregate liability is limited to the fees paid in the twelve months preceding the claim. We are not liable for commercial decisions made on the basis of figures you entered."],
  ["Termination", "You may cancel at any time. On cancellation you may export your records; we retain them only as long as required by applicable law."],
  ["Governing law", "These terms are governed by the laws of the Republic of Ghana."]
];

export default function TermsPage() {
  return (
    <MarketingShell>
      <Band className="pt-16 sm:pt-24">
        <Shell>
          <Eyebrow>Legal</Eyebrow>
          <Statement as="h1" className="mt-6 text-[44px] sm:text-[62px]">Terms of service</Statement>
          <Lede className="mt-6 text-[#5B6470]">Last updated 13 August 2026</Lede>
        </Shell>
      </Band>

      <Band className="py-16 sm:py-20">
        <Shell>
          <ol className="max-w-4xl">
            {SECTIONS.map(([title, copy], i) => (
              <li key={title} className="grid gap-6 border-t border-[#0B1220]/12 py-9 lg:grid-cols-[0.5fr_1.5fr]">
                <div>
                  <p className="num text-sm text-[#5B6470]">{String(i + 1).padStart(2, "0")}</p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-[-0.025em]">{title}</h2>
                </div>
                <p className="max-w-[68ch] text-lg leading-[1.7] text-[#26303C]">{copy}</p>
              </li>
            ))}
          </ol>
        </Shell>
      </Band>
    </MarketingShell>
  );
}
