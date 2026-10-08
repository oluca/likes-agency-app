"use client";

import { useEffect, useState } from "react";
import { CheckCircle, ListChecks, Queue, WarningCircle } from "@phosphor-icons/react/ssr";
import { RenderForm } from "@/components/render-form";
import { JobHistory } from "@/components/job-history";
import { ActivityChart } from "@/components/activity-chart";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError, getJob } from "@/lib/api-client";
import { useJobs } from "@/hooks/use-jobs";
import { Card } from "@/components/ui/card";
import { cardClass, titleClass } from "@/lib/ui";
import { isActiveJob, type Job, type RenderParams } from "@/lib/types";

function Kpi({
  label,
  value,
  icon,
  highlight,
}: {
  label: string;
  value: number | null;
  icon: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <div className={`${cardClass} p-5`}>
      <div className="flex items-center justify-between">
        <p className="text-[13px] text-muted">{label}</p>
        <span className={highlight ? "text-accent-text" : "text-muted"}>{icon}</span>
      </div>
      {value === null ? (
        <Skeleton className="mt-3 h-8 w-14" />
      ) : (
        <p className="tabular mt-2 text-3xl font-semibold tracking-tight text-fg">{value}</p>
      )}
    </div>
  );
}

export function RenderStudio({ maxUploadBytes, retryId }: { maxUploadBytes: number; retryId?: string }) {
  const { jobs, error, refresh } = useJobs();
  const [retry, setRetry] = useState<{ id: string; params: RenderParams } | null>(null);
  const [retryError, setRetryError] = useState<string | null>(null);

  // "Mit gleichen Einstellungen erneut versuchen": pre-fill the form from the earlier job's params.
  useEffect(() => {
    if (!retryId) return;
    let cancelled = false;
    getJob(retryId).then(
      (job) => !cancelled && setRetry({ id: job.id, params: job.params ?? {} }),
      (err) =>
        !cancelled && setRetryError(err instanceof ApiError ? err.message : "Einstellungen konnten nicht geladen werden.")
    );
    return () => {
      cancelled = true;
    };
  }, [retryId]);

  const count = (pred: (j: Job) => boolean) => (jobs ? jobs.filter(pred).length : null);

  return (
    <div className="flex flex-col gap-6">
      <section aria-label="Kennzahlen" className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi label="Jobs gesamt" value={jobs ? jobs.length : null} icon={<ListChecks size={18} />} />
        <Kpi label="Aktiv" value={count(isActiveJob)} icon={<Queue size={18} />} highlight />
        <Kpi label="Fertig" value={count((j) => j.status === "done")} icon={<CheckCircle size={18} />} />
        <Kpi label="Fehlgeschlagen" value={count((j) => j.status === "failed")} icon={<WarningCircle size={18} />} />
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Card
          id="neuer-render"
          title="Neuer Render-Job"
          description={
            retry
              ? "Die Einstellungen des früheren Jobs sind vorbelegt. Wähle das Video noch einmal aus."
              : "Video hochladen, Look wählen und rendern."
          }
        >
          {retryId && !retry && !retryError ? (
            <Skeleton className="h-40 w-full" />
          ) : (
            <>
              {retryError && (
                <p role="alert" className="mb-5 rounded-lg border border-accent/50 bg-accent-soft px-3.5 py-3 text-sm text-accent-text">
                  Die früheren Einstellungen konnten nicht geladen werden: {retryError}
                </p>
              )}
              <RenderForm
                key={retry?.id ?? "new"}
                maxUploadBytes={maxUploadBytes}
                initialParams={retry?.params}
                parentJobId={retry?.id}
              />
            </>
          )}
        </Card>

        <div className="flex flex-col gap-6">
          <Card title="Aktivität" description="Jobs der letzten 7 Tage">
            <ActivityChart jobs={jobs} />
          </Card>
        </div>
      </div>

      <section className={cardClass} aria-labelledby="meine-jobs">
        <div className="px-5 pb-1 pt-5 sm:px-6 sm:pt-6">
          <h2 id="meine-jobs" className={titleClass}>
            Meine Jobs
          </h2>
        </div>
        <JobHistory jobs={jobs} error={error} onChanged={refresh} />
      </section>
    </div>
  );
}
