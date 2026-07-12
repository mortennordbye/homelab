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
import { Reveal } from "@/components/primitives/Reveal";
import type { PipelineHop } from "@/content/infrastructure";

const hopIcon: Record<PipelineHop["icon"], React.ReactNode> = {
  user: <User size={20} />,
  globe: <Globe size={20} />,
  network: <Network size={20} />,
  route: <Route size={20} />,
  package: <Package size={20} />,
  commit: <GitCommitHorizontal size={20} />,
  cog: <Cog size={20} />,
  registry: <Database size={20} />,
  sync: <RefreshCw size={20} />,
  server: <Server size={20} />,
};

function Connector({ delay }: { delay: number }) {
  return (
    <div
      aria-hidden
      className="relative hidden w-11 shrink-0 items-center md:flex"
    >
      <span className="absolute inset-x-1 top-1/2 h-px bg-line-2" />
      <span className="absolute right-0.5 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rotate-45 border-r border-t border-line-2" />
      <span
        className="packet absolute top-1/2 h-[5px] w-[5px] -translate-y-1/2 rounded-full bg-accent shadow-[0_0_8px_var(--accent)]"
        style={{ "--packet-delay": `${delay}s` } as React.CSSProperties}
      />
    </div>
  );
}

export function Pipeline({ hops }: { hops: readonly PipelineHop[] }) {
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-stretch md:gap-0">
      {hops.map((hop, i) => (
        <div key={hop.name} className="contents">
          {i > 0 && <Connector delay={i * 0.45} />}
          <Reveal
            delay={i * 0.08}
            className="min-w-0 flex-1 rounded-md border border-line bg-surface p-4 transition-colors hover:border-accent"
          >
            <span className="mb-3 block text-accent">{hopIcon[hop.icon]}</span>
            <p className="font-mono text-sm font-semibold text-fg">{hop.name}</p>
            <p className="mt-1 text-xs leading-relaxed text-fg-3">{hop.desc}</p>
            {hop.meta && (
              <p className="mt-2 truncate font-mono text-[0.68rem] text-accent">
                {hop.meta}
              </p>
            )}
          </Reveal>
        </div>
      ))}
    </div>
  );
}
