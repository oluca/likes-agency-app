import Link from "next/link";
import { redirect } from "next/navigation";
import { EnvelopeSimple, WarningCircle } from "@phosphor-icons/react/ssr";
import { getUser } from "@/lib/dal";
import { acceptInvite } from "@/app/(app)/team/actions";
import { Logo } from "@/components/ui/logo";
import { btn, cardClass } from "@/lib/ui";

export default async function InvitePage({ params, searchParams }: PageProps<"/invite/[token]">) {
  const { token } = await params;
  const { error } = await searchParams;
  const user = await getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/invite/${token}`)}`);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-8 bg-canvas px-6">
      <Logo />
      <div className={`${cardClass} w-full max-w-sm p-6`}>
        <span className="mb-4 flex size-10 items-center justify-center rounded-lg bg-accent-soft text-accent-text">
          <EnvelopeSimple size={20} />
        </span>
        <h1 className="text-xl font-semibold tracking-tight text-fg">Einladung annehmen</h1>
        <p className="mt-1.5 text-sm text-muted">
          Angemeldet als <span className="font-medium text-fg">{user.email}</span>. Die Einladung muss an diese
          E-Mail-Adresse gerichtet sein.
        </p>
        {error && (
          <p role="alert" className="mt-4 flex items-start gap-2 rounded-lg border border-accent/50 bg-accent-soft px-3 py-2.5 text-sm text-accent-text">
            <WarningCircle size={16} weight="fill" className="mt-0.5 shrink-0" />
            Die Einladung ist ungültig, abgelaufen oder für eine andere E-Mail-Adresse.
          </p>
        )}
        <form action={acceptInvite} className="mt-6 flex items-center gap-3">
          <input type="hidden" name="token" value={token} />
          <button type="submit" className={btn("primary")}>
            Beitreten
          </button>
          <Link href="/" className={btn("ghost")}>
            Abbrechen
          </Link>
        </form>
      </div>
    </div>
  );
}
