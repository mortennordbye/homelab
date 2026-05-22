import { ImageResponse } from "next/og";
import { site } from "@/content/site";

export const dynamic = "force-static";
export const alt = `${site.name} — ${site.role}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
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
            "radial-gradient(60% 80% at 22% -10%, rgba(139,125,255,0.32), transparent 60%), radial-gradient(55% 70% at 88% 10%, rgba(93,183,255,0.28), transparent 65%), linear-gradient(180deg, #0a1015 0%, #050a0f 100%)",
          color: "#ECEEF5",
          fontFamily: "ui-sans-serif, system-ui, -apple-system, sans-serif",
        }}
      >
        {/* Top — eyebrow */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            fontSize: 22,
            letterSpacing: "0.3em",
            color: "#97a4b4",
            textTransform: "uppercase",
            fontFamily: "ui-monospace, monospace",
          }}
        >
          <span
            style={{
              width: 12,
              height: 12,
              borderRadius: "50%",
              background: "#5DB7FF",
              boxShadow: "0 0 24px #5DB7FF",
            }}
          />
          available · oslo &amp; remote
        </div>

        {/* Middle — name + role */}
        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          <div
            style={{
              fontSize: 124,
              lineHeight: 1,
              fontWeight: 700,
              letterSpacing: "-0.04em",
              fontFamily: "ui-monospace, monospace",
              display: "flex",
            }}
          >
            <span style={{ color: "#ECEEF5" }}>Morten </span>
            <span
              style={{
                marginLeft: 24,
                background:
                  "linear-gradient(110deg, #ECEEF5 30%, #5DB7FF 60%, #8B7DFF 95%)",
                backgroundClip: "text",
                color: "transparent",
              }}
            >
              Nordbye
            </span>
          </div>
          <div
            style={{
              fontSize: 40,
              color: "#97a4b4",
              letterSpacing: "-0.01em",
              fontWeight: 400,
            }}
          >
            {`${site.role} · ${site.location}`}
          </div>
        </div>

        {/* Bottom — domain + tagline */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            fontSize: 24,
            color: "#97a4b4",
            fontFamily: "ui-monospace, monospace",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              color: "#ECEEF5",
            }}
          >
            <span style={{ color: "#5DB7FF" }}>●</span>
            nordbye.it
          </div>
          <div style={{ color: "#5a6878" }}>
            azure · k8s · gitops · terraform
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
