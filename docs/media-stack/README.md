# Media stack: requests, storage, 4K, cleanup and re-encoding

The arr apps, Cleanuparr and Tdarr keep their settings in their own databases on
their config PVCs, not in this repo. This page records the settings that matter so
they can be rebuilt after a lost volume.

## Overview

| App | URL | Namespace | Role |
| --- | --- | --------- | ---- |
| Seerr | `https://seerr.bigd.no` | `plex-media-stack` | Requests, with a separate "Request in 4K" button |
| Radarr | `https://radarr.local.bigd.no` | `arr-stack` | 1080p movies in `/data/movies` |
| Radarr 4K | `https://radarr-4k.local.bigd.no` | `arr-stack` | 4K movies in `/data/movies-4k` |
| Bazarr, Bazarr 4K | `https://bazarr.local.bigd.no`, `https://bazarr-4k.local.bigd.no` | `arr-stack` | Subtitles for Sonarr and Radarr, and for Radarr 4K |
| Sonarr | `https://sonarr.local.bigd.no` | `arr-stack` | TV in `/data/series` |
| Prowlarr | `https://prowlarr.local.bigd.no` | `gluetun-vpn` | Indexers, sidecar in the VPN pod; reaches the arr apps through `hostAliases` since its DNS goes through the VPN |
| qBittorrent | `https://qbittorrent.local.bigd.no` | `gluetun-vpn` | Downloads, sidecar in the VPN pod |
| Tdarr | `https://tdarr.local.bigd.no` | `arr-stack` | Re-encodes H.264 to HEVC |
| Plex | `http://10.3.10.103:32400/web` | `plex-media-stack` | Playback, libraries below |

A request goes from Seerr to Radarr, Radarr 4K or Sonarr, which search the Prowlarr
indexers and send the torrent to qBittorrent. When it finishes, the arr app hardlinks
the file into its root folder, Plex picks it up, and Tdarr later re-encodes it if it
is H.264 and no longer seeding. All of them have tiles on the hub (`hub.bigd.no`,
`k8s/talos/apps/homepage/values.yaml`).

Plex libraries: `Movies` (`/movies`), `Movies 4K` (`/movies-4k`), `TV Shows` (`/tv`),
`Courses`, `Youtube`. Each is a read-only NFS mount of the matching folder on the
share, declared in `k8s/talos/apps/plex-media-stack/plex.yaml`. A new library folder
must exist on the share before it is added there, or Plex fails to start.

## Storage layout and hardlinks

Everything lives on one Synology share, `/volume1/shared-data/media`, mounted at
`/data` in Sonarr, Radarr, Radarr 4K, Bazarr, Unpackerr and Tdarr.

| Path | Contents |
| ---- | -------- |
| `/data/series` | Sonarr root folder |
| `/data/movies` | Radarr root folder (also the root for all Radarr collections) |
| `/data/movies-4k` | Radarr 4K root folder |
| `/data/torrents/download` | qBittorrent incomplete downloads |
| `/data/torrents/completed` | qBittorrent completed torrents, still seeding |
| `/data/transcode_cache/tdarr` | Tdarr work files |

Library and torrents must stay on the same mount. Linux cannot hardlink across two
mounts, so with separate `/tv` and `/torrents` mounts the arr apps silently copy every
import and each seeding torrent costs a second full copy on the NAS.

qBittorrent is not part of this: it still mounts only `/torrents` (the torrents
folder) and reports paths like `/torrents/completed/...`. Sonarr and Radarr translate
those with a remote path mapping.

Check that an import was hardlinked: `stat -c %h <library file>` shows `2` while the
torrent is still in qBittorrent.

## Seeding

Almost every torrent is from a private tracker, and stopping one before the tracker's
minimum earns a hit-and-run strike. Every layer is set so nothing stops or removes a
torrent early:

