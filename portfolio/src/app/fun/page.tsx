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
import { certs, education, experience } from "@/content/resume";
import type { CareerData, ShelfData } from "@/components/fun/shelf";
import { sourceExcerpt } from "@/lib/source-excerpt";
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

  const career: CareerData = {
    roles: experience.map((e) => ({
      role: e.role,
      company: e.company,
      period: e.period,
    })),
    education: education.map((e) => ({
      title: e.title,
      institution: e.institution,
      period: e.period,
    })),
  };

  // Real code off disk for the desk monitor. Server-side because it is a
  // filesystem read, and it is the same reason this page is not a client one.
  return <FunRoomClient shelf={shelf} career={career} source={sourceExcerpt()} />;
}
