import type { CreateJobResponse, Job, JobStatus, RenderParams } from "@/lib/types";

export class ApiError extends Error {
  status: number;
  detail: unknown;

  constructor(status: number, message: string, detail?: unknown) {
    super(message);
    this.status = status;
    this.detail = detail;
  }
}

async function parseErrorMessage(response: Response): Promise<string> {
  try {
    const data = await response.json();
    if (typeof data?.detail === "string") return data.detail;
    if (Array.isArray(data?.detail)) {
      return data.detail
        .map((d: { loc?: string[]; msg?: string }) =>
          d?.msg ? `${d.loc?.join(".") ?? "Feld"}: ${d.msg}` : JSON.stringify(d)
        )
        .join("; ");
    }
    return JSON.stringify(data);
  } catch {
    return response.statusText || `HTTP ${response.status}`;
  }
}

async function handle<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const message = await parseErrorMessage(response.clone());
    if (response.status === 422) {
      throw new ApiError(422, `Validierungsfehler: ${message}`);
    }
    if (response.status === 409) {
      throw new ApiError(409, `Job ist noch nicht fertig: ${message}`);
    }
    throw new ApiError(response.status, message);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export async function createJob(file: File, params: RenderParams): Promise<CreateJobResponse> {
  const formData = new FormData();
  formData.set("file", file);
  formData.set("params", JSON.stringify(params));

  const response = await fetch("/api/jobs", {
    method: "POST",
    body: formData,
  });
  return handle<CreateJobResponse>(response);
}

export async function getJob(id: string): Promise<Job> {
  const response = await fetch(`/api/jobs/${id}`, { cache: "no-store" });
  return handle<Job>(response);
}

export async function getJobLog(id: string): Promise<{ log: string }> {
  const response = await fetch(`/api/jobs/${id}/log`, { cache: "no-store" });
  return handle<{ log: string }>(response);
}

export async function listJobs(status?: JobStatus): Promise<Job[]> {
  const query = status ? `?status=${encodeURIComponent(status)}` : "";
  const response = await fetch(`/api/jobs${query}`, { cache: "no-store" });
  return handle<Job[]>(response);
}

export async function cancelJob(id: string): Promise<void> {
  const response = await fetch(`/api/jobs/${id}/cancel`, { method: "POST" });
  await handle<unknown>(response);
}

export function downloadJobUrl(id: string): string {
  return `/api/jobs/${id}/download`;
}
