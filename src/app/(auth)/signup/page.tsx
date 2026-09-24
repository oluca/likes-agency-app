import Link from "next/link";
import { AuthForm } from "@/components/auth-form";
import { signup } from "../actions";

export default function SignupPage() {
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight text-fg">Konto erstellen</h1>
      <p className="mb-6 mt-1.5 text-sm text-muted">Dein persönlicher Workspace wird automatisch angelegt.</p>
      <AuthForm
        action={signup}
        submitLabel="Registrieren"
        pendingLabel="Wird erstellt…"
        fields={[
          { name: "name", label: "Name", type: "text", autoComplete: "name", required: false },
          { name: "email", label: "E-Mail", type: "email", autoComplete: "email" },
          { name: "password", label: "Passwort (min. 8 Zeichen)", type: "password", autoComplete: "new-password" },
        ]}
      />
      <p className="mt-6 text-sm text-muted">
        Schon ein Konto?{" "}
        <Link href="/login" className="font-medium text-accent-text underline-offset-4 hover:underline">
          Anmelden
        </Link>
      </p>
    </>
  );
}
