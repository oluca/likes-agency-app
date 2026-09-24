"use client";

import { useEffect, useRef, useState } from "react";
import { Warning } from "@phosphor-icons/react/ssr";
import { btn } from "@/lib/ui";

type DialogProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: React.ReactNode;
  footer: React.ReactNode;
  destructive?: boolean;
};

/** Modal on top of the native <dialog>: focus trap, Esc and inert background come from the platform. */
export function Dialog({ open, onClose, title, description, children, footer, destructive }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-md animate-fade-in rounded-xl border border-line bg-surface p-0 shadow-pop"
    >
      <div className="p-6">
        <div className="flex items-start gap-3">
          {destructive && (
            <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent-text">
              <Warning size={18} weight="bold" />
            </span>
          )}
          <div className="min-w-0">
            <h2 className="text-base font-semibold tracking-tight text-fg">{title}</h2>
            {description && <p className="mt-1.5 text-sm text-muted">{description}</p>}
          </div>
        </div>
        {children && <div className="mt-4">{children}</div>}
      </div>
      <div className="flex justify-end gap-2 border-t border-line bg-sunken px-6 py-4">{footer}</div>
    </dialog>
  );
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel,
  pending,
  destructive = true,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: string;
  confirmLabel: string;
  pending?: boolean;
  destructive?: boolean;
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      destructive={destructive}
      footer={
        <>
          <button type="button" onClick={onClose} className={btn("secondary")}>
            Zurück
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={pending}
            className={destructive ? btn("primary") : btn("dark")}
          >
            {confirmLabel}
          </button>
        </>
      }
    />
  );
}

/**
 * Drop inside a <form action={serverAction}>: renders a trigger button and a confirmation dialog whose
 * confirm button submits the surrounding form.
 */
export function ConfirmSubmit({
  label,
  title,
  description,
  confirmLabel,
  triggerClassName,
}: {
  label: string;
  title: string;
  description?: string;
  confirmLabel: string;
  triggerClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={triggerClassName ?? btn("secondary", "sm")}>
        {label}
      </button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={title}
        description={description}
        destructive
        footer={
          <>
            <button type="button" onClick={() => setOpen(false)} className={btn("secondary")}>
              Zurück
            </button>
            <button type="submit" className={btn("primary")}>
              {confirmLabel}
            </button>
          </>
        }
      />
    </>
  );
}
