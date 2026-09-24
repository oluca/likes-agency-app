import { ConfirmSubmit } from "@/components/ui/dialog";
import { ROLE_LABEL, type Role } from "@/lib/roles";
import { btn, inputClass, tableCell, tableHead } from "@/lib/ui";
import { changeRole, removeMember } from "./actions";

export type MemberRow = {
  userId: string;
  role: Role;
  email: string | null;
  displayName: string | null;
};

export function MembersTable({
  members,
  workspace,
  currentUserId,
  canManage,
}: {
  members: MemberRow[];
  workspace: { workspaceId: string; name: string };
  currentUserId: string;
  canManage: boolean;
}) {
  return (
    <div className="relative -mx-5 overflow-x-auto sm:-mx-6">
      <table className="w-full min-w-[520px] border-collapse">
        <thead className="bg-sunken">
          <tr>
            <th scope="col" className={tableHead}>
              Mitglied
            </th>
            <th scope="col" className={tableHead}>
              Rolle
            </th>
            <th scope="col" className="w-32">
              <span className="sr-only">Aktionen</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line border-y border-line">
          {members.map((m) => {
            const isSelf = m.userId === currentUserId;
            const editable = canManage && m.role !== "owner" && !isSelf;
            const name = m.displayName || m.email || m.userId;
            const identity = (
              <>
                <input type="hidden" name="workspaceId" value={workspace.workspaceId} />
                <input type="hidden" name="userId" value={m.userId} />
              </>
            );
            return (
              <tr key={m.userId}>
                <td className={tableCell}>
                  <div className="flex items-center gap-3">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-sunken text-sm font-semibold text-fg">
                      {name.charAt(0).toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-medium text-fg">
                        {name}
                        {isSelf && <span className="ml-2 text-xs font-normal text-muted">Du</span>}
                      </p>
                      <p className="truncate text-[13px] text-muted">{m.email}</p>
                    </div>
                  </div>
                </td>
                <td className={tableCell}>
                  {editable ? (
                    <form action={changeRole} className="flex items-center gap-2">
                      {identity}
                      <select
                        name="role"
                        defaultValue={m.role}
                        aria-label={`Rolle von ${name}`}
                        className={`${inputClass} !h-8 !w-auto`}
                      >
                        <option value="member">{ROLE_LABEL.member}</option>
                        <option value="admin">{ROLE_LABEL.admin}</option>
                      </select>
                      <button type="submit" className={btn("secondary", "sm")}>
                        Ändern
                      </button>
                    </form>
                  ) : (
                    <span className="rounded-md border border-line bg-sunken px-2 py-0.5 text-xs font-medium text-muted">
                      {ROLE_LABEL[m.role]}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  {(editable || (isSelf && m.role !== "owner")) && (
                    <form action={removeMember}>
                      {identity}
                      <ConfirmSubmit
                        label={isSelf ? "Verlassen" : "Entfernen"}
                        title={isSelf ? "Workspace verlassen?" : "Mitglied entfernen?"}
                        description={
                          isSelf
                            ? `Du verlierst den Zugriff auf ${workspace.name} und dessen Jobs.`
                            : `${name} verliert den Zugriff auf ${workspace.name}.`
                        }
                        confirmLabel={isSelf ? "Verlassen" : "Entfernen"}
                        triggerClassName={btn("danger", "sm")}
                      />
                    </form>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
