"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getOrigin } from "@/lib/origin";
import { firstIssue, parseForm, type FormState } from "@/lib/form";

const email = z.string().trim().toLowerCase().pipe(z.email("Bitte eine gültige E-Mail angeben."));
const password = z.string().min(8, "Das Passwort muss mindestens 8 Zeichen lang sein.");

function safeNext(value: FormDataEntryValue | null): string {
  const next = typeof value === "string" ? value : "";
  const ok = next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\");
  return ok ? next : "/";
}

export async function login(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = parseForm({ email, password: z.string().min(1, "Bitte Passwort eingeben.") }, formData);
  if (!parsed.success) return { error: firstIssue(parsed.error) };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { error: "E-Mail oder Passwort ist falsch." };

  redirect(safeNext(formData.get("next")));
}

export async function signup(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = parseForm(
    { email, password, name: z.string().trim().max(80).nullable().transform((v) => v ?? "") },
    formData,
  );
  if (!parsed.success) return { error: firstIssue(parsed.error) };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { display_name: parsed.data.name },
      emailRedirectTo: `${await getOrigin()}/auth/callback`,
    },
  });
  if (error) return { error: "Registrierung fehlgeschlagen: " + error.message };

  if (data.session) redirect("/");
  return { message: "Fast geschafft! Bitte bestätige deine E-Mail-Adresse über den Link, den wir dir geschickt haben." };
}

export async function requestPasswordReset(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = parseForm({ email }, formData);
  if (!parsed.success) return { error: firstIssue(parsed.error) };

  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${await getOrigin()}/auth/callback?next=/settings`,
  });
  // Same answer whether or not the account exists.
  return { message: "Falls ein Konto existiert, haben wir dir einen Link zum Zurücksetzen geschickt." };
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