| Layer | Setting |
| ----- | ------- |
| Prowlarr, per indexer (synced to Sonarr, Radarr, Radarr 4K) | IPTorrents, IPTorrents-Freeleech, TorrentDay, TorrentLeech: seed ratio 5, no seed time. NorBits: no limit. YTS (public): no limit |
| qBittorrent, global | no ratio, seeding time or inactivity limit; queueing off, so every torrent seeds |
| Sonarr | "Remove Completed" on: removes a torrent only after qBittorrent stopped it at ratio 5 |
| Radarr, Radarr 4K | "Remove Completed" off |
| All arrs | "Remove Failed" off |
| Cleanuparr | "Delete Private" off, Download Cleaner off |
| Tdarr | skips hardlinked files (library filter and flow), so a seeding file is never split |
| Moves inside `/data` | renames on one share keep the inode, so the torrent keeps its data |

Tracker hit-and-run rules, all "ratio or time", so a ratio 5 stop is past every one:

| Tracker | Rule |
| ------- | ---- |
| TorrentLeech | 1:1, or the class minimum (10 days Registered, down to none for VIP) |
| IPTorrents | 1:1, or 14 days; overall ratio above 0.3 |
| TorrentDay | 1:1, or 72 hours |

TorrentLeech is from its wiki (`wiki.torrentleech.org/doku.php/hnr`); the other two
from public guides, since their rules pages need a login.

qBittorrent stops a torrent at the ratio or the time limit, whichever comes first. A
ratio limit is only safe for a tracker whose rule is "ratio or time". A tracker that
demands a minimum seed time regardless of ratio needs its ratio limit removed in
Prowlarr, as for NorBits.

Check: `stoppedUP` or `missingFiles` in qBittorrent's torrent list should be empty.

## Sonarr and Radarr

- Root folders: `/data/series`, `/data/movies`.
- Media Management: "Use Hardlinks instead of Copy" on.
- Download client qBittorrent: host `qbittorrent.gluetun-vpn`, port `8080`, no SSL.
  Categories `tv-sonarr` and `radarr`.
- Remote path mapping: host `qbittorrent.gluetun-vpn`, remote `/torrents/`, local
  `/data/torrents/`. The host must match the download client host exactly.
- "Remove Failed Downloads" off in both. Almost every torrent is from a private
  tracker, and removing them from qBittorrent risks hit-and-run strikes.
- "Remove Completed Downloads": on in Sonarr, off in Radarr and Radarr 4K. The arr app
  only removes a torrent once qBittorrent has stopped it at its seeding limit.
- qBittorrent categories: `tv-sonarr`, `radarr`, `radarr-4k`, plus the manual ones
  (`PC`, `iptorrent`, `norbits`). Each arr creates its own on the first connection test.
- Seerr default folders: `/data/series` and `/data/movies`; 4K requests go to
  Radarr 4K (below).
- General > Backups (also in Radarr 4K and Prowlarr): interval 1 day, retention 14 days, folder
  `Backups`. The nightly VolSync copy of `/config` carries these zips, and a restore
  starts from the newest zip rather than the live database (`docs/backups.md`).

## Radarr 4K

`https://radarr-4k.local.bigd.no`, a second Radarr for films kept in 4K. A 4K film
lives only here: it is not also tracked by the main Radarr, so there is no 1080p
copy unless someone requests one in Seerr. Radarr tracks one file per movie, so 4K
needs its own instance and root folder; two instances sharing `/data/movies` would
delete each other's files on upgrade.

- Root folder `/data/movies-4k`, owned by the Synology share user with mode 777.
- Media Management and file naming copied from Radarr (hardlinks on).
- Download client qBittorrent, same host, user and remote path mapping as Radarr,
  category `radarr-4k`, "Remove Completed" and "Remove Failed" off.
