"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BarChart3, Briefcase, Calculator, Check, Database, FileText, HardHat, ShieldCheck, Sparkles, Users } from "lucide-react";
import { LogoBadge } from "../../components/brand/Logo";
import { Card, CardHeader } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Field, Input, Select, Checkbox } from "../../components/ui/Field";
import { Badge } from "../../components/ui/Badge";
import { GHANA_REGIONS } from "../../lib/regions";
import { useSession } from "../../lib/client";
import { tenantPath } from "../../lib/tenant";

const STEPS = ["Company", "Role", "Modules", "Data setup", "Ready"];

const ROLES = [
  { name: "Contractor / Builder", icon: HardHat, detail: "Projects, estimates, site costs and invoices." },
  { name: "Quantity Surveyor", icon: Calculator, detail: "BOQ, cost library and quote controls." },
  { name: "Project Manager", icon: Briefcase, detail: "Documents, progress and delivery risks." },
  { name: "Finance Manager", icon: BarChart3, detail: "Invoices, cash flow, profitability and reports." }
];

const MODULES = [
  ["Projects", "Project records, locations, teams and budgets"],
  ["BOQ & estimates", "Spreadsheet estimate builder and rate library"],
  ["Quotations & contracts", "Client-facing proposals and approvals"],
  ["Invoices & payments", "Receivables, ageing and cash collection"],
  ["Cost database", "Materials, labour and equipment"],
  ["Field records", "Daily diary, site notes, defects and RFIs"],
  ["AI insights", "Estimate reviews and risk prompts"]
];

