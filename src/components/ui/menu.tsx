"use client";

import { useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/ui";

export const menuItemClass =
  "flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm text-fg transition-colors duration-150 hover:bg-sunken focus-visible:bg-sunken";

export function Menu({
  trigger,
  children,
  align = "left",
  placement = "bottom",
  triggerClassName,
  label,
}: {
  trigger: React.ReactNode;
  children: React.ReactNode;
  align?: "left" | "right";
  placement?: "bottom" | "top";
  triggerClassName?: string;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const id = useId();

  useEffect(() => {
    if (!open) return;
    function onPointer(e: MouseEvent) {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={id}
        aria-label={label}
        onClick={() => setOpen((o) => !o)}
        className={triggerClassName}
      >
        {trigger}
      </button>
      <div
        id={id}
        role="menu"
        hidden={!open}
        onClick={() => setOpen(false)}
        className={cn(
          "absolute z-40 min-w-56 animate-fade-in rounded-xl border border-line bg-surface p-1.5 shadow-pop",
          align === "right" ? "right-0" : "left-0",
          placement === "top" ? "bottom-full mb-2" : "top-full mt-2"
        )}
      >
        {children}
      </div>
    </div>
  );
}
