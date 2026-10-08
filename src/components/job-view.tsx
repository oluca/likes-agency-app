"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowClockwise, ArrowLeft, DownloadSimple, Timer, WarningCircle } from "@phosphor-icons/react/ssr";
import { ApiError, cancelJob, downloadJobUrl, getJob, getJobLog } from "@/lib/api-client";
import { isRetryable } from "@/lib/api-messages";
import { availableUntil, downloadFilename, formatElapsed, runningLabel } from "@/lib/job-text";
import { rememberJob } from "@/lib/my-jobs";
import { useJob } from "@/hooks/use-job";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/ui/status-badge";
import { useToast } from "@/components/ui/toast";
import { btn, cardClass, cardPad } from "@/lib/ui";
import type { Job } from "@/lib/types";

function Alert({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div role="alert" className="flex flex-wrap items-start gap-3 rounded-lg border border-accent/50 bg-accent-soft px-3.5 py-3 text-sm text-accent-text">
      <WarningCircle size={18} weight="fill" className="mt-0.5 shrink-0" />
      <p className="min-w-0 flex-1">{children}</p>
      {action}
    </div>
  );
}

function RetryButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={btn("secondary", "sm")}>
      <ArrowClockwise size={14} weight="bold" />
      Erneut versuchen
    </button>
  );
}

