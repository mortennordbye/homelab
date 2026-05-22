import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { SectionHeading } from "./SectionHeading";

type Width = "wide" | "prose" | "readable";

const widths: Record<Width, string> = {
  wide: "max-w-[var(--container-wide)]",
  prose: "max-w-[var(--container-prose)]",
  readable: "max-w-[var(--container-readable)]",
};

export function Section({
  id,
  eyebrow,
  heading,
  description,
  cta,
  align = "left",
  width = "wide",
  className,
  innerClassName,
  children,
}: {
  id?: string;
  eyebrow?: string;
  heading?: ReactNode;
  description?: ReactNode;
  cta?: ReactNode;
  align?: "left" | "between";
  width?: Width;
  className?: string;
  innerClassName?: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      className={cn("relative scroll-mt-24 px-6", className)}
      style={{ paddingTop: "var(--space-section-y)", paddingBottom: "var(--space-section-y)" }}
    >
      <div className={cn("mx-auto", widths[width], innerClassName)}>
        {heading && (
          <SectionHeading
            eyebrow={eyebrow}
            title={heading}
            description={description}
            align={align}
            cta={cta}
          />
        )}
        <div className={cn(heading ? "mt-14 md:mt-16" : "")}>{children}</div>
      </div>
    </section>
  );
}
