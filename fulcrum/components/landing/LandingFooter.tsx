"use client";

import Link from "next/link";

export function LandingFooter() {
  return (
    <footer className="relative border-t border-ink bg-ink text-paper">
      <div className="mx-auto max-w-[1480px] px-8 py-12">
        <div className="grid gap-10 lg:grid-cols-[2fr_1fr_1fr_1fr]">
          {/* Wordmark + colophon */}
          <div>
            <div className="font-display text-[28px] tracking-[-0.01em]" style={{ fontWeight: 500 }}>
              Operon
            </div>
            <p className="mt-3 max-w-[40ch] font-display text-[14px] leading-[1.5] text-paper/70">
              From hypothesis to personalized, lab-ready experiments, step by step.
            </p>

            <div className="mt-8 grid grid-cols-[80px_1fr] gap-y-1 font-mono text-[10px] uppercase tracking-[0.18em] text-paper/50">
              <span>Type</span>
              <span className="text-paper/80">Fraunces · JetBrains Mono</span>
              <span>Stack</span>
              <span className="text-paper/80">Next.js · FastAPI · Tavily · ChromaDB</span>
              <span>Built</span>
              <span className="text-paper/80">For Hack-Nation Challenge 04</span>
            </div>
          </div>

          {/* Navigation */}
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-paper/50">
              Product
            </div>
            <ul className="mt-3 space-y-2 font-display text-[14px]">
              <li><Link href="/login" className="text-paper hover:text-rust">Open the compiler</Link></li>
              <li><a href="#how" className="text-paper hover:text-rust">How it works</a></li>
              <li><a href="#example" className="text-paper hover:text-rust">Worked example</a></li>
              <li><a href="#loop" className="text-paper hover:text-rust">The loop</a></li>
            </ul>
          </div>

          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-paper/50">
              Built for
            </div>
            <ul className="mt-3 space-y-2 font-display text-[14px]">
              <li><a href="#built-for" className="text-paper hover:text-rust">Principal investigators</a></li>
              <li><a href="#built-for" className="text-paper hover:text-rust">Contract research orgs</a></li>
              <li><a href="#built-for" className="text-paper hover:text-rust">Lab managers</a></li>
            </ul>
          </div>

          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-paper/50">
              Challenge
            </div>
            <ul className="mt-3 space-y-2 font-display text-[14px]">
              <li className="text-paper/80">Challenge 04</li>
              <li className="text-paper/80">MIT × Fulcrum Science</li>
              <li className="text-paper/80">The AI Scientist</li>
            </ul>
          </div>
        </div>

        {/* Bottom bar with crop marks */}
        <div className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t border-paper/15 pt-6 font-mono text-[10px] uppercase tracking-[0.22em] text-paper/50">
          <div className="flex items-center gap-3">
            <CornerMark />
            <span>Operon · Vol. 01 · Iss. 04</span>
          </div>
          <div>
            From hypothesis to experiment, step by step.
          </div>
          <div className="flex items-center gap-3">
            <span>{new Date().getFullYear()}</span>
            <CornerMark className="rotate-180" />
          </div>
        </div>
      </div>
    </footer>
  );
}

function CornerMark({ className = "" }: { className?: string }) {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" className={className} fill="none">
      <path d="M0 0 L6 0 M0 0 L0 6" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}
