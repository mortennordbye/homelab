"use client";

import { useEffect, useState } from "react";

const PANIC = [
  "[  412.118204] rm[1]: removing /usr ... /bin ... /lib ... /boot",
  "[  412.118207] Kernel panic - not syncing: Attempted to kill init! exitcode=0x00000100",
  "[  412.118209] CPU: 3 PID: 1 Comm: rm Not tainted 6.12.0 #1",
  "[  412.118211] Hardware name: your laptop",
  "[  412.118213] Call Trace:",
  "[  412.118214]  <TASK>",
  "[  412.118216]  dump_stack_lvl+0x48/0x70",
  "[  412.118219]  panic+0x34f/0x370",
  "[  412.118222]  do_exit.cold+0x15/0x15",
  "[  412.118224]  do_group_exit+0x2d/0x80",
  "[  412.118226]  __x64_sys_exit_group+0x14/0x20",
  "[  412.118229]  do_syscall_64+0x5d/0x170",
  "[  412.118231]  entry_SYSCALL_64_after_hwframe+0x76/0x7e",
  "[  412.118233]  </TASK>",
  "[  412.118236] Kernel Offset: 0x2c000000 from 0xffffffff81000000",
  "[  412.118240] ---[ end Kernel panic - not syncing: Attempted to kill init! ]---",
];

/**
 * The `rm -rf /` easter egg: the whole viewport plays dead as a kernel panic.
 * Any key or click ends it at any point, so it can never trap someone who does
 * not find it funny.
 */
export function FakeCrash({ onDone }: { onDone: () => void }) {
  const [reduced] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const [shown, setShown] = useState(reduced ? PANIC.length : 0);

  useEffect(() => {
    const step = window.setInterval(
      () => setShown((n) => Math.min(PANIC.length, n + 1)),
      90,
    );
    return () => window.clearInterval(step);
  }, []);

  useEffect(() => {
    const end = (e: Event) => {
      e.preventDefault();
      e.stopImmediatePropagation();
      onDone();
    };
    // Capture, so the key that ends it does not also walk or press E.
    window.addEventListener("keydown", end, { capture: true });
    return () => window.removeEventListener("keydown", end, { capture: true });
  }, [onDone]);

  return (
    <div
      role="alert"
      className="fixed inset-0 z-[300] cursor-none overflow-hidden bg-black p-6 font-mono text-[13px] leading-[1.45] text-[#d6d6d6] [font-variant-ligatures:none]"
      onClick={onDone}
    >
      {PANIC.slice(0, shown).map((l) => (
        <div key={l} className="whitespace-pre-wrap break-all">
          {l}
        </div>
      ))}
      {shown === PANIC.length && (
        <span className="room-crash-cursor inline-block h-[1em] w-[0.6em] bg-[#d6d6d6] align-text-bottom" />
      )}
    </div>
  );
}
