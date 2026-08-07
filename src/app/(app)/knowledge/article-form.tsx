"use client";

import { useActionState, useEffect, useState } from "react";
import type { ArticleFormState } from "./actions";
import { autosaveArticleDraft } from "./actions";
import { CATEGORIES } from "./categories";
import { ArticleContent } from "./article-content";

const initialState: ArticleFormState = {};

const inputClass =
  "mt-1 block w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 shadow-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500";
const labelClass = "block text-sm font-medium text-zinc-300";
const helpClass = "mt-1 text-xs text-zinc-500";

const STATUSES = [
  { value: "DRAFT", label: "Draft" },
  { value: "PUBLISHED", label: "Published" },
  { value: "ARCHIVED", label: "Archived" },
];

const VISIBILITIES = [
  { value: "BVD_INTERNAL", label: "BVD Internal" },
  { value: "CLIENT_PRIVATE", label: "Client Private" },
  { value: "CLIENT_SHARED", label: "Client Shared" },
  { value: "PUBLIC", label: "Public" },
];

const CLIENT_SCOPED = new Set(["CLIENT_PRIVATE", "CLIENT_SHARED"]);

type DefaultValues = {
  title?: string;
  summary?: string;
  content?: string;
  category?: string;
  tags?: string;
  status?: string;
  visibility?: string;
  clientId?: string | null;
  ownerId?: string | null;
  aiEnabled?: boolean;
  reviewDate?: Date | string | null;
};