export default function OnboardingPage() {
  const router = useRouter();
  const session = useSession();
  const [step, setStep] = useState(0);

  const finish = () => {
    const target = session?.tenants[0];
    router.push(target ? tenantPath(target.slug, "/dashboard") : "/login");
  };

  return (
    <div className="min-h-screen bg-canvas px-4 py-8">
      <div className="mx-auto max-w-4xl">
        <div className="flex items-center justify-between gap-3">
          <LogoBadge height={56} />
          <Badge tone="brand">BuildFlow Africa setup</Badge>
        </div>

        <ol className="mt-6 flex items-center gap-2 overflow-x-auto" aria-label="Setup progress">
          {STEPS.map((label, i) => (
            <li key={label} className="flex min-w-0 flex-1 items-center gap-2">
              <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-2xs font-semibold ${
                i < step ? "bg-accent text-accent-fg" : i === step ? "border border-accent text-accent" : "border border-hairline text-subtle"
              }`}>
                {i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </span>
              <span className={`truncate text-sm ${i === step ? "font-medium text-fg" : "text-muted"}`}>{label}</span>
              {i < STEPS.length - 1 ? <span className="h-px flex-1 bg-hairline" /> : null}
            </li>
          ))}
        </ol>

        <Card className="mt-5">
          {step === 0 ? (
            <>
              <CardHeader title="Company profile" subtitle="This appears on every quotation and invoice you send." />
              <div className="grid gap-3 p-4 sm:grid-cols-2">
                <Field label="Company name" required className="sm:col-span-2"><Input placeholder="Obuadey Construction" defaultValue="Obuadey Construction" /></Field>
                <Field label="Phone" required><Input type="tel" placeholder="+233 30 000 0000" /></Field>
                <Field label="Email"><Input type="email" placeholder="hello@company.com" /></Field>
                <Field label="Address" className="sm:col-span-2"><Input placeholder="12 Boundary Road, East Legon" /></Field>
                <Field label="Region"><Select defaultValue="Greater Accra">{GHANA_REGIONS.map((r) => <option key={r}>{r}</option>)}</Select></Field>
                <Field label="City"><Input placeholder="Accra" defaultValue="Accra" /></Field>
                <Field label="TIN"><Input placeholder="C0012345678" /></Field>
                <div className="flex items-end pb-2"><Checkbox label="VAT registered" defaultChecked /></div>
              </div>
            </>
          ) : null}

          {step === 1 ? (
            <>
              <CardHeader title="Choose your role profile" subtitle="The workspace starts with navigation and workflows tuned to your day-to-day work." />
              <div className="grid gap-3 p-4 sm:grid-cols-2">
                {ROLES.map((role, index) => {
                  const Icon = role.icon;
                  return (
                    <label key={role.name} className={`rounded-lg border p-4 ${index === 0 ? "border-accent bg-accent/5" : "border-hairline"}`}>
                      <input type="radio" name="role" defaultChecked={index === 0} className="sr-only" />
                      <span className="flex items-start gap-3">
                        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-sunken text-accent"><Icon className="h-5 w-5" /></span>
                        <span>
                          <span className="block font-semibold">{role.name}</span>
                          <span className="mt-1 block text-sm text-muted">{role.detail}</span>
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </>
          ) : null}

          {step === 2 ? (
            <>
              <CardHeader title="Review your modules" subtitle="Turn on the construction workflows this company needs now. You can change this later." />
              <div className="grid gap-2 p-4 sm:grid-cols-2">
                {MODULES.map(([title, detail], index) => (
                  <label key={title} className="flex items-start gap-3 rounded-lg border border-hairline p-3">
                    <Checkbox defaultChecked={index < 6} />
                    <span>
                      <span className="block text-base font-medium">{title}</span>
                      <span className="block text-sm text-muted">{detail}</span>
                    </span>
                  </label>
                ))}
              </div>
            </>
          ) : null}

          {step === 3 ? (
            <>
              <CardHeader title="Data setup" subtitle="Seed practical records so your dashboard, estimates and reports are useful immediately." />
              <div className="grid gap-3 p-4 sm:grid-cols-2">
                <Field label="Currency"><Select defaultValue="GHS">{["GHS", "NGN", "KES", "RWF", "UGX"].map((c) => <option key={c}>{c}</option>)}</Select></Field>
                <Field label="Classification standard"><Select defaultValue="ghana"><option value="ghana">Ghana starter</option><option value="masterformat">MasterFormat</option><option value="nrm">NRM</option></Select></Field>
                <Field label="Default markup %"><Input type="number" defaultValue={15} /></Field>
                <Field label="Target profit margin %"><Input type="number" defaultValue={18} /></Field>
                <label className="flex items-start gap-3 rounded-lg border border-hairline p-3 sm:col-span-2">
                  <Checkbox defaultChecked />
                  <span>
                    <span className="block font-medium">Load Ghana starter data</span>
                    <span className="text-sm text-muted">Materials, labour rates, equipment rates, templates, sample projects and report views.</span>
                  </span>
                </label>
                <div className="rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm text-warning sm:col-span-2">
                  Starter rates are demonstration data. Review them before contractual quoting.
                </div>
              </div>
            </>
          ) : null}

          {step === 4 ? (
            <>
              <CardHeader title="You are all set" subtitle="BuildFlow Africa is ready with tenant-aware navigation, role modules and starter data." />
              <div className="grid gap-3 p-4 sm:grid-cols-3">
                {[
                  [Database, "Starter library", "76 rates loaded"],
                  [FileText, "Documents", "Quotation and invoice templates ready"],
                  [Users, "Permissions", "Owner role and team invite flow enabled"]
                ].map(([IconValue, title, detail]) => {
                  const Icon = IconValue as typeof Database;
                  return (
                    <div key={String(title)} className="rounded-lg border border-hairline p-4">
                      <Icon className="h-5 w-5 text-accent" />
                      <p className="mt-3 font-semibold">{String(title)}</p>
                      <p className="mt-1 text-sm text-muted">{String(detail)}</p>
                    </div>
                  );
                })}
                <div className="rounded-lg border border-success/25 bg-success/10 p-4 text-success sm:col-span-3">
                  <div className="flex items-start gap-2">
                    <Sparkles className="mt-0.5 h-5 w-5" />
                    <p className="text-sm">Your dashboard will open with projects, estimates, reports and AI insights available for Construction.</p>
                  </div>
                </div>
              </div>
            </>
          ) : null}

          <div className="flex items-center justify-between border-t border-hairline px-4 py-3">
            <Button variant="ghost" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>Back</Button>
            {step < STEPS.length - 1 ? (
              <Button variant="primary" onClick={() => setStep((s) => s + 1)}>Continue</Button>
            ) : (
              <Button variant="primary" onClick={finish}><ShieldCheck className="h-4 w-4" /> Open dashboard</Button>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
