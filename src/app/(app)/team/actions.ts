"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getMemberships, requireUser, setActiveWorkspace } from "@/lib/dal";
import { firstIssue, parseForm, type FormState } from "@/lib/form";

const uuid = z.string().uuid();
const email = z.string().trim().toLowerCase().pipe(z.email("Bitte eine gültige E-Mail angeben."));
const assignableRole = z.enum(["member", "admin"]);

/** RLS rejects unauthorized writes by matching zero rows; surface that instead of pretending success. */
function expectRows(
  { data, error }: { data: unknown[] | null; error: { message: string } | null },
  action: string,
) {
  if (error || !data?.length) throw new Error(`${action} fehlgeschlagen (fehlende Berechtigung?)`);
}

export async function switchWorkspace(formData: FormData) {
  await requireUser();
  const parsed = parseForm({ workspaceId: uuid }, formData);
  const memberships = await getMemberships();
  if (parsed.success && memberships.some((m) => m.workspaceId === parsed.data.workspaceId)) {
    await setActiveWorkspace(parsed.data.workspaceId);
  }
  redirect("/");
}

export async function createWorkspace(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireUser();
  const parsed = parseForm({ name: z.string().trim().min(1, "Bitte einen Namen angeben.").max(80) }, formData);
  if (!parsed.success) return { error: firstIssue(parsed.error) };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_workspace", { workspace_name: parsed.data.name });
  if (error || !data) return { error: "Workspace konnte nicht erstellt werden." };

  await setActiveWorkspace(data as string);
  redirect("/team");
}

export async function inviteMember(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = parseForm({ workspaceId: uuid, email, role: assignableRole }, formData);
  if (!parsed.success) return { error: firstIssue(parsed.error) };

  const supabase = await createClient();
  const { error } = await supabase.from("workspace_invites").insert({
    workspace_id: parsed.data.workspaceId,
    email: parsed.data.email,
    role: parsed.data.role,
    invited_by: user.id,
  });
  if (error) return { error: "Einladung konnte nicht erstellt werden (fehlende Berechtigung?)." };

  revalidatePath("/team");
  return { message: "Einladung erstellt. Kopiere den Link aus der Liste unten und sende ihn weiter." };
}

export async function revokeInvite(formData: FormData) {
  await requireUser();
  const parsed = parseForm({ inviteId: uuid }, formData);
  if (!parsed.success) return;
  const supabase = await createClient();
  expectRows(
    await supabase.from("workspace_invites").delete().eq("id", parsed.data.inviteId).select("id"),
    "Widerrufen",
  );
  revalidatePath("/team");
}

export async function removeMember(formData: FormData) {
  await requireUser();
  const parsed = parseForm({ workspaceId: uuid, userId: uuid }, formData);
  if (!parsed.success) return;
  const supabase = await createClient();
  expectRows(
    await supabase
      .from("workspace_members")
      .delete()
      .eq("workspace_id", parsed.data.workspaceId)
      .eq("user_id", parsed.data.userId)
      .select("user_id"),
    "Entfernen",
  );
  revalidatePath("/team");
}

export async function changeRole(formData: FormData) {
  await requireUser();
  const parsed = parseForm({ workspaceId: uuid, userId: uuid, role: assignableRole }, formData);
  if (!parsed.success) return;
  const supabase = await createClient();
  expectRows(
    await supabase
      .from("workspace_members")
      .update({ role: parsed.data.role })
      .eq("workspace_id", parsed.data.workspaceId)
      .eq("user_id", parsed.data.userId)
      .select("user_id"),
    "Rollenänderung",
  );
  revalidatePath("/team");
}

export async function acceptInvite(formData: FormData) {
  await requireUser();
  const parsed = parseForm({ token: z.string().regex(/^[a-f0-9]{16,128}$/) }, formData);
  if (!parsed.success) redirect("/");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("accept_invite", { invite_token: parsed.data.token });
  if (error || !data) redirect(`/invite/${parsed.data.token}?error=1`);
  await setActiveWorkspace(data as string);
  redirect("/");
}
