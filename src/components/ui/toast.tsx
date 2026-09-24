"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { CheckCircle, Info, WarningCircle, X } from "@phosphor-icons/react/ssr";

type Tone = "success" | "error" | "info";
type Toast = { id: number; tone: Tone; title: string; description?: string };
type Push = (t: { tone?: Tone; title: string; description?: string }) => void;

const ToastContext = createContext<Push>(() => {});

export function useToast() {
  return useContext(ToastContext);
}

const ICON = { success: CheckCircle, error: WarningCircle, info: Info } as const;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((all) => all.filter((t) => t.id !== id));
  }, []);

  const push = useCallback<Push>(
    ({ tone = "info", title, description }) => {
      const id = nextId.current++;
      setToasts((all) => [...all.slice(-3), { id, tone, title, description }]);
      setTimeout(() => dismiss(id), tone === "error" ? 7000 : 4000);
    },
    [dismiss]
  );

  const value = useMemo(() => push, [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex flex-col items-center gap-2 p-4 sm:items-end sm:p-6"
      >
        {toasts.map((t) => {
          const Icon = ICON[t.tone];
          return (
            <div
              key={t.id}
              role={t.tone === "error" ? "alert" : "status"}
              className="pointer-events-auto flex w-full max-w-sm animate-toast-in items-start gap-3 rounded-xl border border-graphite bg-onyx p-3.5 pr-2.5 text-paper shadow-pop"
            >
              <Icon
                size={20}
                weight="fill"
                className={t.tone === "error" ? "mt-0.5 shrink-0 text-accent" : "mt-0.5 shrink-0 text-accent"}
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{t.title}</p>
                {t.description && <p className="mt-0.5 text-[13px] text-paper/70">{t.description}</p>}
              </div>
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                aria-label="Schließen"
                className="rounded-md p-1 text-paper/60 transition-colors duration-150 hover:bg-graphite hover:text-paper"
              >
                <X size={16} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