- Quality profile `2160p`: WEB 2160p and Bluray-2160p, no remux, cutoff WEB 2160p,
  upgrades on. Existing remuxes rank above the cutoff, so Radarr 4K keeps them rather
  than swapping in a smaller WEB release. Custom format "DV (w/o HDR fallback)" from TRaSH
  (`docs/json/radarr/cf/dv-wo-hdr-fallback.json`) scored -10000, since those files
  play with purple and green colours on screens without Dolby Vision.
- Indexers: synced by Prowlarr, where Radarr 4K is its own app
  (`https://radarr-4k.local.bigd.no`, full sync, movie categories).
- Seerr: Radarr server "Radarr 4K", hostname `radarr-4k.local.bigd.no` port 443 SSL,
  "4K Server" and "Default Server" on, profile `2160p`, root `/data/movies-4k`.
- Plex: `Movies 4K` library, shared only with users whose devices play 4K HDR, so
  nobody else forces a 4K HDR transcode on the iGPU.
- Tdarr: library `Movies 4K` with the same flow. Today every file is HEVC and is skipped;
  it is there to catch a 2160p H.264 release, which is SDR, so re-encoding loses no HDR.
- Bazarr 4K: subtitles, see below.
- Cleanuparr: its own Radarr instance, `http://radarr-4k:7878`.
- Unpackerr: `UN_RADARR_1_*` in `k8s/talos/apps/arr-stack/unpackerr.yaml`.
- Metrics: `exportarr-radarr-4k`, so the Radarr alerts in
  `k8s/talos/infra/kube-prometheus-stack/homelab-alerts.yaml` cover it too.
- Hub tile with a widget. Its API key, used by all of the above in Git, is Bitwarden
  secret `homepage-radarr-4k-api`.

Moving an existing 1080p-library film to 4K only: move its folder from
`/data/movies` to `/data/movies-4k` (same share, so a rename that keeps hardlinks),
add it in Radarr 4K with that path and profile `2160p` without searching, then
delete it from Radarr with "Delete files" off. Check first that its collection is
not monitored in Radarr, or Radarr adds it back and downloads a 1080p copy.

## Seerr and Tautulli

Both reach Plex at `plex.plex-media-stack`, port `32400`, no SSL: the Service name,
never the Plex pod IP or the `*.plex.direct` name Plex offers during setup, which
encodes the pod IP. The pod IP changes on every Plex restart, and then scans,
availability and activity silently time out.

Seerr (`https://seerr.bigd.no`):

- Plex libraries enabled: `Movies`, `Movies 4K`, `TV Shows`, `Courses`, `Youtube`. A new
  Plex library only shows up after Settings > Plex > Sync Libraries, and stays disabled
  until it is ticked.
- Servers: Radarr (1080p, default, profile `HD - 720p/1080p`, `/data/movies`),
  Radarr 4K (4K, default, profile `2160p`, `/data/movies-4k`), Sonarr (default,
  `/data/series`). There is no 4K Sonarr.
- After moving films between libraries, run the "Media Availability Sync" job so the
  old 1080p status is cleared and the film can be requested in 1080p again.

Tautulli (`https://tautulli.local.bigd.no`): Settings > Plex Media Server, same address.
If its websocket logs "401 Unauthorized", the stored Plex token was revoked. Either use
"Fetch New Token" on the same page and sign in with the Plex account, or give it the
server owner's token, `PlexOnlineToken` in Plex's `Preferences.xml`, by running
`$.post('save_pms_token', {token: '<token>'})` in the browser console on Tautulli's
settings page.

## Bazarr and Bazarr 4K

Bazarr connects to one Sonarr and one Radarr, so Radarr 4K has its own instance,
`bazarr-4k`, built from the same settings.

- Both: providers OpenSubtitles.com, YIFY Subtitles and Gestdown; language profile
  "English + Norwegian" (`no`, `en`), the default for new titles; embedded subtitles
  count; upgrades for 7 days. No login page of their own, reachable on the private
  gateway only.
