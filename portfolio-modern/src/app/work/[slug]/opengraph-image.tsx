import { ImageResponse } from "next/og";
import { getAllWork, getWorkBySlug } from "@/lib/work";

export const dynamic = "force-static";
export const alt = "Case study — Morten Nordbye";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export function generateStaticParams() {
  return getAllWork().map((w) => ({ slug: w.slug }));
}

type Params = { slug: string };

export default async function Image({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const w = getWorkBySlug(slug);
  if (!w) return new ImageResponse(<div />, { ...size });

  const kindLabel = w.kind === "professional" ? "client engagement" : "personal project";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          background:
            "radial-gradient(60% 80% at 22% -10%, rgba(139,125,255,0.28), transparent 60%), radial-gradient(55% 70% at 88% 10%, rgba(93,183,255,0.24), transparent 65%), linear-gradient(180deg, #0a1015 0%, #050a0f 100%)",
          color: "#ECEEF5",
          fontFamily: "ui-sans-serif, system-ui, -apple-system, sans-serif",
        }}
      >
        {/* Top — eyebrow */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            fontSize: 22,
            letterSpacing: "0.3em",
            color: "#5DB7FF",
            textTransform: "uppercase",
            fontFamily: "ui-monospace, monospace",
          }}
        >
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              background: "#5DB7FF",
              boxShadow: "0 0 18px #5DB7FF",
            }}
          />
          /case study — {kindLabel}
        </div>

        {/* Middle — title + period */}
        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          <div
            style={{
              fontSize: w.title.length > 40 ? 72 : 92,
              lineHeight: 1.05,
              fontWeight: 700,
              letterSpacing: "-0.035em",
              fontFamily: "ui-monospace, monospace",
              color: "#ECEEF5",
              maxWidth: "90%",
            }}
          >
            {w.title}
          </div>
          <div style={{ display: "flex", gap: 36, fontSize: 26, color: "#97a4b4" }}>
            <span>{w.period}</span>
            <span style={{ color: "#5a6878" }}>·</span>
            <span>{w.client}</span>
          </div>
        </div>

        {/* Bottom — author + stack */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            fontSize: 22,
            color: "#97a4b4",
            fontFamily: "ui-monospace, monospace",
            borderTop: "1px solid #1d2733",
            paddingTop: 28,
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 6,
              color: "#ECEEF5",
            }}
          >
            <span style={{ fontSize: 18, color: "#5a6878", letterSpacing: "0.2em" }}>
              MORTEN NORDBYE
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ color: "#5DB7FF" }}>●</span> nordbye.it
            </span>
          </div>
          <div
            style={{
              color: "#5a6878",
              maxWidth: "55%",
              textAlign: "right",
              fontSize: 18,
            }}
          >
            {w.stack.slice(0, 4).join("  ·  ")}
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
