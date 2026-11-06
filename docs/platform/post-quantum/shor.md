# Shor on a real quantum computer

RSA is safe because a classical computer needs longer than anyone has to split a large
number into its two prime factors. Shor's algorithm does it in polynomial time on a quantum
computer. `quantum/shor/` runs it on the smallest useful cases, N=15 and N=21, on a noiseless
simulator and on a real superconducting chip. The result puts a number on how far today's
hardware is from RSA-2048.

## How the circuit factors

Shor turns factoring into a search for the period r of `a^x mod N` for a chosen a. Once r is
known, `gcd(a^(r/2) ± 1, N)` gives the factors.

Each circuit has 5 qubits:

1. Three counting qubits go into superposition, so they hold 0 to 7 at once.
2. Counting qubit j controls 2^j applications of "multiply by a mod N" on two work qubits.
   This writes the period into the phases of the counting register.
3. An inverse quantum Fourier transform turns those phases into peaks at multiples of 8/r.
4. Measurement gives a value y. The continued-fraction expansion of y/8 gives r.

| N | a | Period r | Peaks at y | Factors | Shots that factor (ideal) |
|---|---|---|---|---|---|
| 15 | 7 | 4 | 0, 2, 4, 6 | 3 × 5 | 50% |
| 21 | 4 | 3 | 0, 3, 5 | 3 × 7 | 47% |

Half the shots of an ideal run already say nothing. y=0 carries no information, and for N=15
y=4 gives r=2, which fails the check. That is normal for Shor. It is why the algorithm runs
again until a period passes the check.

N=21 with a=4 has an odd period, which usually fails. It works here because 4 = 2²:
`2^3 = 8`, and `gcd(7, 21) = 7`, `gcd(9, 21) = 3`.

## The circuits are compiled

The work register only holds the values that `a^x mod N` visits: 1 → 7 → 4 → 13 for
N=15, and 1 → 4 → 16 for N=21. Two qubits are enough for either, so "multiply by a" becomes
a small counter instead of a general modular multiplier. To build that counter, you need
the answer in advance.

Every hardware demonstration of Shor so far is compiled like this (Smolin, Smith and
Vargo, "Pretending to factor large numbers on a quantum computer", 2013). The circuits test
whether a chip can carry the interference pattern that Shor relies on. They do not test
whether it can factor a number it does not know. The N=21 encoding follows Skosana and
Tame (2021).

A general-purpose run against RSA-2048 needs about a million noisy physical qubits that run
for days (Gidney, 2025). The largest chips today have a few hundred to about a thousand.

## Running it

```bash
cd quantum/shor
make sim                        # noiseless simulator, no account needed
make backends                   # chips the token can see
make hardware BACKEND=ScQ-P5    # submit both circuits, poll until they complete
```

Results are written to `quantum/shor/results/` as JSON. The JSON holds the decoded counts,
the raw bitstrings, the share of shots that factor, and, for hardware runs, the task id and
the circuit as the chip transpiled it.

## Quafu

The hardware is [Quafu](https://quafu.baqis.ac.cn), the quantum cloud of the Beijing Academy
of Quantum Information Sciences. Sign-up needs an email and a phone number. A Norwegian
number works. The API token is in the macOS Keychain as service `quafu`. The Makefile passes
it to the container as `QUAFU_TOKEN`.

A free account can submit only to ScQ-P5 (5 qubits) and the ScQ-Sim10 simulator. It gets
1000 tasks a month. `make backends` lists every chip Quafu has, including the 100+ qubit
ones. A submit to one of those fails with "you do not have permission to use this chip"
and does not spend a task.

A chip listed as Online may not be running jobs. Compare the queue length from
`make backends` a few hours apart before you wait on it.

`make hardware` writes the task ids to `results/pending-<backend>.json` before it polls.
A rerun picks up those tasks instead of submitting new ones.

## Traps

- pyquafu publishes Linux wheels for x86_64 only, so the container runs as `linux/amd64`.
  An arm64 Mac emulates it.
- Under that emulation the bundled C++ simulator (`quafu.simulate`) hangs. `make sim` uses
  the pure-Python `py_simulate` instead, which handles 5 qubits instantly.
- Quafu bitstrings put classical bit 0 first. The script reverses them so the counting
  register reads as a little-endian number. With the wrong order, N=15 peaks at 0 to 3
  instead of 0, 2, 4, 6.
- Period recovery has to try every continued-fraction convergent of y/8.
  `Fraction.limit_denominator(N)` returns 3/8 for y=3, while the period comes from the
  convergent 1/3.