- Bazarr: Sonarr `sonarr.arr-stack.svc.cluster.local:8989`, Radarr
  `radarr.arr-stack.svc.cluster.local:7878`.
- Bazarr 4K: Sonarr off, Radarr `radarr-4k.arr-stack.svc.cluster.local:7878`.
- Rebuilding Bazarr 4K: copy `/config/config/config.yaml` from Bazarr (it carries the
  provider logins), keep the new instance's own `auth.apikey`, set `use_sonarr: false`
  and the Radarr 4K address and key, restart. The language profile lives in the
  database, so create it again (Settings > Languages) and assign it to the films.
- Each has an exporter (`exportarr-bazarr`, `exportarr-bazarr-4k`) and a hub tile; the
  4K key is Bitwarden secret `homepage-bazarr-4k-api`.

## Cleanuparr

`https://cleanuparr.local.bigd.no`, admin account in the password manager.

- Download client qBittorrent at `http://qbittorrent.gluetun-vpn:8080`, with the
  qBittorrent exporter credentials.
- Sonarr `http://sonarr:8989` (v4), Radarr `http://radarr:7878` (v6), Radarr 4K
  `http://radarr-4k:7878` (v6).
- Queue Cleaner, every 5 min, failed imports at 3 strikes:
  Ignore Private off, Delete Private off, Skip if not found in client on,
  Force Import on (3 tries), pattern mode Exclude with `matched to series by ID`
  and `matched to movie by ID`. No stall or slow rules.
- Malware Blocker, every 5 min: blocklist
  `https://cleanuparr.pages.dev/static/blacklist_permissive` for Sonarr and Radarr,
  Ignore Private off, Delete Private off.
- Seeker: search on, proactive search off.
- Download Cleaner: off.

Delete Private off is the rule that keeps private torrents seeding: Cleanuparr then
only removes the item from the arr queue and leaves the torrent in qBittorrent.

## Tdarr

`https://tdarr.local.bigd.no`. Server with an internal node on `genesis-worker-01`,
using the iGPU through Quick Sync (shared with Plex, see
`k8s/talos/infra/intel-gpu-plugin/daemonset.yaml`).

Flow `h264ToHevcQsv`, stored in `tdarr-flow-h264ToHevcQsv.json` next to this file:

1. Only H.264 video continues.
2. Skip files with more than one link (still seeding) and anything with `remux` in
   the path.
3. Encode video to HEVC with QSV, preset slow, quality 23, audio and subtitles copied.
4. Replace the original only when the new file is 20 to 85 percent of the old size.

Restore it with:

```bash
jq -c '{data:{collection:"FlowsJSONDB", mode:"insert", docID:._id, obj:.}}' docs/media-stack/tdarr-flow-h264ToHevcQsv.json \
  | curl -s -H 'Content-Type: application/json' https://tdarr.local.bigd.no/api/v2/cruddb -d @-
```

Libraries `TV` (`/data/series`), `Movies` (`/data/movies`) and `Movies 4K`
(`/data/movies-4k`): flow
`h264ToHevcQsv`, cache `/data/transcode_cache/tdarr`, health checks off,
"skip hardlinked files" on, folder watching on, `@eaDir` ignored, schedule
00:00 to 07:00 every day. Scanner: 4 threads, MediaInfo scan off, since the flow only
reads ffprobe data and each extra scanner reads every file again over NFS. FFprobe and
ExifTool always run; the UI shows them as fixed ON.

These are the target settings. While the H.264 backlog is worked through, both
libraries run all day and the node has 2 GPU workers; BACKLOG tracks switching back.

Node: 1 GPU transcode worker, no CPU workers. The worker limit is set on the live
node (Nodes page, or `POST /api/v2/alter-worker-limit`); writing it to the database
alone does nothing.

Re-encoding a file that is hardlinked to a seeding torrent would split it into two
copies again, which is why both the library setting and the flow skip them.
