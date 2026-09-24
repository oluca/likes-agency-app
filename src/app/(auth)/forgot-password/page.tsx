import Link from "next/link";
import { AuthForm } from "@/components/auth-form";
import { requestPasswordReset } from "../actions";

export default function ForgotPasswordPage() {
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight text-fg">Passwort zurücksetzen</h1>
      <p className="mb-6 mt-1.5 text-sm text-muted">Wir senden dir einen Link zum Zurücksetzen per E-Mail.</p>
      <AuthForm
        action={requestPasswordReset}
        submitLabel="Link senden"
        pendingLabel="Wird gesendet…"
        fields={[{ name: "email", label: "E-Mail", type: "email", autoComplete: "email" }]}
      />
      <p className="mt-6 text-sm">
        <Link href="/login" className="text-muted underline-offset-4 hover:text-fg hover:underline">
          Zurück zur Anmeldung
        </Link>
      </p>
    </>
  );
}
