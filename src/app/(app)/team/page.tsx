import { hasRole, requireUser, requireWorkspace } from "@/lib/dal";
import { getOrigin } from "@/lib/origin";
import type { Role } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Tabs } from "@/components/ui/tabs";
import { InvitesPanel, type InviteRow } from "./invites-panel";
import { MembersTable } from "./members-table";
import { WorkspaceForm } from "./workspace-form";

export default async function TeamPage() {
  const user = await requireUser();
  const ws = await requireWorkspace();
  const canManage = hasRole(ws, "admin");
  const supabase = await createClient();

  const { data: members } = await supabase
    .from("workspace_members")
    .select("user_id, role")
    .eq("workspace_id", ws.workspaceId)
    .order("created_at");

  const [{ data: profiles }, { data: invites }, origin] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, email, display_name")
      .in("id", (members ?? []).map((m) => m.user_id)),
    canManage
      ? supabase
          .from("workspace_invites")
          .select("id, email, role, token, expires_at")
          .eq("workspace_id", ws.workspaceId)
          .is("accepted_at", null)
          .gt("expires_at", new Date().toISOString())
          .order("created_at", { ascending: false })
      : { data: [] },
    getOrigin(),
  ]);

  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));
  const memberRows = (members ?? []).map((m) => ({
    userId: m.user_id,
    role: m.role as Role,
    email: profileById.get(m.user_id)?.email ?? null,
    displayName: profileById.get(m.user_id)?.display_name ?? null,
  }));
  const inviteRows = (invites ?? []) as InviteRow[];

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-fg">{ws.name}</h2>
        <p className="mt-1 text-sm text-muted">Verwalte Mitglieder, Rollen und Einladungen dieses Workspaces.</p>
      </div>
      <Card>
        <Tabs
          tabs={[
            {
              id: "members",
              label: "Mitglieder",
              badge: memberRows.length,
              content: (
                <MembersTable members={memberRows} workspace={ws} currentUserId={user.id} canManage={canManage} />
              ),
            },
            ...(canManage
              ? [
                  {
                    id: "invites",
                    label: "Einladungen",
                    badge: inviteRows.length,
                    content: <InvitesPanel workspaceId={ws.workspaceId} invites={inviteRows} origin={origin} />,
                  },
                ]
              : []),
            { id: "workspace", label: "Workspace", content: <WorkspaceForm /> },
          ]}
        />
      </Card>
    </div>
  );
}
