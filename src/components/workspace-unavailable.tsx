export function WorkspaceUnavailable({ cause }: { cause: string }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-canvas p-6 text-center">
      <p role="alert" className="max-w-md text-sm text-fg">
        Dein Workspace konnte nicht geladen werden. Bitte führe die Migrationen in supabase/migrations aus
        (0001_init.sql, 0002_ensure_workspace.sql, 0003_grants.sql).
      </p>
      <code className="max-w-md break-words rounded-lg border border-line bg-sunken px-3 py-2 text-xs text-muted">
        {cause}
      </code>
    </div>
  );
}
