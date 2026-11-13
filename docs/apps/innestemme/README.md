# innestemme

innestemme is a local voice assistant. It replaces Home Assistant's Assist pipeline on the
living room Voice PE. It connects to the device over the ESPHome native API. It hears "Hey Jarvis"
with openWakeWord and transcribes with Parakeet. It answers as "Jarvis", in a butler's style, with
its own skills and Home Assistant. It speaks with Kokoro (voice `am_onyx`) inside the engine.
The innestemme repo's `docs/` describes how the engine works. The separate
`mortennordbye/innestemme` repo builds its image, `ghcr.io/mortennordbye/innestemme`.
The manifests live in
[`k8s/talos/apps/innestemme/`](../../../k8s/talos/apps/innestemme/kustomization.yaml).

| | |
|---|---|
| Namespace | `innestemme` |
| VIP | `10.3.10.99:9090`: spoken answers, `/metrics`, and the skills page at `/`, which is also at `https://jarvis.local.bigd.no` through the private gateway |
| Phone | `POST https://jarvis.local.bigd.no/api/ask?q=...` with `Authorization: Bearer <ask-token>` (Secrets Manager `innestemme-ask-token`, env `VOICE_ASK_TOKEN`): the iPhone shortcut "Jarvis" sends a dictated request and speaks the answer; LAN or Tailscale only |
| Device | Voice PE "Home Assistant Voice 0a1f4d", `10.3.20.67` on IoT, area Living Room |
| Answers | announced on the living room Sonos, `media_player.living_room`, at volume 0.50; "Hey Jarvis" over an answer interrupts it |
| Voice | Kokoro inside the engine (sherpa-onnx), voice `am_onyx`; rendered speech kept in `/models/speech-cache` |
| Name and style | `wake-name: Jarvis`, `honorific: sir` ("As you wish, sir."), `honorific-female: ma'am` for female voices, no honorific when the voice is unclear |
| Delivery | Kargo project `innestemme-cd`: each build is promoted straight to main and deployed, then smoke-tested ([kargo.md](../../platform/delivery/kargo.md)); roll back by promoting older Freight |
| Backup | none: the volume is a model cache that downloads again |
| Wake words | Hey Jarvis, detected in the engine (openWakeWord, `wake-model`, `wake-threshold: 0.65`) on the device's continuous stream |
| Firmware | innestemme's `firmware/` build (26.9.0 plus a patch), "Wake word in innestemme" switch on |
| Unhandled requests | `/models/unhandled.jsonl` (`unhandled-log`), listed on the web page |

## How a request flows

[![The Voice PE on the IoT network streams its microphone on port 6053 to the innestemme pod, where openWakeWord, Parakeet speech to text, the rule-based skills and Kokoro text to speech run in turn; the skills read and write Home Assistant, which tells the living room Sonos to announce the answer, and the Sonos downloads the .wav from the LoadBalancer VIP 10.3.10.99:9090](../../assets/diagrams/innestemme-voice.svg)](../../assets/diagrams/innestemme-voice.svg)

1. The pod dials the Voice PE on `10.3.20.67:6053` (Noise-encrypted) and takes its microphone.
   Trusted to IoT is open, so this direction needs no firewall rule.
2. The device streams its microphone all the time. The engine scores the stream with openWakeWord
   (`wake-model: hey_jarvis`, `wake-threshold: 0.65`) and takes what follows "Hey Jarvis".
