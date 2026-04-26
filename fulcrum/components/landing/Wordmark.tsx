"use client";

import Link from "next/link";
import { motion } from "framer-motion";

export function Wordmark({ scrolled = false }: { scrolled?: boolean }) {
  return (
    <header
      className={`sticky top-0 z-30 transition-colors ${
        scrolled ? "border-b border-ink/15 bg-paper/85 backdrop-blur-md" : ""
      }`}
    >
      <nav className="mx-auto flex max-w-[1480px] items-center justify-between px-8 py-4">
        {/* Logotype: a small operon glyph + the wordmark */}
        <Link href="/" className="flex items-center gap-3">
          <OperonGlyph />
          <span className="font-display text-[22px] tracking-[-0.01em]" style={{ fontWeight: 500 }}>
            Operon
          </span>
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          <a href="#how" className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-soft hover:text-ink">
            How it works
          </a>
          <a href="#example" className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-soft hover:text-ink">
            Worked example
          </a>
          <a href="#loop" className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-soft hover:text-ink">
            The loop
          </a>
          <a href="#built-for" className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-soft hover:text-ink">
            Built for
          </a>
        </div>

        <Link
          href="/login"
          className="group inline-flex items-center gap-2 border border-ink px-3.5 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-ink transition-colors hover:bg-ink hover:text-paper"
        >
          Open the compiler
          <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M3 8h10M9 4l4 4-4 4" />
          </svg>
        </Link>
      </nav>
    </header>
  );
}

/**
 * The Operon glyph: a tiny abstracted operon:
 * a promoter square and three "gene" segments on a baseline.
 * This appears next to the wordmark and gets a subtle
 * "transcribing" pulse on the rightmost segment.
 */
function OperonGlyph() {
  return (
    <svg width="28" height="20" viewBox="0 0 28 20" fill="none" aria-hidden>
      {/* Baseline */}
      <line x1="0" y1="14" x2="28" y2="14" stroke="#16140f" strokeWidth="1" />
      {/* Promoter (filled square) */}
      <rect x="0" y="9" width="5" height="5" fill="#16140f" />
      {/* Gene segments */}
      <rect x="7" y="7" width="6" height="7" fill="none" stroke="#16140f" strokeWidth="1" />
      <rect x="14" y="7" width="6" height="7" fill="none" stroke="#16140f" strokeWidth="1" />
      <rect x="21" y="7" width="6" height="7" fill="none" stroke="#16140f" strokeWidth="1" />
      {/* Polymerase head - a small notch above the track that travels */}
      <motion.g
        initial={{ x: 0 }}
        animate={{ x: [0, 22, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      >
        <polygon points="1,3 5,3 3,6" fill="#b8431c" />
      </motion.g>
    </svg>
  );
}
