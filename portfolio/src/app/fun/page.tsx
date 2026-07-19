// The explorable room.
//
// This is an alternative way into the portfolio, never the only one. Every
// section it exposes stays reachable through the normal navigation, so the
// room never has to carry accessibility or SEO on its own.
//
// A Server Component so the shelf contents can be read from the same sources
// the rest of the site uses: the case studies in src/content/work and the
// certifications in src/content/resume. Adding either puts it in the room.

import { getAllWork } from "@/lib/work";
import { certs } from "@/content/resume";
import type { ShelfData } from "@/components/fun/shelf";
import FunRoomClient from "./FunRoomClient";

export default function FunPage() {
  const shelf: ShelfData = {
    books: getAllWork().map((w) => ({
      slug: w.slug,
      title: w.title,
      client: w.client,
      period: w.period,
      summary: w.summary,
      stack: w.stack,
      kind: w.kind,
    })),
    certs: certs.map((c) => ({
      title: c.title,
      issuer: c.issuer,
      date: c.date,
      credentialId: c.credentialId,
    })),
  };

  return <FunRoomClient shelf={shelf} />;
}
