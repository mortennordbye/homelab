import type { WorkMeta } from "@/lib/work";
import { pickBrand } from "@/components/work/brand-icons";

/**
 * Cover for portfolio cards. The dominant stack tech drives the icon, in the
 * vendor's own colour — but the vendor colour must stay on the mark only,
 * never tint the ground or label (red-on-green is the hardest pair for
 * colour-vision deficiency). Ground stays neutral, never green-on-green.
 * Vendor colours as decoration live in StackTiles on the case-study pages.
 */
export function WorkCardCover({ work }: { work: WorkMeta }) {
  const { brand } = pickBrand(work.stack);
  const isHomelab = work.kind === "homelab";
  const Icon = brand.Icon;

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{
        background:
          "linear-gradient(135deg, var(--surface) 0%, var(--bg) 72%)",
      }}
    >
      {/* One ring behind the mark instead of the 24px grid these covers used
          to carry. Same reasoning as the hero: a faint grid is the most
          common generated-UI background there is. */}
      <svg
        aria-hidden
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 400 225"
        fill="none"
        preserveAspectRatio="xMidYMid slice"
      >
        <g stroke="var(--line-2)" strokeOpacity="0.55" strokeWidth="1">
          <circle cx="200" cy="100" r="66" />
          <circle cx="200" cy="100" r="104" />
        </g>
      </svg>

      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 80% at 50% 45%, rgba(255, 255, 255, 0.035), transparent 65%)",
        }}
      />

      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
        <Icon
          size={56}
          strokeWidth={1.4}
          style={{ color: "var(--accent)" }}
          aria-hidden
        />
        <span
          className="font-display text-[10px] uppercase tracking-[0.22em]"
          style={{ color: "var(--fg-3)" }}
        >
          {brand.label}
        </span>
      </div>

      <span
        className={
          "absolute right-2 top-2 inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-display text-[9px] uppercase tracking-[0.2em] backdrop-blur-sm " +
          (isHomelab
            ? "border-line-2 bg-bg/40 text-fg-2"
            : "border-accent/40 bg-bg/40 text-accent")
        }
      >
        <span
          className={
            "h-1 w-1 rounded-full " +
            (isHomelab
              ? "bg-fg-2"
              : "bg-accent shadow-[0_0_6px_var(--accent)]")
          }
        />
        {isHomelab ? "homelab" : "client"}
      </span>

      <span className="absolute bottom-2 left-2 font-display text-[9px] uppercase tracking-[0.2em] text-fg-3">
        /{work.slug}
      </span>
    </div>
  );
}
