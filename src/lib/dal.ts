import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Role } from "@/lib/roles";

const WORKSPACE_COOKIE = "active_workspace";

const ROLE_RANK: Record<Role, number> = { member: 0, admin: 1, owner: 2 };

export type Membership = { workspaceId: string; name: string; role: Role };

export const hasRole = (ws: Membership, minRole: Role) => ROLE_RANK[ws.role] >= ROLE_RANK[minRole];

export const getUser = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data.user;
});

export async function requireUser() {
  const user = await getUser();
  if (!user) redirect("/login");
  return user;
}

async function loadMemberships(): Promise<{ memberships: Membership[]; error?: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("workspace_members")
    .select("role, workspaces(id, name)")
    .order("created_at", { ascending: true });
  if (error) console.error("loadMemberships failed:", error.message);

  const memberships = (data ?? []).flatMap((row) => {
    const ws = Array.isArray(row.workspaces) ? row.workspaces[0] : row.workspaces;
    return ws ? [{ workspaceId: ws.id, name: ws.name, role: row.role as Role }] : [];
  });
  return { memberships, error: error?.message };
}

export const getMemberships = cache(async (): Promise<Membership[]> => (await loadMemberships()).memberships);

/** The workspace selected via cookie, falling back to the first membership. */
export const getActiveWorkspace = cache(async (): Promise<Membership | null> => {
  const memberships = await getMemberships();
  const selected = (await cookies()).get(WORKSPACE_COOKIE)?.value;
  return memberships.find((m) => m.workspaceId === selected) ?? memberships[0] ?? null;
});

/** Server actions / route handlers only. */
export async function setActiveWorkspace(workspaceId: string) {
  (await cookies()).set(WORKSPACE_COOKIE, workspaceId, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
  });
}

export async function requireWorkspace(minRole: Role = "member"): Promise<Membership> {
  await requireUser();
  const ws = await getActiveWorkspace();
  if (!ws || !hasRole(ws, minRole)) redirect("/");
  return ws;
}

/**
 * Repairs accounts that exist without a workspace (e.g. created before the DB trigger).
 * Succeeds only when a fresh read proves the workspace is visible.
 */
export async function ensureWorkspace(): Promise<{ ok: true } | { ok: false; cause: string }> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("ensure_personal_workspace");
  if (error) return { ok: false, cause: error.message };
  const after = await loadMemberships();
  if (after.memberships.length > 0) return { ok: true };
  return { ok: false, cause: after.error ?? "Workspace ist nach dem Anlegen nicht lesbar." };
}
