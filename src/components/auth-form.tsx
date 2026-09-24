"use client";

import { useActionState, useEffect } from "react";
import { SpinnerGap, WarningCircle } from "@phosphor-icons/react/ssr";
import { btn, cn, inputClass, labelClass } from "@/lib/ui";
import { useToast } from "@/components/ui/toast";
import type { FormState } from "@/lib/form";

type Field = {
  name: string;
  label: string;
  type: string;
  autoComplete?: string;
  required?: boolean;
  defaultValue?: string;
  options?: { value: string; label: string }[];
};

export function AuthForm({
  action,
  fields,
  submitLabel,
  pendingLabel,
  hidden,
  variant = "primary",
  fullWidth = true,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  fields: Field[];
  submitLabel: string;
  pendingLabel: string;
  hidden?: Record<string, string>;
  variant?: "primary" | "dark";
  fullWidth?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const toast = useToast();

  useEffect(() => {
    if (state?.message) toast({ tone: "success", title: state.message });
  }, [state, toast]);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {Object.entries(hidden ?? {}).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      {fields.map((f) => (
        <div key={f.name}>
          <label htmlFor={f.name} className={labelClass}>
            {f.label}
          </label>
          {f.options ? (
            <select id={f.name} name={f.name} defaultValue={f.defaultValue} className={inputClass}>
              {f.options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          ) : (
            <input
              id={f.name}
              name={f.name}
              type={f.type}
              autoComplete={f.autoComplete}
              required={f.required ?? true}
              defaultValue={f.defaultValue}
              className={inputClass}
            />
          )}
        </div>
      ))}
      {state?.error && (
        <p role="alert" className="flex items-start gap-2 rounded-lg border border-accent/50 bg-accent-soft px-3 py-2.5 text-sm text-accent-text">
          <WarningCircle size={16} weight="fill" className="mt-0.5 shrink-0" />
          {state.error}
        </p>
      )}
      {state?.message && (
        <p role="status" className="rounded-lg border border-line bg-sunken px-3 py-2.5 text-sm text-fg">
          {state.message}
        </p>
      )}
      <button type="submit" disabled={pending} className={cn(btn(variant), fullWidth && "w-full")}>
        {pending && <SpinnerGap size={16} weight="bold" className="animate-spin motion-reduce:animate-none" />}
        {pending ? pendingLabel : submitLabel}
      </button>
    </form>
  );
}
