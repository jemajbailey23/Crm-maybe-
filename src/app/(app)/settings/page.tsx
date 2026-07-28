import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { STAGE_ORDER, getStageLabels } from "@/lib/pipeline-stages";
import { StageLabelInput } from "./stage-label-input";
import { SimpleListManager } from "./simple-list-manager";
import { BrandColorPicker } from "./brand-color-picker";
import { LandingPageSelect } from "./landing-page-select";
import { addServiceType, deleteServiceType, addTaskLabel, deleteTaskLabel } from "./actions";

export const dynamic = "force-dynamic";

function SettingsSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="animate-slide-up rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
      <h2 className="text-sm font-semibold text-zinc-100">{title}</h2>
      <p className="mt-1 mb-4 text-sm text-zinc-500">{description}</p>
      {children}
    </section>
  );
}

function LinkOutCard({ title, description, href, cta }: {
  title: string;
  description: string;
  href: string;
  cta: string;
}) {
  return (
    <SettingsSection title={title} description={description}>
      <Link
        href={href}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-400 transition-colors hover:text-indigo-300"
      >
        {cta} →
      </Link>
    </SettingsSection>
  );
}

export default async function SettingsPage() {
  const user = await requireUser();

  const [stageLabels, serviceTypes, taskLabels] = await Promise.all([
    getStageLabels(),
    prisma.serviceType.findMany({ orderBy: { name: "asc" } }),
    prisma.taskLabelPreset.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">
          Settings
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Customize how the CRM looks and behaves.
        </p>
      </div>

      <SettingsSection
        title="Pipeline stages"
        description="Rename the deal stages used across Pipeline, Contacts, and Dashboard. The underlying Won/Lost logic stays the same — only the label changes."
      >
        <div className="space-y-3">
          {STAGE_ORDER.map((stage) => (
            <div key={stage} className="flex items-center gap-3">
              <span className="w-28 shrink-0 text-xs text-zinc-500">{stage}</span>
              <StageLabelInput stage={stage} label={stageLabels[stage]} />
            </div>
          ))}
        </div>
      </SettingsSection>

      <SettingsSection
        title="Service types"
        description="Suggested names offered when adding a service on a client's Billing tab."
      >
        <SimpleListManager
          items={serviceTypes}
          addAction={addServiceType}
          deleteAction={deleteServiceType}
          placeholder="SEO retainer"
          emptyText="No service types yet — add a few to speed up billing entry."
        />
      </SettingsSection>

      <SettingsSection
        title="Task labels"
        description="Suggested labels offered when tagging a task."
      >
        <SimpleListManager
          items={taskLabels}
          addAction={addTaskLabel}
          deleteAction={deleteTaskLabel}
          placeholder="urgent"
          emptyText="No task labels yet — add a few common ones."
        />
      </SettingsSection>

      <LinkOutCard
        title="Automation rules"
        description="Create and manage rules that react to CRM events like a new lead or a paid invoice."
        href="/automations"
        cta="Manage automations"
      />

      <LinkOutCard
        title="Email templates"
        description="Reusable email copy, stored in the Knowledge Base so it's searchable alongside everything else."
        href="/knowledge?category=EMAIL_TEMPLATES"
        cta="Manage email templates"
      />

      <LinkOutCard
        title="Proposal templates"
        description="Reusable proposal copy, stored in the Knowledge Base."
        href="/knowledge?category=PROPOSAL_TEMPLATES"
        cta="Manage proposal templates"
      />

      <SettingsSection
        title="Brand colors"
        description="The accent color used for buttons, links, and highlights across the whole app."
      >
        <BrandColorPicker current={user.brandColor} />
      </SettingsSection>

      <SettingsSection
        title="User preferences"
        description="Where you land after logging in. Your name, email, timezone, and booking availability live on the Account and Booking pages."
      >
        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 text-sm text-zinc-300">
            Default landing page
            <LandingPageSelect current={user.defaultLandingPage} />
          </label>
          <Link
            href="/account"
            className="text-sm font-medium text-indigo-400 transition-colors hover:text-indigo-300"
          >
            Edit account →
          </Link>
          <Link
            href="/booking"
            className="text-sm font-medium text-indigo-400 transition-colors hover:text-indigo-300"
          >
            Edit booking settings →
          </Link>
        </div>
      </SettingsSection>
    </div>
  );
}
