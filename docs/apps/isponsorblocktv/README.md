# iSponsorBlockTV

[iSponsorBlockTV](https://github.com/dmunozv04/iSponsorBlockTV) joins the YouTube app on a TV
as a remote, the same way a phone does when it casts, and skips
[SponsorBlock](https://sponsor.ajay.app/) segments, mutes ads and presses "Skip Ad". It talks
only to YouTube's lounge API and the SponsorBlock API, so it needs no route, no Service and no
LAN access to the TV. The manifests live in
[`k8s/talos/apps/isponsorblocktv/`](../../../k8s/talos/apps/isponsorblocktv/kustomization.yaml).

| | |
|---|---|
| Namespace | `isponsorblocktv` |
| Image | `ghcr.io/dmunozv04/isponsorblocktv`, upstream |
| Config | `config.json` rendered by the `isponsorblocktv-config` ExternalSecret; the app never writes it at runtime |
| Devices | Bitwarden secret `isponsorblocktv-devices`, a JSON array of paired screens |
| Skipped | `sponsor`, `selfpromo`, `interaction`; ads muted and skipped |
| Backup | none: everything is in the manifests and Bitwarden |

With an empty device list the app exits, so the pod crash-loops until at least one screen is
paired.

## Pair a screen

Pairing turns a short-lived TV code into a permanent `screen_id`. The setup wizard in the
image (`--setup-cli`) writes into a volume this deployment does not have, so pair by calling
the same endpoint it does.

1. On the TV: YouTube, Settings, Link with TV code. The code is valid for a few minutes.
2. Exchange it for a screen ID:

   ```bash
   curl -s -X POST https://www.youtube.com/api/lounge/pairing/get_screen \
     -d pairing_code=<code without dashes or spaces> | jq '.screen | {screenId, name}'
   ```

3. Add `{"screen_id": "<screenId>", "name": "<room>", "offset": 0}` to the array in
   `isponsorblocktv-devices`:

   ```bash
   BWS_ACCESS_TOKEN=$(bws-token) bws secret edit 808075d5-7448-4d15-b955-b4f300e23253 \
     --value '[{"screen_id": "...", "name": "Living room", "offset": 0}]' | jq '{id, key}'
   ```

4. Force a refresh so Reloader restarts the pod:

   ```bash
   kubectl -n isponsorblocktv annotate externalsecret isponsorblocktv-config \
     force-sync=$(date +%s) --overwrite
   ```

The log shows `Refreshed auth` per device, and `Connected to device` once YouTube is open on
the TV. YouTube revokes screen IDs from time to time; when a device stops reconnecting, pair it
again.
