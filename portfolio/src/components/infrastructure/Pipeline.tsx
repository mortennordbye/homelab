import {
  Cog,
  Database,
  GitCommitHorizontal,
  Globe,
  Network,
  Package,
  RefreshCw,
  Route,
  Server,
  User,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { Reveal } from "@/components/primitives/Reveal";
import type { PipelineHop } from "@/content/infrastructure";

const hopIcon: Record<PipelineHop["icon"], React.ReactNode> = {
  user: <User size={18} />,
  globe: <Globe size={18} />,
  network: <Network size={18} />,
  route: <Route size={18} />,
  package: <Package size={18} />,
  commit: <GitCommitHorizontal size={18} />,
  cog: <Cog size={18} />,
  registry: <Database size={18} />,
  sync: <RefreshCw size={18} />,
  server: <Server size={18} />,
};

/**
 * stream: a continuous flow — round nodes on a solid wire with packets
 * travelling it (the request path). steps: discrete events — numbered square
 * nodes on a dashed wire, no packets (the deploy path).
 */
export function Pipeline({
  hops,
  variant = "stream",
}: {
  hops: readonly PipelineHop[];
  variant?: "stream" | "steps";
}) {
  const steps = variant === "steps";
  return (
    <div className="relative">
      {/* the wire: vertical through the icons on mobile, horizontal on md+ */}
      <span
        aria-hidden
        className={cn(
          "absolute bottom-8 left-[20px] top-8 md:bottom-auto md:left-20 md:right-20 md:top-[20px]",
          steps
            ? "border-l border-dashed border-line-2 md:border-l-0 md:border-t"
            : "w-px bg-line-2 md:h-px md:w-auto",
        )}
      />
      {/* packets travelling the wire, stream variant on md+ only */}
      {!steps && (
        <span
          aria-hidden
          className="absolute left-20 right-20 top-[20px] hidden h-px md:block"
        >
          <span
            className="packet absolute top-1/2 h-[5px] w-[5px] -translate-y-1/2 rounded-full bg-accent shadow-[0_0_8px_var(--accent)]"
            style={{ "--packet-duration": "5.5s" } as React.CSSProperties}
          />
          <span
            className="packet absolute top-1/2 h-[5px] w-[5px] -translate-y-1/2 rounded-full bg-accent shadow-[0_0_8px_var(--accent)]"
            style={
              {
                "--packet-duration": "5.5s",
                "--packet-delay": "2.75s",
              } as React.CSSProperties
            }
          />
        </span>
      )}
      <div className="relative flex flex-col gap-8 md:flex-row md:justify-between">
        {hops.map((hop, i) => (
          <Reveal
            key={hop.name}
            delay={i * 0.08}
            className="flex items-start gap-5 md:w-40 md:flex-col md:items-center md:gap-4 md:text-center"
          >
            <span
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center border bg-surface",
                steps
                  ? "rounded-md border-line-2 text-accent-3"
                  : "rounded-full border-line-2 text-accent",
              )}
            >
              {hopIcon[hop.icon]}
            </span>
            <div className="min-w-0 pt-2 md:pt-0">
              {steps && (
                <p className="font-mono text-[0.65rem] tracking-widest text-fg-3">
                  0{i + 1}
                </p>
              )}
              <p className="font-mono text-sm font-semibold text-fg">
                {hop.name}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-fg-3">
                {hop.desc}
              </p>
              {hop.meta && (
                <p
                  className={cn(
                    "mt-1.5 truncate font-mono text-[0.68rem]",
                    steps ? "text-accent-3" : "text-accent",
                  )}
                >
                  {hop.meta}
                </p>
              )}
            </div>
          </Reveal>
        ))}
      </div>
    </div>
  );
}
