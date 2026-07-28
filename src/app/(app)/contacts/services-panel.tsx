"use client";

import { useActionState, useRef } from "react";
import { addService, deleteService, type ServiceFormState } from "./services-actions";

const initialState: ServiceFormState = {};

function formatCurrency(value: number | null) {
  if (value === null) return null;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

type ServiceItem = {
  id: string;
  name: string;
  billingType: string;
  amount: number | null;
};

function ServiceRow({ service }: { service: ServiceItem }) {
  return (
    <li className="flex items-center justify-between gap-3 py-2 text-sm">
      <span className="text-zinc-200">{service.name}</span>
      <div className="flex items-center gap-3">
        <span className="text-xs text-zinc-500">
          {formatCurrency(service.amount) ?? "—"}
          {service.billingType === "MONTHLY" ? "/mo" : ""}
        </span>
        <form action={deleteService.bind(null, service.id)}>
          <button
            type="submit"
            className="text-xs text-zinc-600 transition-colors hover:text-red-400"
          >
            Remove
          </button>
        </form>
      </div>
    </li>
  );
}

export function ServicesPanel({
  contactId,
  services,
  serviceTypes = [],
}: {
  contactId: string;
  services: ServiceItem[];
  serviceTypes?: string[];
}) {
  const action = addService.bind(null, contactId);
  const [state, formAction, pending] = useActionState(action, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  const monthly = services.filter((s) => s.billingType === "MONTHLY");
  const oneTime = services.filter((s) => s.billingType === "ONE_TIME");
  const monthlyTotal = monthly.reduce((sum, s) => sum + (s.amount ?? 0), 0);
  const oneTimeTotal = oneTime.reduce((sum, s) => sum + (s.amount ?? 0), 0);

  return (
    <div>
      <form
        ref={formRef}
        action={async (formData) => {
          await formAction(formData);
          formRef.current?.reset();
        }}
        className="mb-4 flex flex-wrap items-end gap-2"
      >
        <div className="flex-1 min-w-[9rem]">
          <label className="block text-xs font-medium text-zinc-400">Service</label>
          <input
            name="name"
            required
            list="service-type-suggestions"
            placeholder="SEO retainer"
            className="mt-1 block w-full rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-100 placeholder:text-zinc-600 shadow-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <datalist id="service-type-suggestions">
            {serviceTypes.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-400">Billing</label>
          <select
            name="billingType"
            className="mt-1 rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-100 shadow-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="ONE_TIME">One-time</option>
            <option value="MONTHLY">Monthly</option>
          </select>
        </div>
        <div className="w-28">
          <label className="block text-xs font-medium text-zinc-400">Amount</label>
          <input
            name="amount"
            type="number"
            min="0"
            step="1"
            placeholder="500"
            className="mt-1 block w-full rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-100 placeholder:text-zinc-600 shadow-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-indigo-500 px-3 py-1.5 text-sm font-medium text-white shadow-lg shadow-indigo-500/20 transition-colors hover:bg-indigo-400 disabled:opacity-50"
        >
          Add
        </button>
      </form>
      {state?.error && <p className="mb-2 text-sm text-red-400">{state.error}</p>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <p className="mb-1 flex items-center justify-between text-xs font-medium uppercase tracking-wide text-zinc-500">
            <span>Monthly subscription</span>
            <span className="text-zinc-300">{formatCurrency(monthlyTotal)}/mo</span>
          </p>
          {monthly.length === 0 ? (
            <p className="text-sm text-zinc-500">No subscriptions.</p>
          ) : (
            <ul className="divide-y divide-zinc-800/60">
              {monthly.map((s) => (
                <ServiceRow key={s.id} service={s} />
              ))}
            </ul>
          )}
        </div>
        <div>
          <p className="mb-1 flex items-center justify-between text-xs font-medium uppercase tracking-wide text-zinc-500">
            <span>One-time purchases</span>
            <span className="text-zinc-300">{formatCurrency(oneTimeTotal)}</span>
          </p>
          {oneTime.length === 0 ? (
            <p className="text-sm text-zinc-500">No one-time purchases.</p>
          ) : (
            <ul className="divide-y divide-zinc-800/60">
              {oneTime.map((s) => (
                <ServiceRow key={s.id} service={s} />
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
