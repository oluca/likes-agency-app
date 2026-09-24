/*
  Shared class recipes. One system: 8px controls, 12px cards, 150ms transitions, rose focus ring.
*/
export function cn(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

const btnBase =
  "inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-lg font-medium transition-[background-color,border-color,color,transform] duration-150 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50";

const btnSize = {
  sm: "h-8 px-3 text-[13px]",
  md: "h-10 px-4 text-sm",
} as const;

const btnVariant = {
  primary: "bg-accent text-accent-fg hover:brightness-95",
  secondary: "border border-line-strong bg-surface text-fg hover:bg-sunken",
  ghost: "text-muted hover:bg-sunken hover:text-fg",
  danger: "border border-accent/60 bg-surface text-accent-text hover:bg-accent-soft",
  dark: "bg-onyx text-paper hover:bg-graphite dark:bg-paper dark:text-onyx dark:hover:brightness-90",
} as const;

export function btn(variant: keyof typeof btnVariant = "primary", size: keyof typeof btnSize = "md") {
  return cn(btnBase, btnSize[size], btnVariant[variant]);
}

export const inputClass =
  "h-10 w-full rounded-lg border border-line-strong bg-surface px-3 text-sm text-fg placeholder:text-muted/80 transition-colors duration-150 hover:border-fg/40 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30 disabled:opacity-50";
export const labelClass = "mb-1.5 block text-[13px] font-medium text-fg";
export const helpClass = "mt-1.5 text-xs text-muted";
export const cardClass = "rounded-xl border border-line bg-surface shadow-card";
export const cardPad = "p-5 sm:p-6";
export const titleClass = "text-[15px] font-semibold tracking-tight text-fg";
export const tableHead = "px-4 py-2.5 text-left text-xs font-medium text-muted";
export const tableCell = "px-4 py-3 text-sm";