3. Parakeet TDT 0.6B (int8) transcribes the request. The engine answers from its rules and
   Home Assistant (`home-assistant` Service). The engine acts on a complete command after 0.24 s of
   quiet, and on anything else after 0.64 s. The engine queues Home Assistant writes (lights, scenes,
   the phone's ring), so the answer does not wait for the Hue lights. No language model is
   configured. A request the rules do not understand gets a short "didn't catch that", but only
   when the name was in the wake word. A false wake by the TV stays silent.
4. Speech: Kokoro renders about 4,600 fixed sentences once, in idle time (openers, remarks,
   lead-ins, jokes, confirmations, every volume level and minute of the day, this home's lights and
   room temperatures). They are kept on the models volume (`/models/speech-cache`, about 560 MB).
   Only other sentences with live data are synthesized per request. The engine fetches the home's
   forecast and the electricity prices every 4 minutes, so those answers skip their lead-in.
   A slow answer (weather, departures, prices, what's on, who's home) opens with a kept lead-in
   ("Checking the forecast, sir.") while the engine synthesizes its data sentence. The engine logs
   a sentence heard before it was rendered as `speech not rendered ahead`.
5. Home Assistant announces the answer on the Sonos (`answer-player`). The Sonos downloads the
   answer from `http://10.3.10.99:9090/speech/<id>.wav` while the engine still synthesizes it.
   Without `answer-player` the Voice PE plays the answer itself. IoT may reach only that one
   address and port, and only from the Voice PE's MAC: `voice_pe_to_innestemme` in
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
| `VOICE_PLEX_TOKEN` | `innestemme-plex-token` | the Plex server's own token, for "play <title> on Plex" |

The satellite key is the `noise_psk` that Home Assistant set when the device was added. It is in
the ESPHome entry of `/config/.storage/core.config_entries` on the HA box. Re-adding the device
in Home Assistant can generate a new key. Update the Bitwarden secret when that happens.

## Home Assistant side

- The device's Assist satellite entity is disabled. Home Assistant keeps the LED ring, volume
  and mute, and leaves the voice to innestemme. Re-enable the entity to return to Assist.
- The engine finds the room from the device's area in Home Assistant. It looks the device up by
  name. A rename of the device in Home Assistant breaks that lookup. Set `room` in the ConfigMap
  if you rename the device.
- "Play <title> on Plex" plays through the TV's Cast player as `plex://<key>`. This needs Home
  Assistant's Plex integration (manual setup, `10.3.10.103:32400`, the same token). innestemme
  itself searches `plex-url`, the Plex service in the cluster. The Plex CiliumNetworkPolicy
  lets the innestemme namespace reach it.
- The engine sets the device's wake words (`satellite-wake-words`) each time it connects. The wake
  word selects in Home Assistant go through the disabled satellite entity and do nothing. The
  sensitivity select is the device's own and still works.
- The device runs innestemme's firmware. With its "Wake word in innestemme" switch on, it streams
  the microphone continuously and the engine detects the wake word. Turn the switch off in Home
  Assistant to return to the device's own wake word without a flash. The engine still works then.
  To roll back fully, flash the official 26.9.0 binary (`esphome upload ... --file`).

## Operating

- Only one engine can hold the device. Stop any laptop instance before the pod starts.
  Otherwise the two take turns connecting.
- Logs: `kubectl -n innestemme logs deploy/innestemme`. A working start logs
  `satellite connected` and `satellite room from home assistant`.
- To work on the engine from a Mac against the real device: scale the pod to zero
  (`kubectl -n innestemme scale deploy/innestemme --replicas=0`, Argo CD ignores replicas). Run
  `make kokoro` and `make satellite` in the innestemme repo. Scale back to one afterwards.
- The skills page (`https://jarvis.local.bigd.no`) lists every skill with its data source, the calls it
  makes and example phrases. It shows how the engine parses a typed phrase. "Hear response" speaks
  the answer in the browser for requests that change nothing.

## Kokoro

Kokoro v1.0 runs inside the engine through sherpa-onnx (`english-tts: kokoro-onnx`). The f32 model, its
voices and English pronunciation data (about 380 MB) download into `/models/hub` on first start. It was a
Kokoro-FastAPI sidecar (Python, 1.7 GB resident) until 2026-10-18. In the engine it is 16-31% faster on the
same CPUs (innestemme `docs/benchmarks.md`), so the pod has the 6 CPUs the two shared. Its speech cache is
`/models/speech-cache/kokoro-onnx-am_onyx`. After the switch the about 4,600 fixed sentences render again
in idle time, which takes a few hours. Until then the engine synthesizes some answers when asked.

## Troubleshooting

Measured on 2026-10-10, when the assistant "worked once, then stopped":

- **Loud answers deafened the device's wake word detector** (official firmware): after an answer at
  volume 65 it missed normal voices for several seconds. This no longer applies now that the engine
  detects the wake word. Answers are at 0.50.
- **Saying "Hey Jarvis" again during a run stops it** (official firmware). The engine logs
  `device ended the run`.
- **Reading the device's own log:** a small aioesphomeapi script that calls `subscribe_logs` with the
  `noise_psk`. It shows `Detected 'Hey Jarvis' with sliding average probability is X` and the
  voice assistant's state changes. A detection logs only when it passes the cutoff (0.83 at Very
  sensitive). A voice from 1.5 m scores about 0.85.
- **A stuck device**: restart it with its Restart button entity (disabled by default in Home
  Assistant) or over the API.
- **Testing without talking:** play a Piper "Hey Jarvis." clip on the Sonos with
  `media_player.play_media` (`announce: true`, `extra.volume`) and read the device log. It is
  audible in the living room.
