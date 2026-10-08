const KEY = "likes.myJobs";
const MAX = 50;

function read(): string[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

/** Job ids started from this browser (newest first). The server list stays the source of truth across devices. */
export function getMyJobIds(): string[] {
  return read();
}

export function rememberJob(id: string): void {
  try {
    localStorage.setItem(KEY, JSON.stringify([id, ...read().filter((x) => x !== id)].slice(0, MAX)));
  } catch {
    // storage unavailable (private mode, quota): the server-side list still works
  }
}
