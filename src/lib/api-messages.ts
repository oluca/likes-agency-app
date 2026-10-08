/** Maps API status codes to German, end-user friendly messages. `detail` is only used for 422. */
export function messageForStatus(status: number, detail?: string): string {
  switch (status) {
    case 401:
      return "Der Dienst ist nicht richtig eingerichtet (ungültiger API-Schlüssel). Bitte melde dich bei den Administratoren.";
    case 404:
      return "Dieser Job ist unbekannt.";
    case 409:
      return "Der Job ist noch nicht fertig.";
    case 410:
      return "Das Ergebnis ist abgelaufen und wurde gelöscht. Bitte neu rendern.";
    case 413:
      return "Die Datei ist zu groß.";
    case 422:
      return detail
        ? `Das Video oder die Einstellungen werden nicht akzeptiert: ${detail}`
        : "Das ist kein gültiges Video, es ist zu lang (max. 30 Minuten) oder die Einstellungen sind ungültig.";
    case 429:
      return "Bitte warten: Es laufen schon zu viele Jobs (max. 3) oder es gab zu viele Uploads in der letzten Stunde (max. 30).";
    default:
      if (status >= 500) return "Der Render-Dienst hat gerade ein Problem. Bitte versuche es gleich noch einmal.";
      return `Unerwarteter Fehler (${status}).`;
  }
}

export const NETWORK_ERROR_MESSAGE =
  "Der Server ist nicht erreichbar. Bitte prüfe deine Verbindung und versuche es erneut.";

/** Whether offering a "Erneut versuchen" button makes sense. */
export function isRetryable(status: number): boolean {
  return status === 0 || status === 429 || status >= 500;
}

/** FastAPI `detail` may be a string or a list of validation errors. */
export function detailText(detail: unknown): string | undefined {
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((d: { loc?: unknown[]; msg?: string }) => (d?.msg ? `${(d.loc ?? []).slice(1).join(".")} ${d.msg}`.trim() : ""))
      .filter(Boolean)
      .join("; ");
  }
  return undefined;
}
