import { EnvelopeSimple } from "@phosphor-icons/react/ssr";
import { AuthForm } from "@/components/auth-form";
import { CopyButton } from "@/components/ui/copy-button";
import { ConfirmSubmit } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { ROLE_LABEL, type Role } from "@/lib/roles";
import { btn, titleClass } from "@/lib/ui";
import { inviteMember, revokeInvite } from "./actions";

const DATE = new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });

export type InviteRow = { id: string; email: string; role: Role; token: string; expires_at: string };

export function InvitesPanel({
  workspaceId,
  invites,
  origin,
}: {
  workspaceId: string;
  invites: InviteRow[];
  origin: string;
}) {
  return (
    <div className="flex flex-col gap-8">
      <div className="max-w-md">
        <h2 className={titleClass}>Mitglied einladen</h2>
        <p className="mb-5 mt-1 text-sm text-muted">Die Einladung ist 7 Tage gültig und an die E-Mail-Adresse gebunden.</p>
        <AuthForm
          action={inviteMember}
          submitLabel="Einladung erstellen"
          pendingLabel="Wird erstellt…"
          variant="dark"
          fullWidth={false}
          hidden={{ workspaceId }}
          fields={[
            { name: "email", label: "E-Mail", type: "email" },
            {
              name: "role",
              label: "Rolle",
              type: "select",
              options: [
                { value: "member", label: ROLE_LABEL.member },
                { value: "admin", label: ROLE_LABEL.admin },
              ],
            },
          ]}
        />
      </div>

      <div>
        <h2 className={`${titleClass} mb-3`}>Offene Einladungen</h2>
        {invites.length === 0 ? (
          <div className="rounded-xl border border-dashed border-line-strong">
            <EmptyState
              icon={<EnvelopeSimple size={22} />}
              title="Keine offenen Einladungen"
              description="Erstellte Einladungen erscheinen hier mit ihrem Link."
            />
          </div>
        ) : (
          <ul className="divide-y divide-line rounded-xl border border-line">
            {invites.map((i) => {
              const link = `${origin}/invite/${i.token}`;
              return (
                <li key={i.id} className="flex flex-col gap-3 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-fg">{i.email}</p>
                      <p className="text-[13px] text-muted">
                        {ROLE_LABEL[i.role]}, gültig bis {DATE.format(new Date(i.expires_at))}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <CopyButton value={link} />
                      <form action={revokeInvite}>
                        <input type="hidden" name="inviteId" value={i.id} />
                        <ConfirmSubmit
                          label="Widerrufen"
                          title="Einladung widerrufen?"
                          description={`Der Link für ${i.email} funktioniert danach nicht mehr.`}
                          confirmLabel="Widerrufen"
                          triggerClassName={btn("danger", "sm")}
                        />
                      </form>
                    </div>
                  </div>
                  <code className="break-all rounded-lg border border-line bg-sunken px-3 py-2 font-mono text-xs text-muted">{link}</code>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
