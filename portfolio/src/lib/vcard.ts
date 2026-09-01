import { site } from "@/content/site";

// Re-exported so a caller wanting the card and its name imports one module.
export { VCARD_FILENAME } from "./download-name";

// vCard 3.0, not 4.0 — phone/mail clients all read 3.0, 4.0 still sometimes
// imports as a text file. CRLF endings are required by the spec, not style.

// RFC 6350 gives \ , ; and newline meaning inside a value; an unescaped one
// in site.ts would split the field and import as a broken contact.
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
    // ADR is po-box;extended;street;locality;region;postcode;country. City and
    // country only — the card must not say more than the site does.
    `ADR;type=WORK:;;;${esc(site.location.split(",")[0]?.trim() ?? "")};;;${esc(site.location.split(",")[1]?.trim() ?? "")}`,
    `X-SOCIALPROFILE;type=linkedin:https://www.linkedin.com/in/${site.linkedin}`,
    `X-SOCIALPROFILE;type=github:https://github.com/${site.github}`,
    "END:VCARD",
  ];
  return `${lines.join("\r\n")}\r\n`;
}
