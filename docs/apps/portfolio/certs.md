# Certifications

The cert list on the resume, the fun room wall, `/llms.txt` and `/api/v1/profile` comes from
`portfolio/src/content/certs.json`. The GitHub profile reads it through that API. The file is
generated; edit `scripts/sync-certs.py`, not the JSON. The resume and the fun room link each cert
to its verify page; the id only goes into the Person schema and the API.

Two public sources feed it:

- Credly (`credly.com/users/morten-victor-nordbye`): Anthropic, the Linux Foundation and AWS
  badges, each linking to its Credly badge page. The Credly id is left out of `credentialId`:
  it is a 36-character UUID and the url already identifies the badge.
- The Microsoft Learn transcript share link: Microsoft and GitHub certifications, each linking to
  its Learn share page, with the certification number as `credentialId`. The transcript does not
  carry the credential ids those pages need, and Learn has no public list of them, so the script
  maps titles to ids in `LEARN_IDS`.

`.github/workflows/sync-certs.yaml` runs the script daily and opens a PR from `bot/sync-certs`
when the list changed. Run it locally with `python3 scripts/sync-certs.py`.

## Traps

- The transcript link must stay shared. Revoking or recreating it in Learn changes its id, and
  the script fails until `LEARN_TRANSCRIPT` and `LEARN_API` point at the new one.
- A fetch failure exits before the file is written, so an outage never removes certs. Expired
  certs stay: Credly keeps listing them, and the script reads the transcript's historical list as
  well as the active one. A cert deleted at the source does drop from the PR; review the diff.
- Titles are normalised to what the site has always shown: GitHub certs get a "Certification"
  suffix and Credly's ASCII hyphen becomes an en dash.
- A new Learn cert links to the transcript until its credential id (from its share link on the
  Learn profile) is added to `LEARN_IDS`.
- Bot PRs are opened with `GITHUB_TOKEN`, so they do not trigger `build-portfolio.yaml`. That needs
  "Allow GitHub Actions to create and approve pull requests" on in the repo's Actions settings.
