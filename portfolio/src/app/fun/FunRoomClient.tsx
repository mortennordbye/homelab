"use client";

// Client wrapper: `next/dynamic` with `ssr: false` is not allowed in a Server
// Component, and the room needs three.js kept out of the main bundle. The page
// itself stays a Server Component so it can read the case studies and
// certifications straight off disk and pass them in — no API route, no fetch,
// and the shelf is populated the moment the room mounts.

import dynamic from "next/dynamic";
import type { ShelfData } from "@/components/fun/shelf";

const FunRoom = dynamic(() => import("@/components/fun/FunRoom"), {
  ssr: false,
  loading: () => (
    <div className="fixed inset-0 z-[200] grid place-content-center bg-[#04070a] font-mono text-sm text-white/40">
      warming up the room…
    </div>
  ),
});

export default function FunRoomClient({ shelf }: { shelf: ShelfData }) {
  return <FunRoom shelf={shelf} />;
}
