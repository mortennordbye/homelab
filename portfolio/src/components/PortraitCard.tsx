import Image from "next/image";

export function PortraitCard() {
  return (
    <figure className="relative overflow-hidden rounded-lg border border-line bg-surface/40 backdrop-blur-sm">
      <div className="relative aspect-[4/5] w-full overflow-hidden">
        <Image
          src="/images/profile.webp"
          alt="Morten Nordbye, Cloud Engineer & Architect, Oslo"
          fill
          priority
          sizes="(max-width: 768px) 100vw, 33vw"
          className="object-cover saturate-[0.92] contrast-[1.05]"
          style={{ objectPosition: "center top" }}
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-t from-bg via-transparent to-transparent opacity-90"
        />
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(120% 60% at 0% 100%, rgba(var(--accent-rgb), 0.20), transparent 60%)",
          }}
        />
        <span
          aria-hidden
          className="absolute right-3 top-3 inline-flex items-center gap-2 rounded-full border border-line-2 bg-bg/70 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.2em] text-fg-2 backdrop-blur"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-accent shadow-[0_0_10px_var(--accent)]" />
          oslo · 59.9°N
        </span>
      </div>
    </figure>
  );
}
