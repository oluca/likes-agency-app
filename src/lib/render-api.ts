function getBaseUrl(): string {
  const url = process.env.SHORTFORM_API_URL;
  if (!url) {
    throw new Error("SHORTFORM_API_URL is not configured");
  }
  return url.replace(/\/+$/, "");
}

function getApiKey(): string {
  const key = process.env.SHORTFORM_API_KEY;
  if (!key) {
    throw new Error("SHORTFORM_API_KEY is not configured");
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