function toDateInputValue(value?: Date | string | null) {
  if (!value) return "";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

export function ArticleForm({
  action,
  articleId,
  clients,
  owners,
  currentUserId,
  defaultValues,
}: {
  action: (prevState: ArticleFormState, formData: FormData) => Promise<ArticleFormState>;
  // Present only when editing an existing article — enables autosave.
  articleId?: string;
  clients: { id: string; label: string }[];
  owners: { id: string; name: string }[];
  currentUserId: string;
  defaultValues?: DefaultValues;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);

  const [title, setTitle] = useState(defaultValues?.title ?? "");
  const [summary, setSummary] = useState(defaultValues?.summary ?? "");
  const [content, setContent] = useState(defaultValues?.content ?? "");
  const [category, setCategory] = useState(defaultValues?.category ?? CATEGORIES[0].value);
  const [tags, setTags] = useState(defaultValues?.tags ?? "");
  const [status, setStatus] = useState(defaultValues?.status ?? "DRAFT");
  const [visibility, setVisibility] = useState(defaultValues?.visibility ?? "BVD_INTERNAL");
  const [clientId, setClientId] = useState(defaultValues?.clientId ?? "");
  const [ownerId, setOwnerId] = useState(defaultValues?.ownerId ?? currentUserId);
  const [aiEnabled, setAiEnabled] = useState(defaultValues?.aiEnabled ?? false);
  const [reviewDate, setReviewDate] = useState(toDateInputValue(defaultValues?.reviewDate));

  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const [autosaveStatus, setAutosaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  const requiresClient = CLIENT_SCOPED.has(visibility);
  const canPublish = title.trim().length > 0 && content.trim().length > 0 && (!requiresClient || !!clientId);

  // Snapshot of the last-persisted field values, used both to know whether
  // the form is "dirty" (unsaved-changes warning) and as the autosave
  // debounce's change trigger.
  const [lastSaved, setLastSaved] = useState(
    JSON.stringify({ title, summary, content, category, tags, visibility, clientId, aiEnabled, reviewDate })
  );
  const current = { title, summary, content, category, tags, visibility, clientId, aiEnabled, reviewDate };
  const currentJson = JSON.stringify(current);
  const isDirty = currentJson !== lastSaved;

  // Warn before closing/refreshing/navigating away with unsaved changes.
  useEffect(() => {
    function handler(e: BeforeUnloadEvent) {
      if (!isDirty) return;
      e.preventDefault();
      e.returnValue = "";
    }
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  // Autosave — only for an existing Draft article (the server action also
  // re-checks status server-side, so this can never silently overwrite a
  // Published/Archived article even if local `status` state drifted).
  useEffect(() => {
    if (!articleId || status !== "DRAFT" || !isDirty) return;
    if (!title.trim()) return;

    const timer = setTimeout(async () => {
      setAutosaveStatus("saving");
      const result = await autosaveArticleDraft(articleId, {
        title,
        summary,
        content,
        tags: tags || null,
        category,
        visibility,
        clientId: requiresClient ? clientId || null : null,
        aiEnabled,
        reviewDate: reviewDate || null,
      });
      if (result.error) {
        setAutosaveStatus("error");
      } else if (result.savedAt) {
        setLastSaved(currentJson);
        setAutosaveStatus("saved");
      }
    }, 2000);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, summary, content, category, tags, visibility, clientId, aiEnabled, reviewDate]);

  // After a successful non-redirecting save (Save Draft on an already-
  // published-and-staying article, etc.), reset the dirty baseline. Adjusted
  // during render rather than in an effect (React's documented pattern for
  // deriving state from a prop/action-state change) so it takes effect in
  // the same render instead of triggering an extra effect-driven one.
  const [handledSavedAt, setHandledSavedAt] = useState(state.savedAt);
  if (state.savedAt && state.savedAt !== handledSavedAt) {
    setHandledSavedAt(state.savedAt);
    setLastSaved(currentJson);
  }

  return (
    <form action={formAction} className="space-y-5" noValidate>
      <div>
        <label htmlFor="title" className={labelClass}>
          Title
        </label>
        <input
          id="title"
          name="title"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className={inputClass}
          aria-required="true"
        />
      </div>

      <div>
        <label htmlFor="summary" className={labelClass}>
          Short summary
        </label>
        <textarea
          id="summary"
          name="summary"
          rows={2}
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          placeholder="One or two sentences shown in list results and AI source citations."
          className={inputClass}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="category" className={labelClass}>
            Category
          </label>
          <select
            id="category"
            name="category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className={inputClass}
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="tags" className={labelClass}>
            Tags
          </label>
          <input
            id="tags"
            name="tags"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="comma, separated, tags"
            className={inputClass}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="status" className={labelClass}>
            Status
          </label>
          <select
            id="status"
            name="status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className={inputClass}
          >
            {STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
          <p className={helpClass}>Save Draft / Publish Article below always set status directly.</p>
        </div>
        <div>
          <label htmlFor="visibility" className={labelClass}>
            Visibility
          </label>
          <select
            id="visibility"
            name="visibility"
            value={visibility}
            onChange={(e) => setVisibility(e.target.value)}
            className={inputClass}
          >
            {VISIBILITIES.map((v) => (
              <option key={v.value} value={v.value}>
                {v.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {requiresClient && (
        <div>
          <label htmlFor="clientId" className={labelClass}>
            Client
          </label>
          <select
            id="clientId"
            name="clientId"
            value={clientId ?? ""}
            onChange={(e) => setClientId(e.target.value)}
            required={requiresClient}
            className={inputClass}
          >
            <option value="">Select a client…</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
          <p className={helpClass}>
            Required for Client Private / Client Shared — this article will only ever be shown to this
            client, never any other.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="ownerId" className={labelClass}>
            Owner
          </label>
          <select
            id="ownerId"
            name="ownerId"
            value={ownerId ?? ""}
            onChange={(e) => setOwnerId(e.target.value)}
            className={inputClass}
          >
            {owners.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="reviewDate" className={labelClass}>
            Review date
          </label>
          <input
            id="reviewDate"
            type="date"
            name="reviewDate"
            value={reviewDate}
            onChange={(e) => setReviewDate(e.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label htmlFor="content" className={labelClass}>
            Article content
          </label>
          <div className="flex overflow-hidden rounded-lg border border-zinc-800 text-xs font-medium">
            <button
              type="button"
              onClick={() => setMode("edit")}
              aria-pressed={mode === "edit"}
              className={`px-3 py-1.5 transition-colors ${mode === "edit" ? "bg-indigo-500/15 text-indigo-300" : "text-zinc-400 hover:bg-zinc-800/60"}`}
            >
              Edit
            </button>
            <button
              type="button"
              onClick={() => setMode("preview")}
              aria-pressed={mode === "preview"}
              className={`px-3 py-1.5 transition-colors ${mode === "preview" ? "bg-indigo-500/15 text-indigo-300" : "text-zinc-400 hover:bg-zinc-800/60"}`}
            >
              Preview
            </button>
          </div>
        </div>
        {mode === "edit" ? (
          <textarea
            id="content"
            name="content"
            required
            rows={18}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={
              "Write in Markdown — headings (# ## ###), lists (- item), links ([text](url)), tables, **bold**, and `code`.\n\nUse {{placeholders}} for template variables like {{client_name}}."
            }
            className={`${inputClass} font-mono text-[13px] leading-relaxed`}
            aria-required="true"
          />
        ) : (
          <div className={`${inputClass} min-h-[24rem] bg-zinc-950`}>
            {content.trim() ? (
              <ArticleContent content={content} />
            ) : (
              <p className="text-sm text-zinc-600">Nothing to preview yet.</p>
            )}
          </div>
        )}
        {/* Hidden field keeps `content` in the submitted FormData while a preview is showing (the textarea unmounts). */}
        {mode === "preview" && <input type="hidden" name="content" value={content} />}
      </div>

      <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-4">
        <label className="flex items-start gap-2.5 text-sm font-medium text-zinc-200">
          <input
            type="checkbox"
            name="aiEnabled"
            checked={aiEnabled}
            onChange={(e) => setAiEnabled(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-zinc-700 bg-zinc-900 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-0"
            aria-describedby="ai-toggle-help"
          />
          Allow AI Assistant to use this article
        </label>
        <p id="ai-toggle-help" className={helpClass}>
          Even when enabled, the assistant can only retrieve this article once it&rsquo;s <strong>Published</strong> —
          Draft, Archived, and disabled articles are never used to answer questions, and it will only ever
          reach the client(s) this article&rsquo;s visibility allows.
        </p>
      </div>

      <div aria-live="polite">
        {state?.error && <p className="text-sm text-red-400">{state.error}</p>}
        {autosaveStatus === "saving" && <p className="text-xs text-zinc-500">Saving draft…</p>}
        {autosaveStatus === "saved" && !state?.error && (
          <p className="text-xs text-emerald-400">Draft saved automatically.</p>
        )}
        {autosaveStatus === "error" && <p className="text-xs text-amber-400">Autosave failed — save manually.</p>}
        {!pending && state?.savedAt && !state?.error && autosaveStatus === "idle" && (
          <p className="text-xs text-emerald-400">Saved.</p>
        )}
      </div>

      <div className="sticky bottom-0 -mx-4 flex flex-wrap gap-2 border-t border-zinc-800 bg-zinc-950/95 px-4 py-3 backdrop-blur-sm sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:px-0 sm:py-0 sm:backdrop-blur-none">
        <button
          type="submit"
          name="intent"
          value="draft"
          disabled={pending || !title.trim()}
          className="w-full rounded-lg border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-200 transition-colors hover:bg-zinc-800 disabled:opacity-50 sm:w-auto"
        >
          {pending ? "Saving…" : "Save Draft"}
        </button>
        <button
          type="button"
          onClick={() => setMode(mode === "edit" ? "preview" : "edit")}
          className="w-full rounded-lg border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-200 transition-colors hover:bg-zinc-800 sm:w-auto"
        >
          {mode === "edit" ? "Preview" : "Back to editing"}
        </button>
        <button
          type="submit"
          name="intent"
          value="publish"
          disabled={pending || !canPublish}
          title={!canPublish ? "Title, content, and (if required) a client are needed to publish." : undefined}
          className="w-full rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-indigo-500/20 transition-colors hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
        >
          {pending ? "Publishing…" : "Publish Article"}
        </button>
      </div>
    </form>
  );
}
