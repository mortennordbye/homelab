# innestemme

innestemme is a local voice assistant that replaces Home Assistant's Assist pipeline on the
living room Voice PE. It connects to the device over the ESPHome native API, listens with
Whisper, answers with its own skills and Home Assistant, and speaks with Pocket TTS. Its image,
`ghcr.io/mortennordbye/innestemme`, is built in the separate `mortennordbye/innestemme` repo.
The manifests live in
[`k8s/talos/apps/innestemme/`](../../../k8s/talos/apps/innestemme/kustomization.yaml).

| | |
|---|---|
| Namespace | `innestemme` |
| VIP | `10.3.10.99:9090`, spoken answers and `/metrics` |
| Device | Voice PE "Home Assistant Voice 0a1f4d", `10.3.20.67` on IoT, area Living Room |
| Answers | announced on the living room Sonos, `media_player.living_room`, at volume 0.65 |
| Delivery | tag pinned in `kustomization.yaml`, bumped by hand |
| Backup | none: the volume is a model cache that downloads again |
| Wake words | Okay Nabu, Hey Jarvis (`satellite-wake-words`) |

## How a request flows

1. The pod dials the Voice PE on `10.3.20.67:6053` (Noise-encrypted) and takes its microphone.
   Trusted to IoT is open, so no firewall rule is needed for this direction.
2. The device detects "Okay Nabu" on its own and streams the request.
3. The engine answers from its rules and Home Assistant (`home-assistant` Service). No
   language model is configured, so a request the rules do not understand gets a short fallback.
4. Home Assistant announces the answer on the Sonos (`answer-player`), which downloads it from
   `http://10.3.10.99:9090/speech/<id>.wav`. Without `answer-player` the Voice PE plays it
   itself; IoT may only reach that one address and port, from the Voice PE's MAC:
   `voice_pe_to_innestemme` in
   [`terraform/unifi/network/firewall.tf`](../../../terraform/unifi/network/firewall.tf).

## Configuration

Settings are the `innestemme-config` ConfigMap, one `voice-engine --help` option per key.
Reloader restarts the pod when it changes. `innestemme-secret` comes from Bitwarden:

| Key | Bitwarden secret | Holds |
|---|---|---|
| `HA_TOKEN` | `innestemme-ha-token` | Home Assistant long-lived token `ai-voice` |
| `VOICE_SATELLITE_KEY` | `innestemme-satellite-key` | the Voice PE's API encryption key (base64) |
| `VOICE_ADDRESS` | `innestemme-address` | street address for weather and departures |

The satellite key is the `noise_psk` Home Assistant set when the device was added, in the
ESPHome entry of `/config/.storage/core.config_entries` on the HA box. Re-adding the device
in Home Assistant can generate a new key; update the Bitwarden secret when that happens.

## Home Assistant side

- The device's Assist satellite entity is disabled, so Home Assistant keeps the LED ring,
  volume and mute but leaves the voice to innestemme. Re-enable it to fall back to Assist.
- The engine finds the room from the device's area in Home Assistant, looked up by the device
  name. Renaming the device in Home Assistant breaks that lookup; set `room` in the ConfigMap
  if it is renamed.
- The engine sets the device's wake words (`satellite-wake-words`) each time it connects. The wake
  word selects in Home Assistant go through the disabled satellite entity and do nothing; the
  sensitivity select is the device's own and still works.
- Firmware 26.9.0 offers only on-device wake words, so the engine's own name ("Homie") is not
  used on the device.

## Operating

- Only one engine can hold the device. Stop any laptop instance before the pod starts, or the
  two take turns connecting.
- Logs: `kubectl -n innestemme logs deploy/innestemme`. A working start logs
  `satellite connected` and `satellite room from home assistant`.
