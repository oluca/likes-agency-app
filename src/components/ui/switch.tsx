"use client";

import { cn } from "@/lib/ui";

export function Switch({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 rounded-lg border border-line px-4 py-3 transition-colors duration-150 has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent hover:bg-sunken">
      <span className="min-w-0">
        <span className="block text-sm font-medium text-fg">{label}</span>
        {description && <span className="mt-0.5 block text-[13px] text-muted">{description}</span>}
      </span>
      <input
        type="checkbox"
        role="switch"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="peer sr-only"
      />
      <span
        aria-hidden
        className={cn(
          "relative mt-0.5 h-6 w-10 shrink-0 rounded-full border transition-colors duration-150",
          checked ? "border-accent bg-accent" : "border-line-strong bg-sunken"
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 size-4.5 rounded-full shadow-card transition-transform duration-150",
            checked ? "translate-x-[1.125rem] bg-onyx" : "translate-x-0.5 bg-fg/60"
          )}
        />
      </span>
    </label>
  );
}
