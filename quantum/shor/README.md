# Shor on Quafu

Compiled Shor period finding for N=15 (a=7) and N=21 (a=4), 5 qubits each, run on the
noiseless simulator and on a real superconducting chip on the
[Quafu](https://quafu.baqis.ac.cn) cloud. Raw and decoded counts land in `results/`.

```bash
make sim                        # noiseless simulator, no account needed
make backends                   # chips the token can use
make hardware BACKEND=ScQ-P5    # submit, poll until both tasks complete
```

Everything runs in a `linux/amd64` container because pyquafu has no arm64 Linux wheel.
The API token is read from the macOS Keychain (`security add-generic-password -s quafu ...`)
and passed to the container as `QUAFU_TOKEN`; it is never written to disk.

`make hardware` saves the task ids in `results/pending-<backend>.json` before polling, so an
interrupted run resumes on the next invocation instead of submitting again.

How the circuits work, the Quafu account limits and the traps:
[docs/platform/post-quantum/shor.md](../../docs/platform/post-quantum/shor.md).
