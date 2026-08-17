"use client";

import { useState } from "react";
import { MarketingShell } from "../../components/marketing/MarketingShell";
import { MediaFrame } from "../../components/marketing/MediaFrame";
import { Band, Eyebrow, Lede, Shell, Statement } from "../../components/marketing/editorial";
import { GHANA_REGIONS } from "../../lib/regions";

const DETAILS: [string, string, string?][] = [
  ["Phone", "+233 30 000 0000", "tel:+233300000000"],
  ["WhatsApp", "+233 24 000 0000", "https://wa.me/233240000000"],
  ["Email", "hello@buildflow.africa", "mailto:hello@buildflow.africa"],
  ["Office", "Accra, Greater Accra, Ghana"]
];

const inputClass =
  "h-11 w-full border-0 border-b border-[#0B1220]/20 bg-transparent px-0 text-base outline-none transition-colors placeholder:text-[#9AA1AC] focus:border-[#2563EB]";

export default function ContactPage() {
  const [sent, setSent] = useState(false);

  return (
    <MarketingShell>
      <Band className="pt-16 sm:pt-24">
        <Shell>
          <Eyebrow>Connect</Eyebrow>
          <Statement as="h1" className="mt-6 max-w-4xl text-[44px] sm:text-[64px] lg:text-[78px]">
            Talk to someone who knows construction.
          </Statement>
          <Lede className="mt-8 text-[#3A4351]">
            Whether you price two jobs a month or run twenty sites, we will walk through your workflow and show you
            where this fits. Bring a bill you have already priced.
          </Lede>
        </Shell>
      </Band>

      <Band className="py-16 sm:py-20">
        <Shell>
          <div className="grid gap-14 lg:grid-cols-[1fr_1.1fr]">
            <div>
              <dl className="border-t border-[#0B1220]/12">
                {DETAILS.map(([label, value, href]) => (
                  <div key={label} className="flex items-baseline justify-between gap-6 border-b border-[#0B1220]/12 py-5">
                    <dt className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#5B6470]">{label}</dt>
                    <dd className="num text-right text-lg">
                      {href ? (
                        <a href={href} className="underline decoration-[#0B1220]/20 underline-offset-4 hover:decoration-[#0B1220]">
                          {value}
                        </a>
                      ) : value}
                    </dd>
                  </div>
                ))}
              </dl>
              <p className="mt-8 max-w-[46ch] text-[15px] leading-relaxed text-[#5B6470]">
                We reply on the same working day. Bring a bill you have already priced and we will walk through it
                with you.
              </p>
            </div>

            <div>
              {sent ? (
                <div role="status" className="border-t border-[#0B1220]/12 pt-8">
                  <Statement className="text-[28px] sm:text-[36px]">Thank you  your message is with us.</Statement>
                  <p className="mt-4 max-w-[52ch] text-lg leading-relaxed text-[#3A4351]">
                    We will be in touch on the phone number or email you provided.
                  </p>
                  <button
                    onClick={() => setSent(false)}
                    className="mt-8 text-base font-medium underline decoration-[#0B1220]/25 underline-offset-[6px] hover:decoration-[#0B1220]"
                  >
                    Send another message
                  </button>
                </div>
              ) : (
                <form onSubmit={(e) => { e.preventDefault(); setSent(true); }} className="grid gap-8 sm:grid-cols-2">
                  <Field label="Full name" required><input name="name" required className={inputClass} placeholder="Obed Buadey" /></Field>
                  <Field label="Company"><input name="company" className={inputClass} placeholder="Obuadey Construction" /></Field>
                  <Field label="Email" required><input name="email" type="email" required className={inputClass} placeholder="you@company.com" /></Field>
                  <Field label="Phone" required><input name="phone" type="tel" required className={inputClass} placeholder="+233 24 000 0000" /></Field>
                  <Field label="Region">
                    <select name="region" defaultValue="Greater Accra" className={inputClass}>
                      {GHANA_REGIONS.map((r) => <option key={r}>{r}</option>)}
                    </select>
                  </Field>
                  <Field label="Team size">
                    <select name="size" defaultValue="1–5" className={inputClass}>
                      {["1–5", "6–20", "21–50", "50+"].map((s) => <option key={s}>{s}</option>)}
                    </select>
                  </Field>
                  <Field label="What would you like to solve?" full>
                    <textarea
                      name="message"
                      rows={4}
                      className="w-full resize-none border-0 border-b border-[#0B1220]/20 bg-transparent px-0 py-2 text-base outline-none transition-colors placeholder:text-[#9AA1AC] focus:border-[#2563EB]"
                      placeholder="We quote about six jobs a month and lose track of variations…"
                    />
                  </Field>
                  <div className="sm:col-span-2">
                    <button
                      type="submit"
                      className="group inline-flex items-baseline gap-2 text-lg font-medium underline decoration-[#0B1220]/25 underline-offset-[6px] transition-colors hover:decoration-[#0B1220]"
                    >
                      Send message
                      <span aria-hidden className="transition-transform group-hover:translate-x-1">→</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </Shell>
      </Band>

      <Band className="pb-20 sm:pb-28">
        <Shell><MediaFrame slot="contactHero" /></Shell>
      </Band>
    </MarketingShell>
  );
}

function Field({ label, children, required, full }: {
  label: string; children: React.ReactNode; required?: boolean; full?: boolean;
}) {
  return (
    <label className={`block ${full ? "sm:col-span-2" : ""}`}>
      <span className="mb-2 block text-[11px] font-medium uppercase tracking-[0.18em] text-[#5B6470]">
        {label}{required ? <span className="text-[#2563EB]"> *</span> : null}
      </span>
      {children}
    </label>
  );
}
