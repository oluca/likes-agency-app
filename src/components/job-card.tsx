"use client";

import { useEffect, useRef, useState } from "react";
import { cancelJob, downloadJobUrl, getJob, getJobLog, ApiError } from "@/lib/api-client";
import type { Job } from "@/lib/types";

const STATUS_LABEL: Record<Job["status"], string> = {
  queued: "In Warteschlange",
  running: "Läuft",
  done: "Fertig",
  failed: "Fehlgeschlagen",
  canceled: "Abgebrochen",
};

const STATUS_COLOR: Record<Job["status"], string> = {
  queued: "bg-zinc-200 text-zinc-800 dark:bg-zinc-700 dark:text-zinc-200",
  running: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  done: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  failed: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  canceled: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
};

const ACTIVE_STATUSES: Job["status"][] = ["queued", "running"];

interface JobCardProps {
  jobId: string;
}

export function JobCard({ jobId }: JobCardProps) {
  const [job, setJob] = useState<Job | null>(null);
  const [log, setLog] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [canceling, setCanceling] = useState(false);

  const statusRef = useRef<Job["status"] | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const current = await getJob(jobId);
        if (cancelled) return;
        setJob(current);
        statusRef.current = current.status;
        setError(null);

        try {
          const logResult = await getJobLog(jobId);
          if (!cancelled) setLog(logResult.log);
        } catch {
          // log endpoint may briefly 404 for a fresh job; ignore
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : "Job konnte nicht geladen werden.");
        }
      }
    }

    poll();
    const interval = setInterval(() => {
      if (statusRef.current && !ACTIVE_STATUSES.includes(statusRef.current)) return;
      poll();
    }, 2000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [jobId]);

  async function handleCancel() {
    setCanceling(true);
    try {
      await cancelJob(jobId);
      const current = await getJob(jobId);
      setJob(current);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Abbrechen fehlgeschlagen.");
    } finally {
      setCanceling(false);
    }
  }

  if (error && !job) {
    return (
      <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
        {error}
      </div>
    );
  }

  if (!job) {
    return (
      <div className="rounded-md border border-zinc-200 p-4 text-sm text-zinc-500 dark:border-zinc-800">
        Lade Job…
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-md border border-zinc-200 p-4 dark:border-zinc-800">
      <div className="flex items-center justify-between">
        <span className="font-mono text-xs text-zinc-500">{job.id}</span>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLOR[job.status]}`}>
          {STATUS_LABEL[job.status]}
        </span>
      </div>

      {log && (
        <pre className="max-h-40 overflow-y-auto whitespace-pre-wrap rounded-md bg-zinc-50 p-2 text-xs text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
          {log}
        </pre>
      )}

      {job.status === "failed" && job.error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {job.error}
        </p>
      )}

      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}

      <div className="flex gap-2">
        {job.status === "done" && (
          <a
            href={downloadJobUrl(job.id)}
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
          >
            Download
          </a>
        )}
        {job.status === "queued" && (
          <button
            type="button"
            onClick={handleCancel}
            disabled={canceling}
            className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
          >
            {canceling ? "Wird abgebrochen…" : "Abbrechen"}
          </button>
        )}
      </div>
    </div>
  );
}
