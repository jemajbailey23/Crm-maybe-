import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ContactForm } from "../contact-form";
import { updateContact, deleteContact } from "../actions";
import { toggleTaskStatus, deleteTask } from "../../tasks/actions";
import { deleteActivity } from "../../activities/actions";
import { deleteAttachment } from "../attachments-actions";
import { TaskQuickForm } from "../../tasks/task-quick-form";
import { ActivityQuickForm } from "../../activities/activity-quick-form";
import { AttachmentUploadForm } from "../attachment-upload-form";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { ClientWorkspaceTabs } from "../client-workspace-tabs";
import { ContractStatusSelect } from "../contract-status-select";
import { WebsiteInfoForm } from "../website-info-form";
import { ServicesPanel } from "../services-panel";
import { InvoicesPanel } from "../invoices-panel";
import { LinksPanel } from "../links-panel";
import { CredentialVault } from "../credential-vault";
import {
  DealStageBadge,
  ActivityTypeBadge,
  PriorityBadge,
  ProjectStatusBadge,
  ContractStatusBadge,
  PaymentStatusBadge,
} from "@/components/ui/badge";

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function derivePaymentStatus(
  invoices: { status: string }[]
): "current" | "pending" | "overdue" | "none" {
  if (invoices.length === 0) return "none";
  if (invoices.some((i) => i.status === "OVERDUE")) return "overdue";
  if (invoices.some((i) => i.status === "SENT")) return "pending";
  return "current";
}

