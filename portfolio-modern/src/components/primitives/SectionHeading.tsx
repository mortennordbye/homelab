import { cn } from "@/lib/cn";

type Props = {
  eyebrow?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  align?: "left" | "between";
  cta?: React.ReactNode;
};

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
  cta,
}: Props) {
  return (
    <div
      className={cn(
        "flex flex-col gap-6",
        align === "between" && "md:flex-row md:items-end md:justify-between md:gap-12",
      )}
    >
      <div className="max-w-2xl">
        {eyebrow && (
          <p className="font-display text-xs uppercase tracking-[0.2em] text-fg-3">
            {eyebrow}
          </p>
        )}
        <h2 className={cn("text-h1 font-display text-fg", eyebrow ? "mt-5" : "")}>{title}</h2>
        {description && (
          <p className="mt-4 max-w-xl text-fg-2">{description}</p>
        )}
      </div>
      {cta && <div className="shrink-0">{cta}</div>}
    </div>
  );
}
