// Env names follow the API contract (API_BASE_URL / API_KEY); the older SHORTFORM_* names still work.
function getBaseUrl(): string {
  const url = process.env.API_BASE_URL ?? process.env.SHORTFORM_API_URL;
  if (!url) {
    throw new Error("API_BASE_URL is not configured");
  }
  return url.replace(/\/+$/, "");
}

function getApiKey(): string {
  const key = process.env.API_KEY ?? process.env.SHORTFORM_API_KEY;
  if (!key) {
    throw new Error("API_KEY is not configured");
  }
  return key;
}

export function renderApiUrl(path: string): string {
  return `${getBaseUrl()}${path}`;
}

export function renderApiHeaders(extra?: HeadersInit): Headers {
  const headers = new Headers(extra);
  headers.set("X-API-Key", getApiKey());
  return headers;
}

/** Upload limit in bytes (MAX_UPLOAD_MB, default 500). */
export function maxUploadBytes(): number {
  const mb = Number(process.env.MAX_UPLOAD_MB);
  return (Number.isFinite(mb) && mb > 0 ? mb : 500) * 1024 * 1024;
}

/** Calls the render API; network failures become a synthetic 502 so routes can forward them like any upstream error. */
export async function callUpstream(path: string, init: RequestInit & { duplex?: "half" } = {}): Promise<Response> {
  try {
    return await fetch(renderApiUrl(path), { cache: "no-store", ...init, headers: renderApiHeaders(init.headers) });
  } catch (err) {
    console.error(`Render API unreachable (${path}):`, err);
    return Response.json({ detail: "Render-Dienst nicht erreichbar" }, { status: 502 });
  }
}
