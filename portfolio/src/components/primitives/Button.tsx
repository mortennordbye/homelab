import Link from "next/link";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "link";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-[2px] font-display font-medium transition-colors duration-[180ms] ease-out focus-ring disabled:opacity-50 disabled:cursor-not-allowed";

const sizes: Record<Size, string> = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-4 py-2 text-sm",
  lg: "px-5 py-3 text-sm",
};

const variants: Record<Variant, string> = {
  // Solid green with no glow: the fill is the one green action §2 allows,
  // and nothing emits light except a screen or a lamp.
  primary: "bg-accent text-accent-ink hover:bg-interactive-hover",
  // Solid brass rather than an outline: green is the primary and stays the
  // only green control, so the second action needs its own material instead
  // of a quieter version of the first. --fg, never --fg-2, which measures
  // 2.65:1 on brass.
  secondary: "bg-brass text-fg hover:bg-brass-hi",
  ghost: "text-fg-2 hover:text-fg hover:bg-surface/60",
  // Ink, not green: links carry copper underlines so the section's one green
  // stays on the primary action.
  link: "text-fg underline decoration-copper underline-offset-4 hover:text-copper px-0 py-0",
};

type CommonProps = {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
};

type AsButton = CommonProps &
  ComponentPropsWithoutRef<"button"> & { href?: undefined };

type AsLink = CommonProps &
  Omit<ComponentPropsWithoutRef<"a">, "href"> & { href: string };

export function Button(props: AsButton | AsLink) {
  const {
    variant = "primary",
    size = "md",
    className,
    children,
    iconLeft,
    iconRight,
    ...rest
  } = props as CommonProps & { href?: string };

  const classes = cn(base, sizes[size], variants[variant], className);
  const content = (
    <>
      {iconLeft}
      <span>{children}</span>
      {iconRight}
    </>
  );

  if ("href" in rest && rest.href) {
    const { href, ...anchorRest } = rest as { href: string } & Record<string, unknown>;
    const external = href.startsWith("http") || href.startsWith("mailto:");
    if (external) {
      return (
        <a href={href} className={classes} {...(anchorRest as ComponentPropsWithoutRef<"a">)}>
          {content}
        </a>
      );
    }
    return (
      <Link href={href} className={classes} {...(anchorRest as Omit<ComponentPropsWithoutRef<"a">, "href">)}>
        {content}
      </Link>
    );
  }

  return (
    <button className={classes} {...(rest as ComponentPropsWithoutRef<"button">)}>
      {content}
    </button>
  );
}
