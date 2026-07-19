import Image from "next/image";

export function PortraitCard() {
  return (
    <figure className="relative overflow-hidden rounded-lg border border-line bg-surface/40 backdrop-blur-sm">
      <div className="relative aspect-[4/5] w-full overflow-hidden">
        {/*
          Deliberately not `priority`. At Lighthouse's 412x823 mobile viewport
          this portrait sits at y=862 — below the fold — and the LCP element is
          the hero paragraph, not this image. Preloading it at high priority
          only makes it compete with the resources that decide first paint.
          Measured over 3 throttled runs each (4x CPU, 1.6 Mbit): FCP/LCP 1940 ms
          with the hint, 1852 ms without.
        */}
        <Image
          src="/images/profile.webp"
          alt="Morten Nordbye, Cloud Engineer & Architect, Oslo"
          fill
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
      </div>
    </figure>
  );
}
