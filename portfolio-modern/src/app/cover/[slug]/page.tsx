import { notFound } from "next/navigation";
import { getAllWork, getWorkBySlug } from "@/lib/work";
import { CoverDiagram } from "./CoverDiagram";

type Params = { slug: string };

export function generateStaticParams() {
  return getAllWork()
    .filter((w) => !!w.arch)
    .map((w) => ({ slug: w.slug }));
}

export const metadata = {
  robots: { index: false, follow: false },
};

export default async function Cover({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const w = getWorkBySlug(slug);
  if (!w?.arch) notFound();

  return (
    <>
      <style>{`
        body > *:not(main) { display: none !important; }
        main > *:not(#cover-canvas) { display: none !important; }
        body { margin: 0 !important; padding: 0 !important; overflow: hidden !important; background: var(--bg); }
        html { background: var(--bg); }
      `}</style>
      <div
        id="cover-canvas"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: 1200,
        height: 630,
        background: "var(--bg)",
        padding: "40px 60px",
        boxSizing: "border-box",
        zIndex: 99999,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        gap: 24,
      }}
    >
      <div className="flex items-end justify-between font-display">
        <div>
          <p
            style={{
              fontSize: 11,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: "var(--fg-3)",
              margin: 0,
            }}
          >
            architecture · {w.kind === "professional" ? "client" : "homelab"}
          </p>
          <h1
            style={{
              fontSize: 26,
              color: "var(--fg)",
              margin: "8px 0 0",
              lineHeight: 1.1,
              maxWidth: 800,
            }}
          >
            {w.title}
          </h1>
        </div>
        <p
          style={{
            fontSize: 11,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            color: "var(--fg-3)",
            margin: 0,
          }}
        >
          {w.period}
        </p>
      </div>
      <div style={{ flex: 1, minHeight: 0 }}>
        <CoverDiagram arch={w.arch} />
      </div>
    </div>
    </>
  );
}
