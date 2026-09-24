import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ensureWorkspace, getActiveWorkspace, getMemberships, requireUser } from "@/lib/dal";
import { logout } from "@/app/(auth)/actions";
import { AppShell } from "@/components/shell/app-shell";
import { WorkspaceUnavailable } from "@/components/workspace-unavailable";
import { switchWorkspace } from "./team/actions";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await requireUser();
  const supabase = await createClient();
  const [memberships, active, { data: profile }] = await Promise.all([
    getMemberships(),
    getActiveWorkspace(),
    supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle(),
  ]);

  if (!active) {
    const repaired = await ensureWorkspace();
    if (repaired.ok) redirect("/");
    return <WorkspaceUnavailable cause={repaired.cause} />;
  }

  return (
    <AppShell
      email={user.email ?? ""}
      displayName={profile?.display_name ?? ""}
      workspaces={memberships}
      active={active}
      switchAction={switchWorkspace}
      logoutAction={logout}
    >
      {children}
    </AppShell>
  );
}
