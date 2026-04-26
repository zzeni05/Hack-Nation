"use client";

import Link from "next/link";
import { motion } from "framer-motion";

export function FinalCTA() {
  return (
    <section className="relative border-t border-ink/15">
      <div className="mx-auto max-w-[1480px] px-8 py-32 lg:py-48">
        <div className="text-center">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-ink-mute">
              ◆ Begin
            </span>
            <h2 className="mt-6 font-display text-[64px] leading-[0.95] tracking-[-0.025em] sm:text-[88px] lg:text-[120px]">
              <span style={{ fontWeight: 500 }}>One sentence.</span>
              <br />
              <span className="italic text-ink-soft" style={{ fontVariationSettings: '"opsz" 144' }}>
                One workflow.
              </span>
            </h2>

            <p className="mx-auto mt-10 max-w-[42ch] font-display text-[18px] leading-[1.55] text-ink-soft sm:text-[20px]">
              Open the compiler. Try one of the four sample hypotheses, or paste your
              own. Three minutes from a question to an executable plan.
            </p>

            <div className="mt-12 flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/login"
                className="group inline-flex items-center gap-3 bg-ink px-8 py-5 font-mono text-[12px] uppercase tracking-[0.22em] text-paper transition-colors hover:bg-rust"
              >
                Open the compiler
                <svg viewBox="0 0 16 16" className="h-4 w-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M3 8h10M9 4l4 4-4 4" />
                </svg>
              </Link>
            </div>

            <div className="mx-auto mt-16 inline-flex max-w-[40ch] items-center gap-4 border-t border-ink/30 pt-6 font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">
              <span>Demo login</span>
              <span className="h-px w-4 bg-ink-mute" />
              <span>Source-grounded</span>
              <span className="h-px w-4 bg-ink-mute" />
              <span>Open in browser</span>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