export default async function ContactDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [contact, companies] = await Promise.all([
    prisma.contact.findUnique({
      where: { id },
      include: {
        company: true,
        deals: { orderBy: { createdAt: "desc" } },
        projects: { orderBy: { createdAt: "desc" } },
        tasks: { orderBy: [{ status: "asc" }, { dueDate: "asc" }] },
        activities: { orderBy: { occurredAt: "desc" } },
        attachments: { orderBy: { createdAt: "desc" } },
        services: { orderBy: { createdAt: "desc" } },
        invoices: { orderBy: { createdAt: "desc" } },
        links: { orderBy: { createdAt: "desc" } },
        credentials: {
          orderBy: { createdAt: "desc" },
          select: { id: true, label: true, username: true, url: true, notes: true },
        },
      },
    }),
    prisma.company.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  if (!contact) notFound();

  const updateContactWithId = updateContact.bind(null, contact.id);
  const deleteContactWithId = deleteContact.bind(null, contact.id);
  const paymentStatus = derivePaymentStatus(contact.invoices);
  const openTaskCount = contact.tasks.filter((t) => t.status === "OPEN").length;

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">
            {contact.businessName || `${contact.firstName} ${contact.lastName}`}
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            {contact.businessName ? `${contact.firstName} ${contact.lastName} · ` : ""}
            {contact.title ? `${contact.title} · ` : ""}
            {contact.company ? (
              <Link
                href={`/companies/${contact.company.id}`}
                className="hover:text-indigo-400"
              >
                {contact.company.name}
              </Link>
            ) : (
              "No company"
            )}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {contact.status === "CLIENT" ? (
              <>
                <ContractStatusBadge status={contact.contractStatus} />
                <PaymentStatusBadge status={paymentStatus} />
              </>
            ) : (
              <DealStageBadge stage={contact.pipelineStage} />
            )}
            <PriorityBadge priority={contact.priority} />
            {contact.leadScore !== null && (
              <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs font-medium text-zinc-300">
                Score {contact.leadScore}/100
              </span>
            )}
            {contact.nextFollowUpAt && (
              <span className="rounded-full bg-indigo-500/10 px-2 py-0.5 text-xs font-medium text-indigo-300 ring-1 ring-inset ring-indigo-500/20">
                Follow up {formatDate(contact.nextFollowUpAt)}
              </span>
            )}
          </div>
        </div>
        <form action={deleteContactWithId}>
          <ConfirmSubmitButton
            confirmMessage={`Delete ${contact.firstName} ${contact.lastName}? This can't be undone.`}
            className="rounded-lg border border-red-500/30 px-3 py-1.5 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/10"
          >
            Delete contact
          </ConfirmSubmitButton>
        </form>
      </div>

      <ClientWorkspaceTabs
        tabs={[
          {
            id: "overview",
            label: "Overview",
            content: (
              <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
                <h2 className="mb-4 text-sm font-semibold text-zinc-100">Details</h2>
                <ContactForm
                  action={updateContactWithId}
                  companies={companies}
                  defaultValues={contact}
                  submitLabel="Save changes"
                />
              </section>
            ),
          },
          {
            id: "billing",
            label: "Billing",
            content: (
              <div className="space-y-6">
                <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
                  <div className="mb-4 flex flex-wrap items-center gap-3">
                    <h2 className="text-sm font-semibold text-zinc-100">Contract status</h2>
                    <ContractStatusSelect
                      contactId={contact.id}
                      status={contact.contractStatus}
                    />
                    <span className="ml-auto text-sm font-semibold text-zinc-100">
                      Payment status
                    </span>
                    <PaymentStatusBadge status={paymentStatus} />
                  </div>
                </section>

                <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
                  <h2 className="mb-4 text-sm font-semibold text-zinc-100">
                    Services purchased
                  </h2>
                  <ServicesPanel contactId={contact.id} services={contact.services} />
                </section>

                <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
                  <h2 className="mb-4 text-sm font-semibold text-zinc-100">Invoices</h2>
                  <InvoicesPanel contactId={contact.id} invoices={contact.invoices} />
                </section>
              </div>
            ),
          },
          {
            id: "website",
            label: "Website",
            content: (
              <div className="space-y-6">
                <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
                  <h2 className="mb-4 text-sm font-semibold text-zinc-100">
                    Website information
                  </h2>
                  <WebsiteInfoForm
                    contactId={contact.id}
                    defaultValues={contact}
                  />
                </section>

                <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
                  <h2 className="mb-4 text-sm font-semibold text-zinc-100">
                    Online presence
                  </h2>
                  <p className="mb-3 text-xs text-zinc-500">
                    Edit these on the Overview tab, under Business information.
                  </p>
                  <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3 text-sm">
                    <div>
                      <dt className="text-xs text-zinc-500">Google Business Profile</dt>
                      <dd className="truncate text-zinc-300">
                        {contact.googleBusinessProfile || "—"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-zinc-500">Facebook</dt>
                      <dd className="truncate text-zinc-300">{contact.facebook || "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-zinc-500">Instagram</dt>
                      <dd className="truncate text-zinc-300">{contact.instagram || "—"}</dd>
                    </div>
                  </dl>
                </section>

                <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
                  <h2 className="mb-4 text-sm font-semibold text-zinc-100">
                    Important links
                  </h2>
                  <LinksPanel contactId={contact.id} links={contact.links} />
                </section>
              </div>
            ),
          },
          {
            id: "vault",
            label: "Vault",
            content: (
              <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
                <h2 className="mb-4 text-sm font-semibold text-zinc-100">
                  Secure credential vault
                </h2>
                <CredentialVault contactId={contact.id} credentials={contact.credentials} />
              </section>
            ),
          },
          {
            id: "projects",
            label: "Projects",
            badge: contact.projects.length,
            content: (
              <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-zinc-100">Projects</h2>
                  <Link
                    href={`/projects/new?contactId=${contact.id}`}
                    className="text-xs font-medium text-zinc-500 transition-colors hover:text-indigo-400"
                  >
                    + New project
                  </Link>
                </div>
                {contact.projects.length === 0 ? (
                  <p className="text-sm text-zinc-500">No projects for this client yet.</p>
                ) : (
                  <ul className="divide-y divide-zinc-800/60">
                    {contact.projects.map((project) => (
                      <li
                        key={project.id}
                        className="flex items-center justify-between gap-3 py-2.5 text-sm"
                      >
                        <div className="min-w-0">
                          <Link
                            href={`/projects/${project.id}`}
                            className="font-medium text-zinc-100 hover:text-indigo-400"
                          >
                            {project.name}
                          </Link>
                          <div className="mt-1 h-1.5 w-32 overflow-hidden rounded-full bg-zinc-800">
                            <div
                              className="h-full rounded-full bg-linear-to-r from-indigo-500 to-violet-500"
                              style={{ width: `${project.progress}%` }}
                            />
                          </div>
                        </div>
                        <ProjectStatusBadge status={project.status} />
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ),
          },
          {
            id: "deals",
            label: "Deals",
            badge: contact.deals.length,
            content: (
              <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-zinc-100">Deals</h2>
                  <Link
                    href={`/deals/new?contactId=${contact.id}`}
                    className="text-xs font-medium text-zinc-500 transition-colors hover:text-indigo-400"
                  >
                    + New deal
                  </Link>
                </div>
                {contact.deals.length === 0 ? (
                  <p className="text-sm text-zinc-500">No deals for this contact yet.</p>
                ) : (
                  <ul className="divide-y divide-zinc-800/60">
                    {contact.deals.map((deal) => (
                      <li
                        key={deal.id}
                        className="flex items-center justify-between py-2.5 text-sm"
                      >
                        <Link
                          href={`/deals/${deal.id}`}
                          className="font-medium text-zinc-100 hover:text-indigo-400"
                        >
                          {deal.title}
                        </Link>
                        <DealStageBadge stage={deal.stage} />
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ),
          },
          {
            id: "tasks",
            label: "Tasks",
            badge: openTaskCount,
            content: (
              <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
                <h2 className="mb-4 text-sm font-semibold text-zinc-100">Tasks</h2>
                <div className="mb-4">
                  <TaskQuickForm contactId={contact.id} />
                </div>
                {contact.tasks.length === 0 ? (
                  <p className="text-sm text-zinc-500">No tasks yet.</p>
                ) : (
                  <ul className="divide-y divide-zinc-800/60">
                    {contact.tasks.map((task) => (
                      <li
                        key={task.id}
                        className="flex items-center justify-between py-2.5 text-sm"
                      >
                        <div className="flex items-center gap-2.5">
                          <form action={toggleTaskStatus.bind(null, task.id, task.status)}>
                            <button
                              type="submit"
                              className={`h-4 w-4 rounded border transition-colors ${
                                task.status === "DONE"
                                  ? "border-indigo-500 bg-indigo-500"
                                  : "border-zinc-700 bg-zinc-900 hover:border-zinc-600"
                              }`}
                              aria-label="Toggle task status"
                            />
                          </form>
                          <span
                            className={
                              task.status === "DONE"
                                ? "text-zinc-500 line-through"
                                : "text-zinc-200"
                            }
                          >
                            {task.title}
                          </span>
                          {task.dueDate && (
                            <span className="text-xs text-zinc-500">
                              {formatDate(task.dueDate)}
                            </span>
                          )}
                        </div>
                        <form action={deleteTask.bind(null, task.id)}>
                          <button
                            type="submit"
                            className="text-xs text-zinc-600 transition-colors hover:text-red-400"
                          >
                            Remove
                          </button>
                        </form>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ),
          },
          {
            id: "activity",
            label: "Activity",
            content: (
              <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
                <h2 className="mb-4 text-sm font-semibold text-zinc-100">
                  Communication timeline
                </h2>
                <div className="mb-4">
                  <ActivityQuickForm contactId={contact.id} />
                </div>
                {contact.activities.length === 0 ? (
                  <p className="text-sm text-zinc-500">No communication logged yet.</p>
                ) : (
                  <ul className="divide-y divide-zinc-800/60">
                    {contact.activities.map((activity) => (
                      <li
                        key={activity.id}
                        className="flex items-start justify-between gap-3 py-2.5 text-sm"
                      >
                        <div className="min-w-0">
                          <p className="text-zinc-200">{activity.summary}</p>
                          <p className="mt-0.5 text-xs text-zinc-500">
                            {formatDateTime(activity.occurredAt)}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-3">
                          <ActivityTypeBadge type={activity.type} />
                          <form action={deleteActivity.bind(null, activity.id)}>
                            <button
                              type="submit"
                              className="text-xs text-zinc-600 transition-colors hover:text-red-400"
                            >
                              Remove
                            </button>
                          </form>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ),
          },
          {
            id: "files",
            label: "Files",
            badge: contact.attachments.length,
            content: (
              <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
                <h2 className="mb-4 text-sm font-semibold text-zinc-100">File storage</h2>
                <div className="mb-4">
                  <AttachmentUploadForm owner={{ contactId: contact.id }} />
                </div>
                {contact.attachments.length === 0 ? (
                  <p className="text-sm text-zinc-500">No files uploaded yet.</p>
                ) : (
                  <ul className="divide-y divide-zinc-800/60">
                    {contact.attachments.map((file) => (
                      <li
                        key={file.id}
                        className="flex items-center justify-between gap-3 py-2.5 text-sm"
                      >
                        <a
                          href={file.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="min-w-0 truncate font-medium text-zinc-200 hover:text-indigo-400"
                        >
                          {file.filename}
                        </a>
                        <div className="flex shrink-0 items-center gap-3">
                          <span className="text-xs text-zinc-500">
                            {formatBytes(file.sizeBytes)}
                          </span>
                          <form action={deleteAttachment.bind(null, file.id)}>
                            <button
                              type="submit"
                              className="text-xs text-zinc-600 transition-colors hover:text-red-400"
                            >
                              Remove
                            </button>
                          </form>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ),
          },
        ]}
      />
    </div>
  );
}
