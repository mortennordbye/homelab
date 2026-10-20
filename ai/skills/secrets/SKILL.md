---
name: secrets
description: How secrets and passwords work for Morten's homelab and projects - Bitwarden Secrets Manager (bws) for anything a cluster, script or agent reads, the Bitwarden vault (bw) for human sign-ins, ExternalSecrets, Reloader. Use whenever a task needs a secret, API key, token, password or login - creating, storing, rotating or reading one, wiring an ExternalSecret, a pod missing a credential, a laptop tool needing a device key (Hue bridge and the like), creating an admin account for a new app, or "save this password", "where is the password for", "add it to Bitwarden".
---

# Secrets and passwords

No secret value is ever committed, printed, or pasted into a transcript. Git holds
references (Bitwarden UUIDs) only. Background and the full pattern:
`docs/platform/secrets/README.md` in the homelab repo.

## Two stores, split by who reads the value

| Store | Holds | Read by |
|---|---|---|
| Secrets Manager, project `Homelab` (`1ea61322-5f4a-44a4-b4d0-b29b00ba1134`) | everything a cluster workload, script or agent reads, including laptop-only device keys | ESO and the agent, each with its own access token on the `Homelab` machine account |
| Bitwarden vault, folder `Homelab` | Morten's own sign-ins, and the agent's bootstrap token | Morten only |

The agent never unlocks the vault (`bw`). If a value must be readable by a machine or
the agent, it belongs in Secrets Manager; if only Morten types it, the vault.

## The agent's token

```bash
BWS_ACCESS_TOKEN=$(bws-token) bws secret ...
```

`bws-token` prints the `agent` access token: `$BWS_ACCESS_TOKEN` if set
(cloud sessions), else the macOS Keychain item `bws-agent`, else
`~/.config/bws/token`. Never echo it or put it on a command line by value.

If it says there is no token on this machine, stop and ask Morten to run, in his own
terminal (it prompts for the master password):

```bash
~/Documents/Code/github/Homelab/ai/skills/secrets/bws-token setup
```

That copies the vault item `bws agent token` into the local store, puts `bws-token` and
`vault-add` on PATH (`~/.local/bin`), and links this skill into the global skill folder
of each agent installed (`~/.claude`, `~/.codex`, `~/.agents`). For a cloud session, the token goes in the
environment's secrets as `BWS_ACCESS_TOKEN`.

## Creating a secret

The value comes from a generator or a file, never typed into the command, and only the
id is printed:

```bash
BWS_ACCESS_TOKEN=$(bws-token) bws secret create <consumer>-<what> "$(openssl rand -hex 32)" <project-id> \
  | jq -r .id
```

- Names: lowercase kebab-case naming the consumer (`innestemme-hue-app-key`). The k8s
  `secretKey` is separate, usually SCREAMING_SNAKE_CASE. Notes stay empty.
- A value that arrives from an API (a token an app just minted) goes straight from the
  response into `bws secret create` in the same command, never through a variable that
  outlives it or a file.
- For a cluster app, put the UUID in the app's ExternalSecret (copy the entries already
  there; UUIDs are safe to commit) and open a PR. It deploys on merge.

## A sign-in for Morten

When the agent creates a human login (an app's admin account, a service UI user):

1. Generate the password and store it in `Homelab` as above.
2. Give Morten the command to copy it into his vault, filled in:

   ```bash
   vault-add "<App> admin" <username> <bws-secret-id> https://<app-url>
   ```

   It unlocks the vault on his side, creates a login in the `Homelab` folder and prints
   only the item name and id.

## Reading, rotating, finding

- Never run `bws secret list` or `bws secret get` unfiltered: the JSON holds plaintext
  values. List with `jq -r '.[] | "\(.id) \(.key)"'`. A `get` for use pipes `.value`
  straight into the consumer.
- Rotate with `bws secret edit <uuid> --value "$(...)"`; the UUID stays, so no manifest
  change.
- ExternalSecrets refresh hourly. Force it:
  `kubectl annotate externalsecret <name> -n <ns> force-sync=$(date +%s) --overwrite`.
- Pods with `reloader.stakater.com/auto: "true"` restart on their own when the Secret
  changes; others need `kubectl rollout restart`.
- Checking a Secret has its keys needs no values: `kubectl describe secret <name> -n <ns>`.

## Device credentials

Keys for LAN devices driven from the laptop live in `Homelab` too, and a gitignored
`<thing>.env` resolves them at source time:

```bash
export HUE_APPLICATION_KEY="$(BWS_ACCESS_TOKEN=$(bws-token) bws secret get <uuid> --output json | jq -r .value)"
```

`**/*.env` is gitignored, so the file must be named `<thing>.env`, not `.env.<thing>`.

Hue bridge (10.3.10.16, Hue Bridge Pro): a new key needs the round link button pressed,
then within 30 s a POST to `https://10.3.10.16/api` with `{"devicetype":"<app>#<device>"}`
(add `"generateclientkey": true` for an Entertainment API client key). Loop the POST in
the background and pipe the `username` from the response into `bws secret create`, then
tell Morten to press the button.

## Gotchas

- `bws secret create` failing with "Resource not found" (404) means the token can only
  read that project, not a wrong project id.
- Bitwarden rate-limits bursts with 429 "Slow down!". When the value was just minted
  by another API and exists nowhere else, retry the `bws secret create` a few times with
  a short sleep, and revoke the minted credential if it still fails.
- `bws project list` returning `[]` does not mean the token is broken; judge by a
  filtered `bws secret list`.
- An ExternalSecret in `SecretSyncedError` with no clear cause: the ESO account cannot
  see the item, or `bitwarden-sdk-server` kept an expired TLS cert (restart it
  in `external-secrets`).
- brew's `bw` is the Password Manager CLI; `bws` is the Secrets Manager CLI, installed
  from the `bitwarden/sdk-sm` GitHub release (`bws-aarch64-apple-darwin-*.zip`, checked
  against the release's sha256 file) into `/opt/homebrew/bin`.
