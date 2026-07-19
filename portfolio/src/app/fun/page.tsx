"use client";

// The explorable room. Client wrapper because `next/dynamic` with `ssr: false`
// is not allowed in a Server Component — same pattern as InlineGlobe.tsx.
//
// This is an alternative way into the portfolio, never the only one. Every
// section it exposes stays reachable through the normal navigation, so the
// room never has to carry accessibility or SEO on its own.

import dynamic from "next/dynamic";

const FunRoom = dynamic(() => import("@/components/fun/FunRoom"), {
  ssr: false,
  loading: () => (
    <div className="fixed inset-0 z-[200] grid place-content-center bg-[#04070a] font-mono text-sm text-white/40">
      warming up the operations centre…
    </div>
  ),
});

export default function OpsPage() {
  return <FunRoom />;
}
