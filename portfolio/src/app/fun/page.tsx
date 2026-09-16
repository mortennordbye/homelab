// The explorable room.
//
// This is an alternative way into the portfolio, never the only one. Every
// section it exposes stays reachable through the normal navigation, so the
// room never has to carry accessibility or SEO on its own.
//
// A Server Component so the shelf contents can be read from the same sources
// the rest of the site uses: the case studies in src/content/work and the
// certifications in src/content/resume. Adding either puts it in the room.

import type { Metadata } from "next";
import { getAllWork } from "@/lib/work";
import { certs, education, experience } from "@/content/resume";
import { site } from "@/content/site";
import type { CareerData, ShelfData } from "@/components/fun/shelf";
import { sourceExcerpt } from "@/lib/source-excerpt";
import FunRoomClient from "./FunRoomClient";

export const metadata: Metadata = {
  title: "The room",
  description:
    "An explorable 3D room built from this site's own content: a shelf of case studies, the certifications, the career timeline, and real source code on the desk monitor.",
  alternates: { canonical: "/fun/" },
  openGraph: {
    url: "/fun/",
    title: "The room",
    description:
      "An explorable 3D room built from this site's own content: case studies on the shelf, certifications, and real source on the desk monitor.",
  },
};

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
  return (
    <>
      {/* The canvas bails out to client-side rendering, so without this the
          server response is 8 words and the room is invisible to screen
          readers and to every crawler that does not run JavaScript. Same
          content the room holds, in the order it holds it — a text
          alternative, not a second page. sr-only: no pixels change. */}
      <section className="sr-only">
        <h1>The room</h1>
        <p>
          An explorable 3D version of this portfolio. Everything below is
          reachable through the normal navigation as well.
        </p>

        <h2>Case studies on the shelf</h2>
        <ul>
          {shelf.books.map((b) => (
            <li key={b.slug}>
              <a href={`/work/${b.slug}/`}>{b.title}</a>
              {` — ${b.client}, ${b.period}. ${b.summary}`}
            </li>
          ))}
        </ul>

        <h2>Certifications</h2>
        <ul>
          {shelf.certs.map((c) => (
            <li key={c.title}>{`${c.title} — ${c.issuer}, ${c.date}`}</li>
          ))}
        </ul>

        <h2>Career</h2>
        <ul>
          {career.roles.map((r) => (
            <li key={`${r.role}-${r.company}`}>{`${r.role} — ${r.company}, ${r.period}`}</li>
          ))}
          {career.education.map((e) => (
            <li key={e.title}>{`${e.title} — ${e.institution}, ${e.period}`}</li>
          ))}
        </ul>

        <p>
          <a href={`${site.url}/`}>Back to the main portfolio</a>
        </p>
      </section>

      <FunRoomClient shelf={shelf} career={career} source={sourceExcerpt()} />
    </>
  );
}
