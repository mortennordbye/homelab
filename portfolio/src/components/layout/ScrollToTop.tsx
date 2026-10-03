"use client";

import { useEffect, useState } from "react";
import { useReducedMotion } from "@/lib/reduced-motion";
import { cn } from "@/lib/cn";

const SHOW_AFTER_PX = 600;

export function ScrollToTop() {
  const [visible, setVisible] = useState(false);
  const reduce = useReducedMotion();

  useEffect(() => {
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        setVisible(window.scrollY > SHOW_AFTER_PX);
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return (
    // Always mounted and faded with CSS; hidden from focus and the
    // accessibility tree while it is out of view.
    <button
      type="button"
      aria-label="Scroll to top"
      aria-hidden={!visible}
      tabIndex={visible ? 0 : -1}
      onClick={() =>
        window.scrollTo({
          top: 0,
          behavior: reduce ? "auto" : "smooth",
        })
      }
      className={cn(
        "focus-ring fixed bottom-20 right-5 z-40 rounded-[2px] border border-fg bg-bg px-3.5 py-2 font-mono text-[11px] tracking-[0.12em] text-fg transition-[color,border-color,opacity,transform] duration-[250ms] ease-[cubic-bezier(0.16,1,0.3,1)] hover:border-copper hover:text-copper md:bottom-24 md:right-6",
        visible ? "opacity-100" : "pointer-events-none translate-y-3 opacity-0",
      )}
    >
      ↑ TOP
    </button>
  );
}
