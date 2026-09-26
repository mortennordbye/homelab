# Media stack: storage, cleanup and re-encoding

The arr apps, Cleanuparr and Tdarr keep their settings in their own databases on
their config PVCs, not in this repo. This page records the settings that matter so
they can be rebuilt after a lost volume.

## Storage layout and hardlinks

Everything lives on one Synology share, `/volume1/shared-data/media`, mounted at
`/data` in Sonarr, Radarr, Bazarr, Unpackerr and Tdarr.

| Path | Contents |
| ---- | -------- |
| `/data/series` | Sonarr root folder |
| `/data/movies` | Radarr root folder (also the root for all Radarr collections) |
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

## Sonarr and Radarr

- Root folders: `/data/series`, `/data/movies`.
- Media Management: "Use Hardlinks instead of Copy" on.
- Download client qBittorrent: host `qbittorrent.gluetun-vpn`, port `8080`, no SSL.
  Categories `tv-sonarr` and `radarr`.
- Remote path mapping: host `qbittorrent.gluetun-vpn`, remote `/torrents/`, local
  `/data/torrents/`. The host must match the download client host exactly.
- "Remove Failed Downloads" off in both. Almost every torrent is from a private
  tracker, and removing them from qBittorrent risks hit-and-run strikes.
- Seerr default folders: `/data/series` and `/data/movies`.
- General > Backups (also in Prowlarr): interval 1 day, retention 14 days, folder
  `Backups`. The nightly VolSync copy of `/config` carries these zips, and a restore
  starts from the newest zip rather than the live database (`docs/backup-plan.md`).

## Cleanuparr

`https://cleanuparr.local.bigd.no`, admin account in the password manager.

- Download client qBittorrent at `http://qbittorrent.gluetun-vpn:8080`, with the
  qBittorrent exporter credentials.
- Sonarr `http://sonarr:8989` (v4), Radarr `http://radarr:7878` (v6).
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

Libraries `TV` (`/data/series`) and `Movies` (`/data/movies`): flow
`h264ToHevcQsv`, cache `/data/transcode_cache/tdarr`, health checks off,
"skip hardlinked files" on, folder watching on, `@eaDir` ignored, schedule
00:00 to 07:00 every day.

Node: 1 GPU transcode worker, no CPU workers. The worker limit is set on the live
node (Nodes page, or `POST /api/v2/alter-worker-limit`); writing it to the database
alone does nothing.

Re-encoding a file that is hardlinked to a seeding torrent would split it into two
copies again, which is why both the library setting and the flow skip them.
