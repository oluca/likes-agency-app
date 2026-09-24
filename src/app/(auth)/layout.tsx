import Link from "next/link";
import { Check } from "@phosphor-icons/react/ssr";
import { Logo } from "@/components/ui/logo";

const POINTS = [
  "Stille schneiden, Zooms und Sound-Effekte in einem Durchlauf",
  "Untertitel mit Auto-Betonung und eigenen Style-Presets",
  "Workspaces und Rollen für dein ganzes Team",
];

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <aside className="hidden flex-col justify-between border-r border-graphite bg-onyx p-12 text-paper lg:flex">
        <Logo onDark />
        <div className="max-w-md">
          <h2 className="text-3xl font-semibold leading-tight tracking-tight">
            Shortform-Videos rendern, ohne Schnittprogramm.
          </h2>
          <ul className="mt-8 flex flex-col gap-4">
            {POINTS.map((p) => (
              <li key={p} className="flex items-start gap-3 text-[15px] text-paper/75">
                <Check size={18} weight="bold" className="mt-0.5 shrink-0 text-accent" />
                {p}
              </li>
            ))}
          </ul>
        </div>
        <span aria-hidden />
      </aside>

      <main className="flex flex-col justify-center bg-canvas px-6 py-10 sm:px-12">
        <Link href="/login" className="mb-10 lg:hidden" aria-label="Shortform Render">
          <Logo />
        </Link>
        <div className="mx-auto w-full max-w-sm">{children}</div>
      </main>
    </div>
  );
}
