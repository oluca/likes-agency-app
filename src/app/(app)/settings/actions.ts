"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/dal";
import { firstIssue, parseForm, type FormState } from "@/lib/form";

export async function updateProfile(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = parseForm({ name: z.string().trim().max(80, "Name ist zu lang.") }, formData);
  if (!parsed.success) return { error: firstIssue(parsed.error) };
  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ display_name: parsed.data.name }).eq("id", user.id);
  if (error) return { error: "Profil konnte nicht gespeichert werden." };
  revalidatePath("/", "layout");
  return { message: "Gespeichert." };
}

export async function changePassword(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireUser();
  const parsed = parseForm({ password: z.string().min(8, "Das Passwort muss mindestens 8 Zeichen lang sein.") }, formData);
  if (!parsed.success) return { error: firstIssue(parsed.error) };
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { error: "Passwort konnte nicht geändert werden: " + error.message };
  return { message: "Passwort geändert." };
}
