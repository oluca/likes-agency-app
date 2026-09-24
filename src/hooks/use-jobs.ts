"use client";

import { useCallback, useEffect, useState } from "react";
import { listJobs, ApiError } from "@/lib/api-client";
import { isActiveJob, type Job } from "@/lib/types";

const ACTIVE_INTERVAL_MS = 2000;
const IDLE_INTERVAL_MS = 60000;

/** Polls the job list (fast while something is running) and exposes `refresh` to poll immediately. */
export function useJobs() {
  const [jobs, setJobs] = useState<Job[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  useEffect(() => {
    let cancelled = false;
    let timeout: ReturnType<typeof setTimeout>;

    async function load() {
      let delay = IDLE_INTERVAL_MS;
      try {
        const result = await listJobs();
        if (cancelled) return;
        if (result.some(isActiveJob)) delay = ACTIVE_INTERVAL_MS;
        setJobs([...result].sort((a, b) => b.created_at.localeCompare(a.created_at)));
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

  return { jobs, error, refresh };
}
