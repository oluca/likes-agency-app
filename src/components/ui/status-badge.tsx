import { CheckCircle, Prohibit, SpinnerGap, Timer, WarningCircle } from "@phosphor-icons/react/ssr";
import type { Job } from "@/lib/types";
import { cn } from "@/lib/ui";

export const STATUS_LABEL: Record<Job["status"], string> = {
  queued: "In Warteschlange",
  running: "Läuft",
  done: "Fertig",
  failed: "Fehlgeschlagen",
  canceled: "Abgebrochen",
};

const STYLE: Record<Job["status"], string> = {
  queued: "border-line-strong bg-sunken text-muted",
  running: "border-accent/40 bg-accent-soft text-accent-text",
  done: "border-transparent bg-accent text-accent-fg",
  failed: "border-accent/60 bg-surface text-accent-text",
  canceled: "border-line bg-sunken text-muted line-through decoration-muted/60",
};

export function StatusBadge({ status, className }: { status: Job["status"]; className?: string }) {
  const icon = {
    queued: <Timer size={14} weight="bold" />,
    running: <SpinnerGap size={14} weight="bold" className="animate-spin motion-reduce:animate-none" />,
    done: <CheckCircle size={14} weight="fill" />,
    failed: <WarningCircle size={14} weight="fill" />,
    canceled: <Prohibit size={14} weight="bold" />,
  }[status];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border px-2 py-0.5 text-xs font-medium",
        STYLE[status],
        className
      )}
    >
      {icon}
      {STATUS_LABEL[status]}
    </span>
  );
}
