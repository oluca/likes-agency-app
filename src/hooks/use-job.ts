"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, getJob } from "@/lib/api-client";
import { isFinalStatus, type Job } from "@/lib/types";

const VISIBLE_MS = 3000;
const HIDDEN_MS = 10_000;

/** Polls one job every 3 s (10 s in a background tab) until it reaches a final status. */
export function useJob(jobId: string) {
  const [job, setJob] = useState<Job | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [tick, setTick] = useState(0);
  const retry = useCallback(() => setTick((t) => t + 1), []);
  const finished = useRef(false);
  const notFound = useRef(0);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    finished.current = false;

    async function poll() {
      try {
        const current = await getJob(jobId);
        if (cancelled) return;
        setJob(current);
        setError(null);
        notFound.current = 0;
        if (isFinalStatus(current.status)) {
          finished.current = true;
          return;
        }
      } catch (err) {
        if (cancelled) return;
        const apiError = err instanceof ApiError ? err : new ApiError(0, "Job konnte nicht geladen werden.");
        setError(apiError);
        // A 404 right after an outage may be transient, so allow a few more tries before giving up.
        if (apiError.status === 404 && ++notFound.current < 5) {
          timer = setTimeout(poll, VISIBLE_MS);
          return;
        }
        // Other client errors are final; network/server errors keep retrying.
        if (apiError.status >= 400 && apiError.status < 500 && apiError.status !== 429) return;
      }
      timer = setTimeout(poll, document.hidden ? HIDDEN_MS : VISIBLE_MS);
    }

    // Coming back to a background tab: refresh immediately instead of waiting out the long interval.
    function onVisible() {
      if (!document.hidden && !finished.current) {
        clearTimeout(timer);
        poll();
      }
    }

    poll();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [jobId, tick]);

  return { job, error, retry, setJob };
}
