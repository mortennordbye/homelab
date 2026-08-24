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
  bleed,
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
  /**
   * Content that runs the full width of the page rather than the container —
   * for a section object, which reads as a widget the moment it has a measured
   * box round it. Rendered after the heading and outside the max-width, and it
   * cancels the section's own horizontal padding to reach the viewport edge.
   */
  bleed?: ReactNode;
  children?: ReactNode;
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
        {children && <div className={cn(heading ? "mt-14 md:mt-16" : "")}>{children}</div>}
      </div>
      {bleed && <div className={cn("-mx-6", heading ? "mt-14 md:mt-16" : "")}>{bleed}</div>}
    </section>
  );
}
