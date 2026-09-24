"use client";

import { AuthForm } from "@/components/auth-form";
import { updateProfile } from "@/app/(app)/settings/actions";

export function ProfileForm({ defaultName }: { defaultName: string }) {
  return (
    <AuthForm
      action={updateProfile}
      submitLabel="Speichern"
      pendingLabel="Wird gespeichert…"
      variant="dark"
      fullWidth={false}
      fields={[{ name: "name", label: "Name", type: "text", autoComplete: "name", required: false, defaultValue: defaultName }]}
    />
  );
}
