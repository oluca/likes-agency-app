"use client";

import { Copy } from "@phosphor-icons/react/ssr";
import { btn } from "@/lib/ui";
import { useToast } from "@/components/ui/toast";

export function CopyButton({ value, label = "Link kopieren" }: { value: string; label?: string }) {
  const toast = useToast();
  return (
    <button
      type="button"
      className={btn("secondary", "sm")}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          toast({ tone: "success", title: "Link kopiert" });
        } catch {
          toast({ tone: "error", title: "Kopieren nicht möglich", description: "Bitte den Link manuell markieren." });
        }
      }}
    >
      <Copy size={14} weight="bold" />
      {label}
    </button>
  );
}
