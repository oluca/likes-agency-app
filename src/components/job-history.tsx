"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Archive, CaretRight, FilmSlate, MagnifyingGlass, Star, X } from "@phosphor-icons/react/ssr";
import { patchJob, thumbnailUrl, ApiError, type JobPatch } from "@/lib/api-client";
import { useToast } from "@/components/ui/toast";
import { EmptyState } from "@/components/ui/empty-state";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge, STATUS_LABEL } from "@/components/ui/status-badge";
import { btn, cn, inputClass, tableCell, tableHead } from "@/lib/ui";
import { isActiveJob, type Job } from "@/lib/types";

const PAGE_SIZE = 20;

const FILTERS = [
  { id: "all", label: "Alle", match: (j: Job) => !j.meta?.archived_at },
  { id: "starred", label: "Markiert", match: (j: Job) => !!j.meta?.starred },
  { id: "archived", label: "Archiv", match: (j: Job) => !!j.meta?.archived_at },
  { id: "active", label: "Aktiv", match: isActiveJob },
  { id: "done", label: "Fertig", match: (j: Job) => j.status === "done" },
  { id: "problem", label: "Fehler", match: (j: Job) => j.status === "failed" || j.status === "canceled" },
] as const;

const DATE = new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

interface JobHistoryProps {
  jobs: Job[] | null;
  error: string | null;
  onChanged: () => void;
}

function formatDuration(s: number | null | undefined) {
  if (s == null) return "–";
  const m = Math.floor(s / 60);
  return `${m}:${String(Math.round(s % 60)).padStart(2, "0")}`;
}

