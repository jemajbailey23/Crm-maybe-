"use client";

import { useState, useTransition } from "react";
import {
  saveBusinessProfile,
  savePlatformAccess,
  saveBrandVoice,
  completeOnboarding,
} from "./actions";
import { BrandAssetSlotUpload } from "./brand-asset-slot";
import { BRAND_ASSET_SLOTS, BRAND_VOICE_OPTIONS, CONTACT_METHOD_OPTIONS } from "@/lib/brand-assets";
import type { Contact, BrandAsset } from "@prisma/client";

const STEPS = [
  { key: "business", label: "Business Info" },
  { key: "platform", label: "Platform Access" },
  { key: "brand", label: "Brand Assets" },
  { key: "review", label: "Review & Submit" },
] as const;

const inputClass =
  "mt-1 block w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 shadow-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500";
const labelClass = "block text-sm font-medium text-zinc-300";

type Values = {
  legalBusinessName: string;
  serviceAreas: string;
  yearsInBusiness: string;
  businessHours: string;
  title: string;
  preferredContactMethod: string;
  website: string;
  address: string;
  googleBusinessProfile: string;
  facebook: string;
  instagram: string;
  domain: string;
  hostingProvider: string;
  analyticsAccount: string;
  googleSearchConsole: string;
  brandVoice: string;
  brandDescription: string;
  brandDifferentiators: string;
  brandAvoidWords: string;
};

function valuesFrom(contact: Contact): Values {
  return {
    legalBusinessName: contact.legalBusinessName ?? "",
    serviceAreas: contact.serviceAreas ?? "",
    yearsInBusiness: contact.yearsInBusiness ?? "",
    businessHours: contact.businessHours ?? "",
    title: contact.title ?? "",
    preferredContactMethod: contact.preferredContactMethod ?? "",
    website: contact.website ?? "",
    address: contact.address ?? "",
    googleBusinessProfile: contact.googleBusinessProfile ?? "",
    facebook: contact.facebook ?? "",
    instagram: contact.instagram ?? "",
    domain: contact.domain ?? "",
    hostingProvider: contact.hostingProvider ?? "",
    analyticsAccount: contact.analyticsAccount ?? "",
    googleSearchConsole: contact.googleSearchConsole ?? "",
    brandVoice: contact.brandVoice ?? "",
    brandDescription: contact.brandDescription ?? "",
    brandDifferentiators: contact.brandDifferentiators ?? "",
    brandAvoidWords: contact.brandAvoidWords ?? "",
  };
}

function Card({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
      <div>
        <h2 className="text-sm font-semibold text-zinc-100">{title}</h2>
        {description && <p className="mt-1 text-xs text-zinc-500">{description}</p>}
      </div>
      {children}
    </div>
  );
}

function StepNav({
  onBack,
  onContinue,
  pending,
  continueLabel = "Continue",
  showBack = true,
}: {
  onBack?: () => void;
  onContinue: () => void;
  pending: boolean;
  continueLabel?: string;
  showBack?: boolean;
}) {
  return (
    <div className="flex items-center justify-between pt-2">
      {showBack && onBack ? (
        <button
          type="button"
          onClick={onBack}
          className="rounded-lg border border-zinc-800 px-4 py-2 text-sm font-medium text-zinc-300 transition-colors hover:border-zinc-700"
        >
          ← Back
        </button>
      ) : (
        <span />
      )}
      <button
        type="button"
        onClick={onContinue}
        disabled={pending}
        className="rounded-lg bg-indigo-500 px-5 py-2 text-sm font-medium text-white shadow-lg shadow-indigo-500/20 transition-colors hover:bg-indigo-400 disabled:opacity-50"
      >
        {pending ? "Saving…" : continueLabel} →
      </button>
    </div>
  );
}

