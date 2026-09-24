"use client";

import { useId, useRef, useState } from "react";
import { cn } from "@/lib/ui";

export type TabItem = { id: string; label: string; content: React.ReactNode; badge?: string | number };

/** All panels stay mounted (only hidden) so form state survives tab switches. */
export function Tabs({ tabs, defaultId, className }: { tabs: TabItem[]; defaultId?: string; className?: string }) {
  const [active, setActive] = useState(defaultId ?? tabs[0].id);
  const uid = useId();
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});

  function onKeyDown(e: React.KeyboardEvent, index: number) {
    const dir = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!dir) return;
    e.preventDefault();
    const next = tabs[(index + dir + tabs.length) % tabs.length];
    setActive(next.id);
    refs.current[next.id]?.focus();
  }

  return (
    <div className={className}>
      <div role="tablist" className="flex gap-1 overflow-x-auto border-b border-line">
        {tabs.map((t, i) => {
          const selected = t.id === active;
          return (
            <button
              key={t.id}
              ref={(el) => {
                refs.current[t.id] = el;
              }}
              type="button"
              role="tab"
              id={`${uid}-tab-${t.id}`}
              aria-selected={selected}
              aria-controls={`${uid}-panel-${t.id}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setActive(t.id)}
              onKeyDown={(e) => onKeyDown(e, i)}
              className={cn(
                "-mb-px flex items-center gap-2 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition-colors duration-150",
                selected ? "border-accent text-fg" : "border-transparent text-muted hover:text-fg"
              )}
            >
              {t.label}
              {t.badge !== undefined && (
                <span className="tabular rounded-md bg-sunken px-1.5 py-0.5 text-xs text-muted">{t.badge}</span>
              )}
            </button>
          );
        })}
      </div>
      {tabs.map((t) => (
        <div
          key={t.id}
          role="tabpanel"
          id={`${uid}-panel-${t.id}`}
          aria-labelledby={`${uid}-tab-${t.id}`}
          hidden={t.id !== active}
          className="pt-5"
        >
          {t.content}
        </div>
      ))}
    </div>
  );
}
