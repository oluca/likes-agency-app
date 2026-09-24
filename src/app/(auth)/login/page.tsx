import Link from "next/link";
import { AuthForm } from "@/components/auth-form";
import { login } from "../actions";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next, error } = await searchParams;
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight text-fg">Anmelden</h1>
      <p className="mb-6 mt-1.5 text-sm text-muted">Willkommen zurück. Melde dich mit deinem Konto an.</p>
      {error === "auth" && (
        <p role="alert" className="mb-4 rounded-lg border border-accent/50 bg-accent-soft px-3 py-2.5 text-sm text-accent-text">
          Der Link ist ungültig oder abgelaufen. Bitte melde dich erneut an.
        </p>
      )}
      <AuthForm
        action={login}
        submitLabel="Anmelden"
        pendingLabel="Wird angemeldet…"
        hidden={{ next: typeof next === "string" ? next : "" }}
        fields={[
          { name: "email", label: "E-Mail", type: "email", autoComplete: "email" },
          { name: "password", label: "Passwort", type: "password", autoComplete: "current-password" },
        ]}
      />
      <div className="mt-6 flex justify-between text-sm text-muted">
        <Link href="/forgot-password" className="underline-offset-4 hover:text-fg hover:underline">
          Passwort vergessen?
        </Link>
        <Link href="/signup" className="font-medium text-accent-text underline-offset-4 hover:underline">
          Konto erstellen
        </Link>
      </div>
    </>
  );
}
