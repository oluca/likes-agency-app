import { cardClass, cardPad, cn, titleClass } from "@/lib/ui";

export function Card({
  title,
  description,
  id,
  className,
  children,
}: {
  title?: string;
  description?: string;
  id?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className={cn(cardClass, cardPad, className)}>
      {title && (
        <header className={description ? "mb-5" : "mb-4"}>
          <h2 className={titleClass}>{title}</h2>
          {description && <p className="mt-1 text-sm text-muted">{description}</p>}
        </header>
      )}
      {children}
    </section>
  );
}
