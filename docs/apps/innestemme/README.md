# innestemme

innestemme is a local voice assistant that replaces Home Assistant's Assist pipeline on the
living room Voice PE. It connects to the device over the ESPHome native API, hears "Hey Jarvis"
with openWakeWord, transcribes with Parakeet, answers with its own skills and Home Assistant as
"Jarvis" in a butler's style, and speaks with Kokoro (voice `am_onyx`) from a sidecar container.
How the engine works is in the innestemme repo's `docs/`. Its image,
`ghcr.io/mortennordbye/innestemme`, is built in the separate `mortennordbye/innestemme` repo.
The manifests live in
[`k8s/talos/apps/innestemme/`](../../../k8s/talos/apps/innestemme/kustomization.yaml).

| | |
|---|---|
| Namespace | `innestemme` |
| VIP | `10.3.10.99:9090`: spoken answers, `/metrics`, and the skills page at `/`, which is also at `https://jarvis.local.bigd.no` through the private gateway |
| Device | Voice PE "Home Assistant Voice 0a1f4d", `10.3.20.67` on IoT, area Living Room |
| Answers | announced on the living room Sonos, `media_player.living_room`, at volume 0.50; "Hey Jarvis" over an answer interrupts it |
| Voice | Kokoro-FastAPI sidecar on `localhost:8880`, voice `am_onyx`; rendered speech kept in `/models/speech-cache` |
| Name and style | `wake-name: Jarvis`, `honorific: sir` ("As you wish, sir.") |
| Delivery | Kargo project `innestemme-cd`: each build opens a promotion PR; merging it deploys ([kargo.md](../../platform/delivery/kargo.md)) |
| Backup | none: the volume is a model cache that downloads again |
| Wake words | Hey Jarvis, detected in the engine (openWakeWord, `wake-model`, `wake-threshold: 0.65`) on the device's continuous stream |
| Firmware | innestemme's `firmware/` build (26.9.0 plus a patch), "Wake word in innestemme" switch on |
| Unhandled requests | `/models/unhandled.jsonl` (`unhandled-log`), listed on the web page |

## How a request flows

1. The pod dials the Voice PE on `10.3.20.67:6053` (Noise-encrypted) and takes its microphone.
   Trusted to IoT is open, so no firewall rule is needed for this direction.
2. The device streams its microphone all the time; the engine scores it with openWakeWord
   (`wake-model: hey_jarvis`, `wake-threshold: 0.65`) and takes what follows "Hey Jarvis".
3. Parakeet TDT 0.6B (int8) transcribes the request, and the engine answers from its rules and
   Home Assistant (`home-assistant` Service). A complete command is acted on after 0.24 s of quiet,
   anything else after 0.64 s. Home Assistant writes (lights, scenes, the phone's ring) are queued,
   so the answer does not wait for the Hue lights. No language model is configured, so a request
   the rules do not understand gets a short "didn't catch that" (only when the name was in the
   wake word; a false wake by the TV stays silent).
4. Speech: about 4,600 fixed sentences (openers, remarks, lead-ins, jokes, confirmations, every
   volume level and minute of the day, this home's lights and room temperatures) are rendered once
   by Kokoro in idle time and kept on the models volume (`/models/speech-cache`, about 560 MB);
   only other sentences with live data are synthesized per request, 1 to 3 s each on the node CPU.
   A slow answer (weather, departures, prices, what's on, who's home) opens with a kept lead-in
   ("Checking the forecast, sir.") while its data sentence is synthesized. A sentence heard before
   it was rendered is logged as `speech not rendered ahead`.
5. Home Assistant announces the answer on the Sonos (`answer-player`), which downloads it from
   `http://10.3.10.99:9090/speech/<id>.wav` while it is still being synthesized. Without `answer-player` the Voice PE plays it
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
| `VOICE_HUE_APP_KEY` | id `32ceeacb-…` | innestemme's key on the Hue bridge, for party mode |
| `VOICE_HUE_CLIENT_KEY` | id `2e946f69-…` | the bridge's Entertainment stream key |

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
- The device runs innestemme's firmware: with its "Wake word in innestemme" switch on it streams the
  microphone continuously and the engine detects the wake word. Turning the switch off in Home
  Assistant goes back to the device's own wake word without a flash; the engine still works then.
  Rolling back fully: flash the official 26.9.0 binary (`esphome upload ... --file`).

## Operating

- Only one engine can hold the device. Stop any laptop instance before the pod starts, or the
  two take turns connecting.
- Logs: `kubectl -n innestemme logs deploy/innestemme`. A working start logs
  `satellite connected` and `satellite room from home assistant`.
- Work on the engine from a Mac against the real device: scale the pod to zero
  (`kubectl -n innestemme scale deploy/innestemme --replicas=0`; Argo CD ignores replicas), run
  `make kokoro` and `make satellite` in the innestemme repo, and scale back to one afterwards.
- The skills page (`https://jarvis.local.bigd.no`) lists every skill with its data source, the calls it
  makes and example phrases, shows how a typed phrase is parsed, and "Hear response" speaks the
  answer in the browser for requests that change nothing.

## Kokoro sidecar

`ghcr.io/remsky/kokoro-fastapi-cpu`, a native sidecar (an init container with `restartPolicy:
Always`) so the engine starts only once Kokoro answers `/health`; the engine checks its voices at
start-up. The model is in the image (`DOWNLOAD_MODEL=false`) and it runs as the image's own user
1000. `OMP_NUM_THREADS`/`MKL_NUM_THREADS` are 4 to match its 4-CPU limit: by default PyTorch starts
one thread per node core (8), and in a 2-CPU limit a short answer took 18 to 26 s instead of about 3.

## Troubleshooting

Measured on 2026-10-10, when the assistant "worked once, then stopped":

- **Loud answers deafened the device's wake word detector** (official firmware): after an answer at
  volume 65 it missed normal voices for several seconds. With the wake word detected in the engine
  this no longer applies; answers are at 0.50.
- **Saying "Hey Jarvis" again during a run stops it** (official firmware); the engine logs
  `device ended the run`.
- **Reading the device's own log:** a small aioesphomeapi script calling `subscribe_logs` with the
  `noise_psk`; it shows `Detected 'Hey Jarvis' with sliding average probability is X` and the
  voice assistant's state changes. A detection only logs when it passes the cutoff (0.83 at Very
  sensitive); a voice from 1.5 m scores about 0.85.
- **A stuck device** can be restarted with its Restart button entity (disabled by default in Home
  Assistant) or over the API.
- **Testing without talking:** play a Piper "Hey Jarvis." clip on the Sonos with
  `media_player.play_media` (`announce: true`, `extra.volume`) and read the device log. It is
  audible in the living room.
