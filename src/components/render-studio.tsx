"use client";

import { useState } from "react";
import { RenderForm } from "@/components/render-form";
import { JobCard } from "@/components/job-card";
import { JobHistory } from "@/components/job-history";

export function RenderStudio() {
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  function handleJobCreated(jobId: string) {
    setActiveJobId(jobId);
    setRefreshKey((k) => k + 1);
  }

  return (
    <div className="grid w-full max-w-5xl grid-cols-1 gap-8 lg:grid-cols-[2fr_1fr]">
      <div className="flex flex-col gap-6">
        <section className="rounded-lg border border-zinc-200 p-5 dark:border-zinc-800">
          <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Neuer Render-Job
          </h2>
          <RenderForm onJobCreated={handleJobCreated} />
        </section>

        {activeJobId && (
          <section className="rounded-lg border border-zinc-200 p-5 dark:border-zinc-800">
            <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              Aktueller Job
            </h2>
            <JobCard jobId={activeJobId} />
          </section>
        )}
      </div>

      <section className="rounded-lg border border-zinc-200 p-5 dark:border-zinc-800">
        <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          Job-Historie
        </h2>
        <JobHistory onSelect={setActiveJobId} refreshKey={refreshKey} />
      </section>
    </div>
  );
}
