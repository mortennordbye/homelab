"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { ArrowUp } from "lucide-react";

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
    <AnimatePresence>
      {visible && (
        <motion.button
          type="button"
          aria-label="Scroll to top"
          onClick={() =>
            window.scrollTo({
              top: 0,
              behavior: reduce ? "auto" : "smooth",
            })
          }
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="fixed bottom-20 right-5 z-40 inline-flex h-11 w-11 items-center justify-center rounded-full border border-line-2 bg-surface/70 text-fg-2 backdrop-blur transition-colors hover:border-accent hover:text-accent hover:shadow-[0_0_24px_-6px_var(--accent)] md:bottom-24 md:right-6"
        >
          <ArrowUp size={16} />
        </motion.button>
      )}
    </AnimatePresence>
  );
}
