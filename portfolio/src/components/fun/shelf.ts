/**
 * What goes on the shelf. Books come from `src/content/work/*.mdx`, certs from
 * `src/content/resume.ts` — read at build time and handed to the room as plain
 * data, so adding content puts it on the shelf with no change here.
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

/** Roles and education for the framed timeline, from `resume.ts`. */
export type CareerRole = {
  role: string;
  company: string;
  period: string;
};

export type CareerEducation = {
  title: string;
  institution: string;
  period: string;
};

export type CareerData = {
  roles: CareerRole[];
  education: CareerEducation[];
};