/** Elapsed time since `startedAt`, ticking every second. */
function Elapsed({ startedAt }: { startedAt: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  return <span className="tabular">{formatElapsed(now - Date.parse(startedAt))}</span>;
}

function LogPanel({ jobId }: { jobId: string }) {
  const [log, setLog] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  async function load(open: boolean) {
    if (!open || log !== null) return;
    try {
      setLog((await getJobLog(jobId)).log);
    } catch {
      setFailed(true);
    }
  }

  return (
    <details onToggle={(e) => load(e.currentTarget.open)} className="rounded-lg border border-line">
      <summary className="cursor-pointer select-none px-3.5 py-2.5 text-sm font-medium text-fg">Protokoll anzeigen</summary>
      <div className="border-t border-line p-3">
        {failed ? (
          <p className="text-sm text-muted">Das Protokoll konnte nicht geladen werden.</p>
        ) : log === null ? (
          <Skeleton className="h-20 w-full" />
        ) : (
          <pre tabIndex={0} className="max-h-72 overflow-auto whitespace-pre-wrap break-words rounded-md bg-onyx p-3 font-mono text-xs leading-relaxed text-paper/85">
            {log || "(leer)"}
          </pre>
        )}
      </div>
    </details>
  );
}

/** The source file is deleted server-side, so a retry is a fresh upload with the settings pre-filled. */
function RetryLink({ job, label }: { job: Job; label: string }) {
  return (
    <div>
      <Link href={`/?retry=${encodeURIComponent(job.id)}`} className={btn("primary")}>
        <ArrowClockwise size={16} weight="bold" />
        {label}
      </Link>
      <p className="mt-2 text-[13px] text-muted">Du wählst dazu das Video noch einmal aus. Die Einstellungen sind vorbelegt.</p>
    </div>
  );
}

export function JobView({ jobId }: { jobId: string }) {
  const toast = useToast();
  const { job, error, retry, setJob } = useJob(jobId);
  const [canceling, setCanceling] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const seen = useRef<Job["status"] | null>(null);

  useEffect(() => rememberJob(jobId), [jobId]);

  // Announce completion only when we actually saw the job change, not on a revisit.
  useEffect(() => {
    if (!job) return;
    if (seen.current === "queued" || seen.current === "running") {
      if (job.status === "done") toast({ tone: "success", title: "Render fertig", description: "Das Video kann heruntergeladen werden." });
      if (job.status === "failed") toast({ tone: "error", title: "Render fehlgeschlagen" });
    }
    seen.current = job.status;
  }, [job, toast]);

  async function handleCancel() {
    setCanceling(true);
    setActionError(null);
    try {
      const { canceled } = await cancelJob(jobId);
      if (!canceled) toast({ tone: "info", title: "Nicht mehr abbrechbar", description: "Der Job läuft bereits." });
      setJob(await getJob(jobId));
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Abbrechen fehlgeschlagen.");
    } finally {
      setCanceling(false);
      setConfirmOpen(false);
    }
  }

  const back = (
    <Link href="/" className={btn("ghost", "sm")}>
      <ArrowLeft size={14} weight="bold" />
      Zurück zum Studio
    </Link>
  );

  if (!job) {
    if (error) {
      return (
        <div className="mx-auto flex max-w-2xl flex-col items-start gap-4">
          {back}
          <Alert action={isRetryable(error.status) && <RetryButton onClick={retry} />}>{error.message}</Alert>
        </div>
      );
    }
    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-4" aria-busy="true" aria-label="Job wird geladen">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  const title = job.meta?.title ?? job.meta?.filename ?? "Render-Job";
  const progressText = `${Math.round(job.progress ?? 0)} %`;
  const until = availableUntil(job.finished_at);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <div>{back}</div>

      <section className={`${cardClass} ${cardPad} flex flex-col gap-5`} aria-labelledby="job-title">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 id="job-title" className="truncate text-lg font-semibold tracking-tight text-fg">
              {title}
            </h1>
            <p className="mt-0.5 truncate font-mono text-xs text-muted" title={job.id}>
              {job.id}
            </p>
          </div>
          <StatusBadge status={job.status} />
        </header>

        {error && <Alert action={<RetryButton onClick={retry} />}>Verbindung unterbrochen. {error.message}</Alert>}

        {job.status === "queued" && (
          <div className="flex flex-col gap-3" aria-live="polite">
            <p className="flex items-center gap-2 text-sm text-fg">
              <Timer size={18} className="text-muted" />
              {job.queue_position ? `Platz ${job.queue_position} in der Warteschlange` : "In der Warteschlange"}
            </p>
            <p className="text-[13px] text-muted">
              Wie lange es dauert, hängt von den Jobs vor dir ab. Du kannst diese Seite verlassen, der Job steht danach unter „Meine Jobs“.
            </p>
            <div>
              <button type="button" onClick={() => setConfirmOpen(true)} disabled={canceling} className={btn("secondary")}>
                Abbrechen
              </button>
            </div>
          </div>
        )}

        {job.status === "running" && (
          <div className="flex flex-col gap-3">
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="font-medium text-fg" aria-live="polite">
                {runningLabel(job)}
              </span>
              <span className="tabular text-muted">{progressText}</span>
            </div>
            <Progress value={job.progress} label="Render-Fortschritt" valueText={`${runningLabel(job)}, ${progressText}`} active />
            <p className="text-[13px] text-muted">
              {job.started_at && (
                <>
                  Läuft seit <Elapsed startedAt={job.started_at} />.{" "}
                </>
              )}
              Das Rendern dauert oft mehrere Minuten. Bei „Sprache erkennen“ bleibt der Balken eine Weile stehen, das ist normal.
            </p>
          </div>
        )}

        {job.status === "done" && (
          <div className="flex flex-col gap-4">
            <div className="mx-auto aspect-[9/16] w-full max-w-[18rem] overflow-hidden rounded-xl bg-onyx">
              <video src={downloadJobUrl(job.id)} controls playsInline preload="metadata" className="size-full object-contain">
                Dein Browser kann das Video nicht abspielen. Lade es stattdessen herunter.
              </video>
            </div>
            <div className="flex flex-col items-center gap-2 text-center">
              <a href={downloadJobUrl(job.id)} download={downloadFilename(job)} className={btn("primary")}>
                <DownloadSimple size={16} weight="bold" />
                MP4 herunterladen
              </a>
              <p className="max-w-full truncate text-xs text-muted">{downloadFilename(job)}</p>
              {until && <p className="text-[13px] text-muted">Verfügbar bis ca. {until}</p>}
            </div>
          </div>
        )}

        {job.status === "failed" && (
          <div className="flex flex-col gap-4">
            <Alert>{job.error || "Das Rendern ist fehlgeschlagen."}</Alert>
            <LogPanel jobId={job.id} />
            <RetryLink job={job} label="Mit gleichen Einstellungen erneut versuchen" />
          </div>
        )}

        {job.status === "canceled" && (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted">Dieser Job wurde abgebrochen.</p>
            <RetryLink job={job} label="Mit gleichen Einstellungen neu starten" />
          </div>
        )}

        {job.status === "expired" && (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted">Das Ergebnis ist abgelaufen und wurde gelöscht. Bitte neu rendern.</p>
            <RetryLink job={job} label="Mit gleichen Einstellungen neu rendern" />
          </div>
        )}

        {actionError && <Alert>{actionError}</Alert>}
      </section>

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
