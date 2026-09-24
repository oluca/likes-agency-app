import type { Job } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";

const DAY_MS = 86_400_000;
const WEEKDAY = new Intl.DateTimeFormat("de-DE", { weekday: "short" });

/** Bars in Graphite, today in Blush Rose. Numbers are also exposed as text for screen readers. */
export function ActivityChart({ jobs }: { jobs: Job[] | null }) {
  if (!jobs) return <Skeleton className="h-36 w-full" />;

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const days = Array.from({ length: 7 }, (_, i) => {
    const start = startOfToday.getTime() - (6 - i) * DAY_MS;
    const count = jobs.filter((j) => {
      const t = new Date(j.created_at).getTime();
      return t >= start && t < start + DAY_MS;
    }).length;
    return { start, count, label: WEEKDAY.format(new Date(start)).replace(".", "") };
  });
  const max = Math.max(1, ...days.map((d) => d.count));

  return (
    <figure>
      <div className="flex h-36 items-end gap-2" role="img" aria-label={`Jobs pro Tag: ${days.map((d) => `${d.label} ${d.count}`).join(", ")}`}>
        {days.map((d, i) => {
          const today = i === days.length - 1;
          return (
            <div key={d.start} className="group flex h-full flex-1 flex-col">
              <span className="tabular h-5 text-center text-xs text-muted opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                {d.count}
              </span>
              <div className="flex flex-1 items-end">
                <div
                  className={`w-full rounded-md transition-[height,background-color] duration-200 ${
                    today ? "bg-accent" : "bg-graphite/80 group-hover:bg-graphite dark:bg-paper/25 dark:group-hover:bg-paper/40"
                  }`}
                  style={{ height: `${d.count === 0 ? 3 : Math.max(8, (d.count / max) * 100)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex gap-2" aria-hidden>
        {days.map((d, i) => (
          <span
            key={d.start}
            className={`flex-1 text-center text-xs ${i === days.length - 1 ? "font-medium text-accent-text" : "text-muted"}`}
          >
            {d.label}
          </span>
        ))}
      </div>
    </figure>
  );
}
