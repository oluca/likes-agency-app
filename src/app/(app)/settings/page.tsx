import { requireUser } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import { AuthForm } from "@/components/auth-form";
import { ProfileForm } from "@/components/profile-form";
import { Tabs } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { titleClass } from "@/lib/ui";
import { changePassword } from "./actions";

export default async function SettingsPage() {
  const user = await requireUser();
  const supabase = await createClient();
  const { data: profile } = await supabase.from("profiles").select("display_name").eq("id", user.id).single();

  return (
    <div className="mx-auto w-full max-w-2xl">
      <Card>
        <Tabs
          tabs={[
            {
              id: "profile",
              label: "Profil",
              content: (
                <div className="flex max-w-sm flex-col gap-5">
                  <div>
                    <p className="text-[13px] text-muted">E-Mail</p>
                    <p className="mt-0.5 text-sm font-medium text-fg">{user.email}</p>
                  </div>
                  <ProfileForm defaultName={profile?.display_name ?? ""} />
                </div>
              ),
            },
            {
              id: "security",
              label: "Sicherheit",
              content: (
                <div className="max-w-sm">
                  <h2 className={titleClass}>Passwort ändern</h2>
                  <p className="mb-5 mt-1 text-sm text-muted">Verwende mindestens 8 Zeichen.</p>
                  <AuthForm
                    action={changePassword}
                    submitLabel="Passwort ändern"
                    pendingLabel="Wird gespeichert…"
                    variant="dark"
                    fullWidth={false}
                    fields={[{ name: "password", label: "Neues Passwort", type: "password", autoComplete: "new-password" }]}
                  />
                </div>
              ),
            },
          ]}
        />
      </Card>
    </div>
  );
}
