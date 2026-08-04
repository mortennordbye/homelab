import type { WorkMeta } from "@/lib/work";
import { pickBrand } from "@/components/work/brand-icons";

/**
 * Cover for portfolio cards. The dominant tech in the project's stack drives
 * the icon, so each card still identifies its primary technology in that
 * vendor's own colour (Kubernetes blue, Red Hat red, and so on).
 *
 * Nothing on the cover is tinted with the vendor colour any more. It used to
 * drive the ground, a radial glow, the icon and the label, and on a green
 * site that turned the listing into a row of blue and red boxes — Ansible red
 * against the eucalyptus ground being the worst of it, since red and green
 * are complementary and the hardest pair for anyone with a colour-vision
 * deficiency.
 *
 * The technology is still named, in text, on every card. Colour was redundant
 * encoding on top of a label that already says KUBERNETES, so removing it
 * costs no information. Vendor colours are kept where they read as marks
 * rather than decoration — see StackTiles on the case-study pages.
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
          "linear-gradient(135deg, rgba(var(--accent-rgb), 0.10) 0%, rgba(15, 20, 16, 0.96) 70%)",
      }}
    >
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.10]"
        style={{
          backgroundImage:
            "linear-gradient(to right, var(--line-2) 1px, transparent 1px), linear-gradient(to bottom, var(--line-2) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />

      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 80% at 50% 45%, rgba(var(--accent-rgb), 0.12), transparent 65%)",
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
