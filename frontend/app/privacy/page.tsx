import type { Metadata } from "next";
import { MarketingShell } from "../../components/marketing/MarketingShell";
import { Band, Eyebrow, Lede, Shell, Statement } from "../../components/marketing/editorial";

export const metadata: Metadata = { title: "Privacy policy" };

const SECTIONS: [string, string[]][] = [
  ["What we collect", [
    "Account details: your name, work email, phone number and the company you belong to.",
    "Business records you create: clients, leads, projects, estimates, quotations, contracts, invoices, payments, expenses and price lists.",
    "Technical records: sign-in times, IP address and device information, used to secure your account and to record quotation approvals."
  ]],
  ["How we use it", [
    "To operate the service: storing your records, calculating estimates and generating your documents.",
    "To secure your account: verifying company membership on every request and maintaining an audit trail of financial changes.",
    "To support you: responding to enquiries and diagnosing faults you report."
  ]],
  ["What we never do", [
    "We do not sell your data.",
    "We do not pool your prices into a shared average without an explicit, separate agreement.",
    "We do not allow any company to read another company's records, and assistant features are scoped to a single company at a time."
  ]],
  ["Retention and deletion", [
    "Financial records are retained while your account is active and for the period required by applicable tax law.",
    "You can request an export of your data or the deletion of your account at any time."
  ]],
  ["Your rights", [
    "You may request access to, correction of, or deletion of your personal data.",
    "Requests can be sent to privacy@buildflow.africa and are answered within 30 days."
  ]]
];

export default function PrivacyPage() {
  return (
    <MarketingShell>
      <Band className="pt-16 sm:pt-24">
        <Shell>
          <Eyebrow>Legal</Eyebrow>
          <Statement as="h1" className="mt-6 text-[44px] sm:text-[62px]">Privacy policy</Statement>
          <Lede className="mt-6 text-[#5B6470]">Last updated 13 August 2026</Lede>
        </Shell>
      </Band>

      <Band className="py-16 sm:py-20">
        <Shell>
          <div className="max-w-4xl">
            {SECTIONS.map(([title, points], i) => (
              <section key={title} className="grid gap-6 border-t border-[#0B1220]/12 py-10 lg:grid-cols-[0.5fr_1.5fr]">
                <div>
                  <p className="num text-sm text-[#5B6470]">{String(i + 1).padStart(2, "0")}</p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-[-0.025em]">{title}</h2>
                </div>
                <ul className="space-y-3">
                  {points.map((point) => (
                    <li key={point} className="max-w-[68ch] text-lg leading-[1.7] text-[#26303C]">{point}</li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </Shell>
      </Band>
    </MarketingShell>
  );
}
