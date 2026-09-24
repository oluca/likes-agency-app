import { cn } from "@/lib/ui";

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("animate-shimmer rounded-md bg-line", className)} />;
}
