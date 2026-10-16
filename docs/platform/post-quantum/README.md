# Post-quantum readiness

A large enough quantum computer running Shor's algorithm breaks RSA and elliptic-curve
cryptography, which is what TLS and SSH use to agree on keys and to sign certificates. No
such machine exists yet. The risk today is "harvest now, decrypt later": traffic recorded now
can be decrypted once one does. Key exchange is what has to move first, because a recorded
session stays recorded. Signatures only need to be safe at the moment they are checked.

This area holds two things:

- [Shor on a real quantum computer](shor.md): how far today's hardware is from breaking
  RSA, measured by factoring 15 and 21 on a public quantum cloud.
- The crypto inventory below: which encrypted paths in the homelab already use a
  quantum-safe key exchange.

## Crypto inventory

Hybrid key exchange (`X25519MLKEM768` for TLS, `mlkem768x25519-sha256` or
`sntrup761x25519-sha512` for SSH) combines a classical curve with a post-quantum one, so the
session is safe if either holds.

| Path | Key exchange | Quantum-safe | Certificate signature |
|---|---|---|---|
| Cloudflare edge (public sites) | X25519MLKEM768 | yes | ECDSA P-256 |
| Traefik, `*.local.bigd.no` | X25519MLKEM768 | yes | RSA-2048 |
| kube-apiserver `:6443` | X25519MLKEM768 | yes | ECDSA P-256 |
| Talos API `:50000` | X25519MLKEM768 | yes | Ed25519 |
| etcd `:2379` | X25519MLKEM768 | yes | ECDSA P-256 |
| Proxmox UI `:8006` | X25519MLKEM768 | yes | RSA-2048 |
| PBS `:8007`, the PVE to PBS backup stream | X25519 | no | RSA-4096 |
| Synology DSM `:5001` | X25519 | no | RSA-2048 |
| SSH to Proxmox and PBS | mlkem768x25519 / sntrup761x25519 | yes, with the client fix below | |
| SSH to the Synology | curve25519 | no | |

Everything written in Go (Traefik, Talos, the Kubernetes API, etcd) and Cloudflare negotiates
the hybrid group by default. None of it needed a config change.

The gaps:

- PBS runs on Debian 12 (OpenSSL 3.0, OpenSSH 9.2), which has no ML-KEM. PBS 4 on Debian 13
  does.
- The Synology ships its own OpenSSH 8.2 and TLS stack, so it waits on the vendor.
- No public CA issues post-quantum (ML-DSA) certificates yet, so every signature column stays
  classical. That is the less urgent half.

## The macOS SSH trap

macOS ships `/etc/ssh/crypto.conf`, which includes `crypto/apple.conf` and sets
`KexAlgorithms ^ecdh-sha2-nistp256`. The `^` moves NIST P-256 to the front, so every session
from a Mac uses a classical key exchange even when both ends support ML-KEM. The homelab
host blocks in `~/.ssh/config` put the hybrid algorithms back in front:

```
KexAlgorithms ^mlkem768x25519-sha256,sntrup761x25519-sha512
```

## Checking a path

TLS, from an OpenSSL 3.5 or newer client:

```bash
openssl s_client -connect <host>:<port> -groups X25519MLKEM768 </dev/null 2>&1 \
  | grep -E "Negotiated TLS1.3 group|Server Temp Key"
```

A handshake that fails with only `X25519MLKEM768` offered means the server has no hybrid
support. SSH:

```bash
ssh -v <host> exit 2>&1 | grep "kex: algorithm"
```

The installed blackbox exporter reports the TLS version and cipher but not the negotiated
group, so it cannot watch this yet.
