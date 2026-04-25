"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";

const STAGES = [
  "Extracting structured intent",
  "Querying internal SOP knowledge base",
  "Scoring SOP fit",
  "Discovering external protocols via Tavily",
  "Embedding external references locally",
  "Compiling executable workflow",
  "Generating decision nodes",
  "Drafting plan sections",
];

export function CompilingOverlay({ visible }: { visible: boolean }) {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    if (!visible) {
      setStage(0);
      return;
    }
    const id = setInterval(() => {
      setStage((s) => Math.min(s + 1, STAGES.length - 1));
    }, 220);
    return () => clearInterval(id);
  }, [visible]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-paper/80 backdrop-blur-sm"
        >
          <div className="corner-mark relative w-[480px] max-w-[90vw] border border-ink bg-paper-deep/80 p-8">
            {/* Scan line */}
            <div className="pointer-events-none absolute inset-x-0 top-0 h-full overflow-hidden">
              <div className="absolute inset-x-0 h-px animate-scan-line bg-rust/40" />
            </div>

            <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-rust">
              ◆ Compile in progress
            </div>
            <div className="mt-3 font-display text-[28px] leading-[1.05]">
              Mapping hypothesis onto operational reality
            </div>
            <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-mute">
              Internal SOPs · External literature · Prior runs
            </div>

            <div className="mt-6 space-y-2">
              {STAGES.map((label, i) => (
                <div
                  key={label}
                  className="flex items-center gap-3 font-mono text-[11px]"
                >
                  <span
                    className={`inline-flex h-3 w-3 items-center justify-center border ${
                      i < stage
                        ? "border-moss bg-moss"
                        : i === stage
                        ? "border-rust bg-rust animate-pulse-soft"
                        : "border-ink-mute"
                    }`}
                  >
                    {i < stage && (
                      <svg viewBox="0 0 8 8" className="h-2 w-2 text-paper">
                        <path
                          d="M1 4l2 2 4-5"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.5"
                        />
                      </svg>
                    )}
                  </span>
                  <span
                    className={`${
                      i <= stage ? "text-ink" : "text-ink-mute"
                    } uppercase tracking-[0.12em]`}
                  >
                    {label}
                  </span>
                  {i < stage && (
                    <span className="ml-auto text-[9px] uppercase tracking-[0.22em] text-ink-mute">
                      OK
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* Progress bar */}
            <div className="mt-6 h-px w-full bg-rule">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${((stage + 1) / STAGES.length) * 100}%` }}
                className="h-full bg-rust"
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