export function JobHistory({ jobs, error, onChanged }: JobHistoryProps) {
  const toast = useToast();
  const router = useRouter();

  async function toggle(job: Job, patch: JobPatch) {
    try {
      await patchJob(job.id, patch);
      onChanged();
    } catch (err) {
      toast({ tone: "error", title: "Änderung fehlgeschlagen", description: err instanceof ApiError ? err.message : undefined });
    }
  }

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["id"]>("all");
  const [limit, setLimit] = useState(PAGE_SIZE);

  const filtered = useMemo(() => {
    const match = FILTERS.find((f) => f.id === filter)!.match;
    const q = query.trim().toLowerCase();
    return (jobs ?? []).filter(
      (j) =>
        match(j) &&
        (!q ||
          j.id.toLowerCase().includes(q) ||
          STATUS_LABEL[j.status].toLowerCase().includes(q) ||
          (j.meta?.title ?? "").toLowerCase().includes(q) ||
          (j.meta?.filename ?? "").toLowerCase().includes(q) ||
          (j.meta?.tags ?? []).some((t) => t.toLowerCase().includes(q)))
    );
  }, [jobs, query, filter]);

  if (error) {
    return (
      <p role="alert" className="m-5 rounded-lg border border-accent/50 bg-accent-soft px-4 py-3 text-sm text-accent-text sm:m-6">
        {error}
      </p>
    );
  }

  if (!jobs) {
    return (
      <div className="flex flex-col gap-3 p-5 sm:p-6" aria-busy="true" aria-label="Lade Job-Historie">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <EmptyState
        icon={<FilmSlate size={22} />}
        title="Noch keine Jobs"
        description="Sobald du einen Render startest, erscheint er hier mit Status und Download."
        action={
          <a href="#neuer-render" className={btn("primary", "sm")}>
            Ersten Render starten
          </a>
        }
      />
    );
  }

  const visible = filtered.slice(0, limit);

  return (
    <div>
      <div className="flex flex-col gap-3 px-5 pb-4 pt-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="relative sm:w-72">
          <MagnifyingGlass size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Titel, Job-ID oder Status suchen"
            aria-label="Jobs durchsuchen"
            className={cn(inputClass, "pl-9")}
          />
        </div>
        <div role="radiogroup" aria-label="Status filtern" className="flex gap-1 rounded-lg border border-line bg-sunken p-1">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              role="radio"
              aria-checked={filter === f.id}
              onClick={() => {
                setFilter(f.id);
                setLimit(PAGE_SIZE);
              }}
              className={cn(
                "h-7 flex-1 rounded-md px-3 text-[13px] font-medium transition-colors duration-150 sm:flex-none",
                filter === f.id ? "bg-surface text-fg shadow-card" : "text-muted hover:text-fg"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<MagnifyingGlass size={22} />}
          title="Keine Treffer"
          description="Passe Suche oder Filter an, um Jobs zu sehen."
          action={
            <button
              type="button"
              className={btn("secondary", "sm")}
              onClick={() => {
                setQuery("");
                setFilter("all");
              }}
            >
              <X size={14} weight="bold" />
              Zurücksetzen
            </button>
          }
        />
      ) : (
        <div className="relative overflow-x-auto border-t border-line">
          <table className="w-full min-w-[420px] border-collapse">
            <thead className="bg-sunken">
              <tr>
                <th scope="col" className={tableHead}>
                  Job
                </th>
                <th scope="col" className={tableHead}>
                  Status
                </th>
                <th scope="col" className={cn(tableHead, "hidden sm:table-cell")}>
                  Erstellt
                </th>
                <th scope="col" className="w-10">
                  <span className="sr-only">Öffnen</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {visible.map((job) => {
                return (
                  <tr
                    key={job.id}
                    onClick={() => router.push(`/jobs/${encodeURIComponent(job.id)}`)}
                    className="cursor-pointer transition-colors duration-150 hover:bg-sunken"
                  >
                    <td className={cn(tableCell, "max-w-[12rem] sm:max-w-xs")}>
                      <Link
                        href={`/jobs/${encodeURIComponent(job.id)}`}
                        onClick={(e) => e.stopPropagation()}
                        className="flex w-full items-center gap-3 text-left"
                        title={job.id}
                      >
                        {job.meta?.thumbnail_path ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={thumbnailUrl(job.id)} alt="" loading="lazy" className="h-9 w-16 shrink-0 rounded-md bg-sunken object-cover" />
                        ) : (
                          <span className="flex h-9 w-16 shrink-0 items-center justify-center rounded-md bg-sunken text-muted">
                            <FilmSlate size={16} />
                          </span>
                        )}
                        <span className="min-w-0">
                          <span className="block truncate text-sm text-fg">{job.meta?.title ?? job.id}</span>
                          <span className="tabular block truncate text-xs text-muted">
                            {formatDuration(job.meta?.source_duration_s)}
                            {job.meta && job.meta.credits_charged > 0 && ` · ${job.meta.credits_charged} Credits`}
                          </span>
                        </span>
                      </Link>
                    </td>
                    <td className={tableCell}>
                      <StatusBadge status={job.status} />
                      {job.status === "running" && (
                        <Progress
                          value={job.progress}
                          label={`Fortschritt ${job.meta?.title ?? job.id}`}
                          valueText={`${Math.round(job.progress ?? 0)} Prozent`}
                          className="mt-2 h-1 w-24"
                        />
                      )}
                    </td>
                    <td className={cn(tableCell, "tabular hidden text-muted sm:table-cell")}>
                      {DATE.format(new Date(job.created_at))}
                    </td>
                    <td className="whitespace-nowrap pr-3 text-muted">
                      <button
                        type="button"
                        aria-pressed={!!job.meta?.starred}
                        aria-label={job.meta?.starred ? "Markierung entfernen" : "Markieren"}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggle(job, { starred: !job.meta?.starred });
                        }}
                        className="p-1 hover:text-fg"
                      >
                        <Star size={14} weight={job.meta?.starred ? "fill" : "regular"} />
                      </button>
                      <button
                        type="button"
                        aria-label={job.meta?.archived_at ? "Aus Archiv holen" : "Archivieren"}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggle(job, { archived: !job.meta?.archived_at });
                        }}
                        className="p-1 hover:text-fg"
                      >
                        <Archive size={14} />
                      </button>
                      <CaretRight size={14} className="ml-1 inline" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="flex items-center justify-between border-t border-line px-5 py-3 text-[13px] text-muted sm:px-6">
            <span className="tabular">
              {visible.length} von {filtered.length}
            </span>
            {filtered.length > visible.length && (
              <button type="button" onClick={() => setLimit((l) => l + PAGE_SIZE)} className={btn("ghost", "sm")}>
                Mehr anzeigen
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
