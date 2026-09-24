"use client";

import { useState } from "react";
import { CheckCircle, ListChecks, Queue, WarningCircle } from "@phosphor-icons/react/ssr";
import { RenderForm } from "@/components/render-form";
import { JobCard } from "@/components/job-card";
import { JobHistory } from "@/components/job-history";
import { ActivityChart } from "@/components/activity-chart";
import { Skeleton } from "@/components/ui/skeleton";
import { useJobs } from "@/hooks/use-jobs";
import { Card } from "@/components/ui/card";
import { cardClass, titleClass } from "@/lib/ui";
import { isActiveJob, type Job } from "@/lib/types";

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

export function RenderStudio() {
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const { jobs, error, refresh } = useJobs();

  function handleJobCreated(jobId: string) {
    setActiveJobId(jobId);
    refresh();
  }

  const count = (pred: (j: Job) => boolean) => (jobs ? jobs.filter(pred).length : null);

  return (
    <div className="flex flex-col gap-6">
      <section aria-label="Kennzahlen" className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi label="Jobs gesamt" value={jobs ? jobs.length : null} icon={<ListChecks size={18} />} />
        <Kpi
          label="Aktiv"
          value={count(isActiveJob)}
          icon={<Queue size={18} />}
          highlight
        />
        <Kpi label="Fertig" value={count((j) => j.status === "done")} icon={<CheckCircle size={18} />} />
        <Kpi label="Fehlgeschlagen" value={count((j) => j.status === "failed")} icon={<WarningCircle size={18} />} />
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Card id="neuer-render" title="Neuer Render-Job" description="Video hochladen, Optionen wählen und den Render starten.">
          <RenderForm onJobCreated={handleJobCreated} />
        </Card>

        <div className="flex flex-col gap-6">
          {activeJobId && (
            <Card title="Aktueller Job">
              <JobCard key={activeJobId} jobId={activeJobId} />
            </Card>
          )}
          <Card title="Aktivität" description="Jobs der letzten 7 Tage">
            <ActivityChart jobs={jobs} />
          </Card>
        </div>
      </div>

      <section className={cardClass}>
        <div className="px-5 pb-1 pt-5 sm:px-6 sm:pt-6">
          <h2 className={titleClass}>Job-Historie</h2>
        </div>
        <JobHistory jobs={jobs} error={error} onSelect={setActiveJobId} activeId={activeJobId} />
      </section>
    </div>
  );
}
