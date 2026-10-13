"""Rebuild portfolio/src/content/certs.json from Credly and the Microsoft Learn transcript.

Both sources are public. Any fetch or parse failure exits non-zero before the file
is touched, so an outage on either side never drops certs from the site.
"""

import json
import sys
import urllib.request
from datetime import date
from pathlib import Path

CREDLY = "https://www.credly.com/users/morten-victor-nordbye/badges.json"
LEARN_TRANSCRIPT = "https://learn.microsoft.com/en-us/users/mortenvictornordbye-8246/transcript/dr5zjaxjo8qy1zn"
LEARN_API = "https://learn.microsoft.com/api/profiles/transcript/share/dr5zjaxjo8qy1zn?locale=en-us"
LEARN_SHARE = "https://learn.microsoft.com/api/credentials/share/en-us/MortenVictorNordbye-8246"
# The transcript lacks the credential ids Learn's per-cert pages need. Add a new cert's id from its
# share link on the Learn profile; until then it links to the transcript.
LEARN_IDS = {
    "Microsoft Certified: DevOps Engineer Expert": "F8616ED44F1AA2F4",
    "Microsoft Certified: Azure Administrator Associate": "9AC5167520292789",
    "Microsoft Certified: Azure Solutions Architect Expert": "1F5A74303E8DEC46",
    "GitHub Actions Certification": "90FCBE7771D404BA",
    "GitHub Copilot Certification": "576F475095FD41FE",
    "GitHub Advanced Security Certification": "97A7AC3B9D0D3172",
}
OUT = Path(__file__).resolve().parent.parent / "portfolio/src/content/certs.json"

ISSUERS = {"Amazon Web Services Training and Certification": "Amazon Web Services"}


def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0", "Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=30) as res:
        return json.load(res)


def month(iso):
    return date.fromisoformat(iso[:10]).strftime("%b %Y")


def credly():
    for b in fetch(CREDLY)["data"]:
        issuer = b["issuer"]["entities"][0]["entity"]["name"]
        yield b["issued_at_date"], {
            "title": b["badge_template"]["name"].replace(" - ", " – "),
            "issuer": ISSUERS.get(issuer, issuer),
            "date": month(b["issued_at_date"]),
            # No credentialId: a 36-char UUID breaks the resume row; the url verifies it.
            "url": f"https://www.credly.com/badges/{b['id']}",
        }


def learn():
    data = fetch(LEARN_API)["certificationData"]
    # Expired certs move to historicalCertifications; the site shows both.
    for c in data["activeCertifications"] + data["historicalCertifications"]:
        github = c["name"].startswith("GitHub")
        title = f"{c['name']} Certification" if github else c["name"]
        yield c["dateEarned"][:10], {
            "title": title,
            "issuer": "GitHub (Microsoft)" if github else "Microsoft",
            "date": month(c["dateEarned"]),
            "credentialId": c["certificationNumber"],
            "url": f"{LEARN_SHARE}/{LEARN_IDS[title]}" if title in LEARN_IDS else LEARN_TRANSCRIPT,
        }


def main():
    rows = [*credly(), *learn()]
    if not rows:
        sys.exit("no certs returned, refusing to write an empty list")
    rows.sort(key=lambda r: r[1]["title"])
    rows.sort(key=lambda r: r[0], reverse=True)
    certs = [cert for _, cert in rows]
    OUT.write_text(json.dumps(certs, indent=2, ensure_ascii=False) + "\n")
    print(f"wrote {len(certs)} certs to {OUT.relative_to(OUT.parents[3])}")


if __name__ == "__main__":
    main()
