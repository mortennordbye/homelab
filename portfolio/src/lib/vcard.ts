import { site } from "@/content/site";

// Re-exported so a caller wanting the card and its name imports one module.
export { VCARD_FILENAME } from "./download-name";

/**
 * The contact card, as the file a phone or a mail client will take.
 *
 * vCard 3.0 rather than 4.0. Apple Contacts, Google Contacts and Outlook all
 * read 3.0 without argument; 4.0 is the newer standard and is still the one
 * that occasionally imports as a text file. Nothing here needs a 4.0 field.
 *
 * CRLF line endings are not a style choice. RFC 6350 specifies them, and the
 * parsers that care are the ones on phones, which is where this file is going.
 */
/**
 * Escape one text value.
 *
 * RFC 6350 gives backslash, comma, semicolon and newline meaning inside a
 * value, so a role or a city that happens to contain one would otherwise split
 * the field and import as nonsense. Nothing in `site.ts` contains one today,
 * which is exactly why this is here: the failure would arrive with an edit to
 * a content file, nowhere near this code, and look like a broken contact
 * rather than a quoting bug.
 */
function esc(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

export function vcard(): string {
  const lines = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    // N is family;given;additional;prefix;suffix, and it is what most clients
    // sort by. FN is the display name.
    `N:${esc(site.lastName)};${esc(site.firstName)};;;`,
    `FN:${esc(`${site.firstName} ${site.lastName}`)}`,
    `TITLE:${esc(site.role)}`,
    `EMAIL;type=INTERNET;type=WORK;type=pref:${esc(site.email)}`,
    `TEL;type=CELL;type=pref:${esc(site.phone)}`,
    `URL:${esc(site.url)}`,
    // ADR is po-box;extended;street;locality;region;postcode;country. Only the
    // city and country, because that is all the site says in public and a
    // contact file is not the place to say more than the page does.
    `ADR;type=WORK:;;;${esc(site.location.split(",")[0]?.trim() ?? "")};;;${esc(site.location.split(",")[1]?.trim() ?? "")}`,
    `X-SOCIALPROFILE;type=linkedin:https://www.linkedin.com/in/${site.linkedin}`,
    `X-SOCIALPROFILE;type=github:https://github.com/${site.github}`,
    "END:VCARD",
  ];
  return `${lines.join("\r\n")}\r\n`;
}
