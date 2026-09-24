import { AuthForm } from "@/components/auth-form";
import { titleClass } from "@/lib/ui";
import { createWorkspace } from "./actions";

export function WorkspaceForm() {
  return (
    <div className="max-w-md">
      <h2 className={titleClass}>Neuen Workspace erstellen</h2>
      <p className="mb-5 mt-1 text-sm text-muted">Jeder Workspace hat eigene Jobs und Mitglieder.</p>
      <AuthForm
        action={createWorkspace}
        submitLabel="Erstellen"
        pendingLabel="Wird erstellt…"
        variant="dark"
        fullWidth={false}
        fields={[{ name: "name", label: "Name", type: "text" }]}
      />
    </div>
  );
}