export function OnboardingWizard({
  token,
  contact,
  brandAssets,
}: {
  token: string;
  contact: Contact;
  brandAssets: BrandAsset[];
}) {
  const [step, setStep] = useState(0);
  const [values, setValues] = useState<Values>(() => valuesFrom(contact));
  const [assets, setAssets] = useState<BrandAsset[]>(brandAssets);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(false);

  const percent = Math.round(((step + 1) / STEPS.length) * 100);

  function field(name: keyof Values) {
    return {
      value: values[name],
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
        setValues((v) => ({ ...v, [name]: e.target.value })),
    };
  }

  function goTo(i: number) {
    setError(null);
    setStep(i);
  }

  function saveStep(
    action: (token: string, prevState: { error?: string; success?: boolean }, formData: FormData) => Promise<{ error?: string; success?: boolean }>,
    fields: (keyof Values)[]
  ) {
    setError(null);
    const formData = new FormData();
    for (const f of fields) formData.set(f, values[f]);
    startTransition(async () => {
      const result = await action(token, {}, formData);
      if (result.error) setError(result.error);
      else setStep((s) => Math.min(s + 1, STEPS.length - 1));
    });
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await completeOnboarding(token);
      if (result.error) setError(result.error);
      else setDone(true);
    });
  }

  if (done) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 text-center">
        <div>
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-2xl text-emerald-400 ring-1 ring-inset ring-emerald-500/20">
            ✓
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">All set — thank you!</h1>
          <p className="mt-2 text-sm text-zinc-500">
            We&apos;ve got everything we need to get started. You can revisit this link anytime to update
            your answers.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <aside className="hidden w-72 shrink-0 border-r border-zinc-800 bg-zinc-900/40 px-6 py-8 lg:flex lg:flex-col">
        <div className="mb-8 flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-linear-to-br from-indigo-500 to-violet-600 text-xs font-bold text-white shadow-lg shadow-indigo-500/20">
            BV
          </div>
          <span className="text-sm font-semibold text-zinc-100">Bailey Ventures Digital</span>
        </div>
        <nav className="space-y-1">
          {STEPS.map((s, i) => (
            <button
              key={s.key}
              type="button"
              onClick={() => goTo(i)}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors ${
                i === step
                  ? "bg-indigo-500/10 text-indigo-300 ring-1 ring-inset ring-indigo-500/20"
                  : "text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200"
              }`}
            >
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] ${
                  i === step
                    ? "bg-indigo-500 text-white"
                    : i < step
                      ? "bg-emerald-500/20 text-emerald-400"
                      : "bg-zinc-800 text-zinc-500"
                }`}
              >
                {i < step ? "✓" : i + 1}
              </span>
              {s.label}
            </button>
          ))}
        </nav>
      </aside>

      <div className="flex-1">
        <div className="mx-auto max-w-2xl px-4 py-8 sm:py-10">
          <div className="mb-6">
            <div className="mb-2 flex items-center justify-between text-xs text-zinc-500">
              <span>
                Step {step + 1} of {STEPS.length} — {STEPS[step].label}
              </span>
              <span className="font-medium text-indigo-400">{percent}%</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
              <div
                className="h-full rounded-full bg-indigo-500 transition-all"
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>

          {error && (
            <p className="mb-4 text-sm text-red-400" aria-live="polite">
              {error}
            </p>
          )}

          {step === 0 && (
            <div className="space-y-6">
              <Card title="Who we're talking to" description="On file already — reach out if anything here needs correcting.">
                <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 text-sm">
                  <div>
                    <dt className="text-xs text-zinc-500">Name</dt>
                    <dd className="text-zinc-300">
                      {contact.firstName} {contact.lastName}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-zinc-500">Email</dt>
                    <dd className="text-zinc-300">{contact.email || "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-zinc-500">Business name</dt>
                    <dd className="text-zinc-300">{contact.businessName || "—"}</dd>
                  </div>
                </dl>
              </Card>

              <Card title="Business details">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className={labelClass}>Legal business name</label>
                    <input placeholder="Acme Concrete LLC" className={inputClass} {...field("legalBusinessName")} />
                  </div>
                  <div>
                    <label className={labelClass}>Years in business</label>
                    <input placeholder="5" className={inputClass} {...field("yearsInBusiness")} />
                  </div>
                  <div>
                    <label className={labelClass}>Service areas</label>
                    <input placeholder="Dallas, Fort Worth, Plano" className={inputClass} {...field("serviceAreas")} />
                  </div>
                  <div>
                    <label className={labelClass}>Business hours</label>
                    <input placeholder="Mon–Fri 8am–5pm" className={inputClass} {...field("businessHours")} />
                  </div>
                </div>
              </Card>

              <Card title="Primary contact">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className={labelClass}>Job title</label>
                    <input placeholder="Owner" className={inputClass} {...field("title")} />
                  </div>
                  <div>
                    <label className={labelClass}>Preferred contact method</label>
                    <select className={inputClass} {...field("preferredContactMethod")}>
                      <option value="">Select…</option>
                      {CONTACT_METHOD_OPTIONS.map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </Card>

              <StepNav
                showBack={false}
                pending={pending}
                onContinue={() =>
                  saveStep(saveBusinessProfile, [
                    "legalBusinessName",
                    "serviceAreas",
                    "yearsInBusiness",
                    "businessHours",
                    "title",
                    "preferredContactMethod",
                  ])
                }
              />
            </div>
          )}

          {step === 1 && (
            <div className="space-y-6">
              <Card
                title="Platform access"
                description="Let us know what you're using for each of these — leave any blank if you're not sure, we can follow up."
              >
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {(
                    [
                      ["website", "Website", "https://"],
                      ["domain", "Domain", "yourbusiness.com"],
                      ["hostingProvider", "Hosting provider", "GoDaddy, Bluehost, Wix…"],
                      ["analyticsAccount", "Analytics", "GA4 property / link"],
                      ["googleSearchConsole", "Google Search Console", "Property / link"],
                      ["googleBusinessProfile", "Google Business Profile", "https://"],
                      ["facebook", "Facebook", "https://"],
                      ["instagram", "Instagram", "https://"],
                    ] as const
                  ).map(([name, label, placeholder]) => {
                    const connected = values[name].trim().length > 0;
                    return (
                      <div key={name}>
                        <div className="mb-1 flex items-center justify-between">
                          <label className={labelClass}>{label}</label>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                              connected
                                ? "bg-emerald-500/10 text-emerald-400 ring-1 ring-inset ring-emerald-500/20"
                                : "bg-zinc-800 text-zinc-500 ring-1 ring-inset ring-zinc-700"
                            }`}
                          >
                            {connected ? "Provided" : "Needed"}
                          </span>
                        </div>
                        <input placeholder={placeholder} className={inputClass.replace("mt-1 ", "")} {...field(name)} />
                      </div>
                    );
                  })}
                </div>
              </Card>
              <Card title="Business address">
                <input placeholder="123 Main St, Springfield" className={inputClass} {...field("address")} />
              </Card>

              <StepNav
                pending={pending}
                onBack={() => goTo(0)}
                onContinue={() =>
                  saveStep(savePlatformAccess, [
                    "website",
                    "address",
                    "googleBusinessProfile",
                    "facebook",
                    "instagram",
                    "domain",
                    "hostingProvider",
                    "analyticsAccount",
                    "googleSearchConsole",
                  ])
                }
              />
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <Card title="Brand files" description="Drop in whatever you have — nothing here is required.">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {BRAND_ASSET_SLOTS.map((s) => (
                    <BrandAssetSlotUpload
                      key={s.slot}
                      token={token}
                      slot={s.slot}
                      label={s.label}
                      hint={s.hint}
                      assets={assets.filter((a) => a.slot === s.slot)}
                      onAdded={(a) => setAssets((prev) => [...prev, a])}
                      onRemoved={(id) => setAssets((prev) => prev.filter((x) => x.id !== id))}
                    />
                  ))}
                </div>
              </Card>

              <Card title="Brand voice" description="Select the tone that best fits your brand.">
                <div className="flex flex-wrap gap-2">
                  {BRAND_VOICE_OPTIONS.map((tone) => (
                    <button
                      key={tone}
                      type="button"
                      onClick={() => setValues((v) => ({ ...v, brandVoice: tone }))}
                      className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                        values.brandVoice === tone
                          ? "border-indigo-500 bg-indigo-500/10 text-indigo-300"
                          : "border-zinc-800 text-zinc-400 hover:border-zinc-700"
                      }`}
                    >
                      {tone}
                    </button>
                  ))}
                </div>
                <div>
                  <label className={labelClass}>Describe your business in your own words</label>
                  <textarea
                    rows={3}
                    placeholder="Tell us what you do, who you serve, and your mission…"
                    className={inputClass}
                    {...field("brandDescription")}
                  />
                </div>
                <div>
                  <label className={labelClass}>What makes your company different?</label>
                  <textarea
                    rows={2}
                    placeholder="What sets you apart from competitors?"
                    className={inputClass}
                    {...field("brandDifferentiators")}
                  />
                </div>
                <div>
                  <label className={labelClass}>Any words or claims we should avoid?</label>
                  <textarea
                    rows={2}
                    placeholder="List any words, phrases, or claims you'd prefer we don't use."
                    className={inputClass}
                    {...field("brandAvoidWords")}
                  />
                </div>
              </Card>

              <StepNav
                pending={pending}
                onBack={() => goTo(1)}
                onContinue={() =>
                  saveStep(saveBrandVoice, [
                    "brandVoice",
                    "brandDescription",
                    "brandDifferentiators",
                    "brandAvoidWords",
                  ])
                }
              />
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <Card title="Business details">
                <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 text-sm">
                  <SummaryRow label="Legal business name" value={values.legalBusinessName} />
                  <SummaryRow label="Years in business" value={values.yearsInBusiness} />
                  <SummaryRow label="Service areas" value={values.serviceAreas} />
                  <SummaryRow label="Business hours" value={values.businessHours} />
                  <SummaryRow label="Job title" value={values.title} />
                  <SummaryRow label="Preferred contact method" value={values.preferredContactMethod} />
                </dl>
              </Card>
              <Card title="Platform access">
                <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 text-sm">
                  <SummaryRow label="Website" value={values.website} />
                  <SummaryRow label="Domain" value={values.domain} />
                  <SummaryRow label="Hosting provider" value={values.hostingProvider} />
                  <SummaryRow label="Analytics" value={values.analyticsAccount} />
                  <SummaryRow label="Search Console" value={values.googleSearchConsole} />
                  <SummaryRow label="Google Business Profile" value={values.googleBusinessProfile} />
                  <SummaryRow label="Facebook" value={values.facebook} />
                  <SummaryRow label="Instagram" value={values.instagram} />
                  <SummaryRow label="Business address" value={values.address} />
                </dl>
              </Card>
              <Card title="Brand">
                <dl className="grid grid-cols-1 gap-3 text-sm">
                  <SummaryRow label="Brand voice" value={values.brandVoice} />
                  <SummaryRow label="Description" value={values.brandDescription} />
                </dl>
                <p className="text-xs text-zinc-500">
                  {assets.length > 0
                    ? `${assets.length} file${assets.length > 1 ? "s" : ""} uploaded.`
                    : "No files uploaded."}
                </p>
              </Card>

              <StepNav pending={pending} onBack={() => goTo(2)} onContinue={submit} continueLabel="Submit" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-zinc-500">{label}</dt>
      <dd className="truncate text-zinc-300">{value || "—"}</dd>
    </div>
  );
}
