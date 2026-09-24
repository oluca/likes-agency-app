"use client";

import { useEffect, useRef, useState } from "react";
import { DownloadSimple, WarningCircle } from "@phosphor-icons/react/ssr";
import { cancelJob, downloadJobUrl, getJob, getJobLog, ApiError } from "@/lib/api-client";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/ui/status-badge";
import { useToast } from "@/components/ui/toast";
import { btn } from "@/lib/ui";
import type { Job } from "@/lib/types";

const ACTIVE_STATUSES: Job["status"][] = ["queued", "running"];

interface JobCardProps {
  jobId: string;
}

export function JobCard({ jobId }: JobCardProps) {
  const toast = useToast();
  const [job, setJob] = useState<Job | null>(null);
  const [log, setLog] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [canceling, setCanceling] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const statusRef = useRef<Job["status"] | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const current = await getJob(jobId);
        if (cancelled) return;
        const previous = statusRef.current;
        setJob(current);
        statusRef.current = current.status;
        setError(null);

        if (previous && ACTIVE_STATUSES.includes(previous)) {
          if (current.status === "done") toast({ tone: "success", title: "Render fertig", description: "Das Video kann heruntergeladen werden." });
          if (current.status === "failed") toast({ tone: "error", title: "Render fehlgeschlagen" });
        }

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
  }, [jobId, toast]);

  async function handleCancel() {
    setCanceling(true);
    try {
      await cancelJob(jobId);
      const current = await getJob(jobId);
      setJob(current);
      statusRef.current = current.status;
      toast({ tone: "info", title: "Job abgebrochen" });
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Abbrechen fehlgeschlagen.";
      setError(message);
      toast({ tone: "error", title: "Abbrechen fehlgeschlagen", description: message });
    } finally {
      setCanceling(false);
      setConfirmOpen(false);
    }
  }

  if (error && !job) {
    return (
      <div role="alert" className="flex items-start gap-2.5 rounded-lg border border-accent/50 bg-accent-soft p-4 text-sm text-accent-text">
        <WarningCircle size={18} weight="fill" className="mt-0.5 shrink-0" />
        {error}
      </div>
    );
  }

  if (!job) {
    return (
      <div className="flex flex-col gap-3" aria-busy="true" aria-label="Lade Job">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-6 w-24" />
        </div>
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <span className="min-w-0 truncate font-mono text-xs text-muted" title={job.id}>
          {job.id}
        </span>
        <StatusBadge status={job.status} />
      </div>

      {log && (
        <pre className="max-h-44 overflow-y-auto whitespace-pre-wrap break-words rounded-lg border border-graphite bg-onyx p-3 font-mono text-xs leading-relaxed text-paper/85">
          {log}
        </pre>
      )}

      {job.status === "failed" && job.error && (
        <p role="alert" className="rounded-lg border border-accent/50 bg-accent-soft px-3 py-2.5 text-sm text-accent-text">
          {job.error}
        </p>
      )}

      {error && (
        <p role="alert" className="rounded-lg border border-accent/50 bg-accent-soft px-3 py-2.5 text-sm text-accent-text">
          {error}
        </p>
      )}

      {(job.status === "done" || job.status === "queued") && (
        <div className="flex gap-2">
          {job.status === "done" && (
            <a href={downloadJobUrl(job.id)} className={btn("primary")}>
              <DownloadSimple size={16} weight="bold" />
              Download
            </a>
          )}
          {job.status === "queued" && (
            <button type="button" onClick={() => setConfirmOpen(true)} disabled={canceling} className={btn("secondary")}>
              {canceling ? "Wird abgebrochen…" : "Abbrechen"}
            </button>
          )}
        </div>
      )}

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleCancel}
        pending={canceling}
        title="Job abbrechen?"
        description="Der Job wird aus der Warteschlange entfernt und nicht gerendert."
        confirmLabel={canceling ? "Wird abgebrochen…" : "Job abbrechen"}
      />
    </div>
  );
}
