"use client";

// Client wrapper: `next/dynamic` with `ssr: false` is not allowed in a Server
// Component, and the room needs three.js kept out of the main bundle. The page
// itself stays a Server Component so it can read the case studies and
// certifications straight off disk and pass them in — no API route, no fetch,
// and the shelf is populated the moment the room mounts.

import dynamic from "next/dynamic";
import type { CareerData, ShelfData } from "@/components/fun/shelf";
import type { SourceExcerpt } from "@/lib/source-excerpt";
import { RoomLoading } from "@/components/fun/RoomLoading";

const FunRoom = dynamic(() => import("@/components/fun/FunRoom"), {
  ssr: false,
  // Same screen the room shows once it has mounted, so the handover from
  // "chunk loading" to "assets loading" is not a visible cut.
  loading: () => <RoomLoading />,
});

export default function FunRoomClient({
  shelf,
  career,
  source,
}: {
  shelf: ShelfData;
  career: CareerData;
  source: SourceExcerpt;
}) {
  return <FunRoom shelf={shelf} career={career} source={source} />;
}
