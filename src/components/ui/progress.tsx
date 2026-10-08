import { cn } from "@/lib/ui";

/**
 * Coarse progress bar. The API's value is intentionally rough (it stands still while the speech is transcribed),
 * so `active` adds a subtle moving highlight to show the job is alive without promising a remaining time.
 */
export function Progress({
  value,
  label,
  valueText,
  active,
  className,
}: {
  value: number | null;
  label: string;
  valueText: string;
  active?: boolean;
  className?: string;
}) {
  const pct = value == null ? 0 : Math.min(100, Math.max(0, value));
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct)}
      aria-valuetext={valueText}
      className={cn("relative h-2 w-full overflow-hidden rounded-full bg-sunken", className)}
    >
      <div className="h-full rounded-full bg-accent transition-[width] duration-700 ease-out" style={{ width: `${pct}%` }} />
      {active && (
        <div aria-hidden className="absolute inset-y-0 left-0 w-1/4 animate-activity rounded-full bg-fg/15 motion-reduce:hidden" />
      )}
    </div>
  );
}
