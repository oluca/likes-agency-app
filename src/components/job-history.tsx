"use client";

import { useEffect, useState } from "react";
import { listJobs, ApiError } from "@/lib/api-client";
import type { Job } from "@/lib/types";

const STATUS_LABEL: Record<Job["status"], string> = {
  queued: "Warteschlange",
  running: "Läuft",
  done: "Fertig",
  failed: "Fehler",
  canceled: "Abgebrochen",
};

const ACTIVE_INTERVAL_MS = 2000;
const IDLE_INTERVAL_MS = 60000;

interface JobHistoryProps {
  onSelect: (jobId: string) => void;
  refreshKey: number;
}

export function JobHistory({ onSelect, refreshKey }: JobHistoryProps) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timeout: ReturnType<typeof setTimeout>;

    async function load() {
      let delay = IDLE_INTERVAL_MS;
      try {
        const result = await listJobs();
        if (cancelled) return;
        if (result.some((j) => j.status === "queued" || j.status === "running")) {
          delay = ACTIVE_INTERVAL_MS;
        }
        setJobs(
          [...result]
            .sort((a, b) => b.created_at.localeCompare(a.created_at))
            .slice(0, 20)
        );
        setError(null);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof ApiError ? err.message : "Job-Historie konnte nicht geladen werden.");
      }
      timeout = setTimeout(load, delay);
    }

    load();
    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [refreshKey]);

  if (error) {
    return <p className="text-sm text-red-600 dark:text-red-400">{error}</p>;
  }

  if (jobs.length === 0) {
    return <p className="text-sm text-zinc-500">Noch keine Jobs.</p>;
  }

  return (
    <ul className="flex flex-col divide-y divide-zinc-200 dark:divide-zinc-800">
      {jobs.map((job) => (
        <li key={job.id}>
          <button
            type="button"
            onClick={() => onSelect(job.id)}
            className="flex w-full items-center justify-between gap-3 py-2 text-left text-sm hover:bg-zinc-50 dark:hover:bg-zinc-900"
          >
            <span className="truncate font-mono text-xs text-zinc-500">{job.id}</span>
            <span className="shrink-0 text-xs text-zinc-600 dark:text-zinc-400">
              {STATUS_LABEL[job.status]}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
