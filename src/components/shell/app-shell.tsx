"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { CaretUpDown, Check, FilmSlate, GearSix, List, SignOut, UsersThree, X } from "@phosphor-icons/react/ssr";
import { Logo } from "@/components/ui/logo";
import { Menu, menuItemClass } from "@/components/ui/menu";
import { ROLE_LABEL, type Role } from "@/lib/roles";
import { cn } from "@/lib/ui";

type Workspace = { workspaceId: string; name: string; role: Role };

const NAV = [
  { href: "/", label: "Studio", icon: FilmSlate },
  { href: "/team", label: "Team", icon: UsersThree },
  { href: "/settings", label: "Einstellungen", icon: GearSix },
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({
  email,
  displayName,
  workspaces,
  active,
  switchAction,
  logoutAction,
  children,
}: {
  email: string;
  displayName: string;
  workspaces: Workspace[];
  active: Workspace;
  switchAction: (formData: FormData) => void | Promise<void>;
  logoutAction: () => void | Promise<void>;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [drawer, setDrawer] = useState(false);
  const title = NAV.find((n) => isActive(pathname, n.href))?.label ?? "Studio";
  const initial = (displayName || email).charAt(0).toUpperCase();

  useEffect(() => {
    if (!drawer) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setDrawer(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [drawer]);

  return (
    <div className="flex min-h-dvh">
      {drawer && (
        <div
          aria-hidden
          onClick={() => setDrawer(false)}
          className="fixed inset-0 z-30 animate-fade-in bg-onyx/60 lg:hidden"
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-graphite bg-onyx text-paper transition-transform duration-200 lg:translate-x-0",
          drawer ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-14 items-center justify-between px-5">
          <Link href="/" aria-label="Zum Studio">
            <Logo onDark />
          </Link>
          <button
            type="button"
            onClick={() => setDrawer(false)}
            aria-label="Menü schließen"
            className="rounded-md p-1.5 text-paper/60 hover:bg-graphite hover:text-paper lg:hidden"
          >
            <X size={18} />
          </button>
        </div>

        <nav aria-label="Hauptnavigation" className="flex flex-1 flex-col gap-1 px-3 py-4">
          {NAV.map(({ href, label, icon: Icon }) => {
            const on = isActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={on ? "page" : undefined}
                onClick={() => setDrawer(false)}
                className={cn(
                  "relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150",
                  on ? "bg-graphite text-paper" : "text-paper/65 hover:bg-graphite/60 hover:text-paper"
                )}
              >
                {on && <span className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-accent" />}
                <Icon size={18} weight={on ? "fill" : "regular"} className={on ? "text-accent" : undefined} />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-graphite p-3">
          <Menu
            label="Workspace wechseln"
            placement="top"
            triggerClassName="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors duration-150 hover:bg-graphite/60"
            trigger={
              <>
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-graphite text-sm font-semibold text-paper">
                  {active.name.charAt(0).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-paper">{active.name}</span>
                  <span className="block text-xs text-paper/55">{ROLE_LABEL[active.role]}</span>
                </span>
                <CaretUpDown size={14} className="shrink-0 text-paper/50" />
              </>
            }
          >
            <p className="px-2.5 pb-1 pt-1.5 text-xs font-medium text-muted">Workspaces</p>
            <form action={switchAction}>
              {workspaces.map((w) => (
                <button key={w.workspaceId} type="submit" name="workspaceId" value={w.workspaceId} className={menuItemClass}>
                  <span className="min-w-0 flex-1 truncate">{w.name}</span>
                  {w.workspaceId === active.workspaceId && <Check size={14} weight="bold" className="text-accent-text" />}
                </button>
              ))}
            </form>
            <div className="my-1 border-t border-line" />
            <Link href="/team" onClick={() => setDrawer(false)} className={menuItemClass}>
              <UsersThree size={16} />
              Team verwalten
            </Link>
          </Menu>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col lg:pl-64">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-line bg-canvas/85 px-4 backdrop-blur sm:px-6">
          <button
            type="button"
            onClick={() => setDrawer(true)}
            aria-label="Menü öffnen"
            className="-ml-1 rounded-lg p-2 text-fg hover:bg-sunken lg:hidden"
          >
            <List size={20} />
          </button>
          <h1 className="text-[15px] font-semibold tracking-tight text-fg">{title}</h1>

          <div className="ml-auto">
            <Menu
              label="Benutzermenü"
              align="right"
              triggerClassName="flex items-center gap-2.5 rounded-lg py-1 pl-1 pr-2 transition-colors duration-150 hover:bg-sunken"
              trigger={
                <>
                  <span className="flex size-8 items-center justify-center rounded-lg bg-onyx text-sm font-semibold text-paper dark:bg-paper dark:text-onyx">
                    {initial}
                  </span>
                  <span className="hidden max-w-40 truncate text-sm text-fg sm:block">{displayName || email}</span>
                  <CaretUpDown size={14} className="text-muted" />
                </>
              }
            >
              <div className="px-2.5 py-2">
                <p className="truncate text-sm font-medium text-fg">{displayName || email}</p>
                <p className="truncate text-xs text-muted">{email}</p>
              </div>
              <div className="my-1 border-t border-line" />
              <Link href="/settings" className={menuItemClass}>
                <GearSix size={16} />
                Einstellungen
              </Link>
              <form action={logoutAction}>
                <button type="submit" className={menuItemClass}>
                  <SignOut size={16} />
                  Abmelden
                </button>
              </form>
            </Menu>
          </div>
        </header>

        <main className="flex-1 px-4 py-6 sm:px-6 sm:py-8">
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
