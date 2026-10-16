"""Compiled Shor period finding for N=15 (a=7) and N=21 (a=4) on Quafu.

Both circuits are "compiled": the work register only holds the orbit of a mod N
in 2 qubits, built from knowing a and N, as in every hardware demonstration of
Shor to date. They test whether a chip can carry the interference, not whether
it can factor. 3 counting + 2 work qubits fits the 5-qubit ScQ-P5.

  python shor.py sim                  noiseless simulator, both N
  python shor.py backends             list the chips this token can use
  python shor.py hardware <backend>   submit both N to a real chip and poll (needs QUAFU_TOKEN)
"""

import json
import math
import os
import sys
import time
from datetime import datetime, timezone
from fractions import Fraction
from pathlib import Path

from quafu import QuantumCircuit, Task, User
from quafu.simulators.default_simulator import ptrace, py_simulate

COUNT = 3
SHOTS = 2000
RESULTS = Path(__file__).parent / "results"


def iqft(qc, qubits):
    n = len(qubits)
    for i in range(n // 2):
        qc.swap(qubits[i], qubits[n - 1 - i])
    for j in range(n):
        for m in range(j):
            qc.cp(qubits[m], qubits[j], -math.pi / 2 ** (j - m))
        qc.h(qubits[j])


def c_mul7_mod15(qc, ctrl, w):
    # The orbit of 7 mod 15 is 1 -> 7 -> 4 -> 13 -> 1, encoded as a 2-bit counter |00> -> |01> -> |10> -> |11>.
    qc.toffoli(ctrl, w[0], w[1])
    qc.cx(ctrl, w[0])


def c_mul4_mod21(qc, ctrl, w):
    # The orbit of 4 mod 21 is 1 -> 4 -> 16 -> 1, encoded as |00> -> |01> -> |10>.
    qc.fredkin(ctrl, w[0], w[1])
    qc.x(w[1])
    qc.toffoli(ctrl, w[1], w[0])
    qc.x(w[1])


CASES = {
    15: {"a": 7, "mul": c_mul7_mod15},
    21: {"a": 4, "mul": c_mul4_mod21},
}


def build(n):
    case = CASES[n]
    count = list(range(COUNT))
    work = [COUNT, COUNT + 1]
    qc = QuantumCircuit(COUNT + 2)
    for q in count:
        qc.h(q)
    for j, ctrl in enumerate(count):
        for _ in range(2**j):
            case["mul"](qc, ctrl, work)
    iqft(qc, count)
    qc.measure(count, list(range(COUNT)))
    return qc


def period(n, a, y):
    """Smallest convergent denominator r of y / 2^COUNT with a^r = 1 mod N."""
    p0, q0, p1, q1 = 0, 1, 1, 0
    frac = Fraction(y, 2**COUNT)
    while True:
        k = frac.numerator // frac.denominator
        p0, q0, p1, q1 = p1, q1, k * p1 + p0, k * q1 + q0
        if 1 < q1 <= n and pow(a, q1, n) == 1:
            return q1
        if frac.numerator % frac.denominator == 0 or q1 > n:
            return None
        frac = 1 / (frac - k)


def factors(n, a, y):
    """gcd(x +- 1, N) with x^2 = a^r, r from the measured y."""
    r = period(n, a, y) if y else None
    if r is None:
        return None
    if r % 2 == 0:
        x = pow(a, r // 2, n)
    elif math.isqrt(a) ** 2 == a:
        # Odd r still works when a is a square: a = b^2 gives x = b^r.
        x = pow(math.isqrt(a), r, n)
    else:
        return None
    f = sorted({math.gcd(x - 1, n), math.gcd(x + 1, n)} - {1, n})
    return {"r": r, "factors": f} if f else None


def to_ints(counts):
    # Quafu bitstrings put classical bit 0 first; the counting register is little-endian.
    out = {}
    for bits, c in counts.items():
        y = int(bits[::-1], 2)
        out[y] = out.get(y, 0) + c
    return dict(sorted(out.items()))


def summarise(n, counts, source, extra=None):
    a = CASES[n]["a"]
    ints = to_ints(counts)
    total = sum(ints.values())
    useful = sum(c for y, c in ints.items() if factors(n, a, y))
    record = {
        "n": n,
        "a": a,
        "source": source,
        "shots": total,
        "counts": {str(y): c for y, c in ints.items()},
        "raw_counts": dict(counts),
        "success_rate": round(useful / total, 4),
        "ran_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        **(extra or {}),
    }
    print(f"N={n} a={a} [{source}] success={record['success_rate']:.1%}")
    for y, c in ints.items():
        print(f"  y={y}  {c / total:6.1%}  {'#' * round(40 * c / total):40s} {factors(n, a, y) or ''}")
    return record


def save(record):
    RESULTS.mkdir(exist_ok=True)
    path = RESULTS / f"n{record['n']}-{record['source']}.json"
    path.write_text(json.dumps(record, indent=2) + "\n")


def run_sim():
    # Pure-Python simulator: the bundled C++ one hangs under amd64 emulation on arm64 hosts.
    for n in CASES:
        probs = ptrace(py_simulate(build(n)), list(range(COUNT)))
        counts = {format(i, f"0{COUNT}b"): round(p * SHOTS) for i, p in enumerate(probs) if p > 1e-9}
        save(summarise(n, counts, "simulator"))


def user():
    token = os.environ.get("QUAFU_TOKEN")
    if not token:
        sys.exit("QUAFU_TOKEN is not set")
    return User(api_token=token)


def run_backends():
    user().get_available_backends()


def run_hardware(backend):
    # Submit async and keep the task ids: a rerun polls them instead of spending new tasks.
    pending = RESULTS / f"pending-{backend}.json"
    task = Task(user())
    if pending.exists():
        ids = json.loads(pending.read_text())
    else:
        task.config(backend=backend, shots=SHOTS, compile=True)
        ids = {str(n): task.send(build(n), name=f"shor-n{n}").taskid for n in CASES}
        RESULTS.mkdir(exist_ok=True)
        pending.write_text(json.dumps(ids, indent=2) + "\n")
    print(f"tasks on {backend}: {ids}", flush=True)

    while ids:
        for n, tid in list(ids.items()):
            res = task.retrieve(tid)
            if res.task_status == "Completed":
                save(summarise(int(n), res.counts, backend, {
                    "task_id": tid,
                    "transpiled_qasm": res.transpiled_openqasm,
                }))
                del ids[n]
            elif res.task_status in ("Canceled", "Failed"):
                sys.exit(f"N={n} task {tid} {res.task_status}")
        if ids:
            print(f"{datetime.now():%H:%M} waiting on {list(ids)}", flush=True)
            time.sleep(60)
    pending.unlink()


if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "sim"
    if cmd == "sim":
        run_sim()
    elif cmd == "backends":
        run_backends()
    elif cmd == "hardware" and len(sys.argv) == 3:
        run_hardware(sys.argv[2])
    else:
        sys.exit(__doc__)
