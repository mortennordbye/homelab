/**
 * What goes on the shelf.
 *
 * Books are the case studies in `src/content/work/*.mdx`; the folder of
 * certificates is `certs` from `src/content/resume.ts`. Both are read at build
 * time on the server and handed to the room as plain data, so adding a case
 * study or a certification puts it on the shelf with no change here.
 *
 * That is the whole point of this file existing rather than a hand-placed list
 * of props: shelf layout is computed from array length in Bookshelf.tsx, so the
 * room stays in step with the rest of the site instead of drifting out of date
 * the first time something is added.
 */

export type ShelfBook = {
  slug: string;
  title: string;
  client: string;
  period: string;
  summary: string;
  stack: string[];
  kind: string;
};

export type ShelfCert = {
  title: string;
  issuer: string;
  date: string;
  credentialId?: string;
};

export type ShelfData = {
  books: ShelfBook[];
  certs: ShelfCert[];
};
