import { Play } from "@phosphor-icons/react/ssr";

export function Logo({ onDark = false }: { onDark?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <span className="flex size-8 items-center justify-center rounded-lg bg-accent text-accent-fg">
        <Play size={16} weight="fill" />
      </span>
      <span className={`text-[15px] font-semibold tracking-tight ${onDark ? "text-paper" : "text-fg"}`}>
        Shortform Render
      </span>
    </span>
  );
}
