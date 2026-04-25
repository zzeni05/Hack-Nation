"use client";

import { motion } from "framer-motion";
import { ExternalLink, Search } from "lucide-react";
import type { LiteratureQC as LitQCType } from "@/types";
import { NOVELTY_META } from "@/lib/display";

const TONE_CLASSES = {
  rust: "text-rust border-rust",
  ochre: "text-ochre border-ochre",
  moss: "text-moss border-moss",
};

export function LiteratureQC({ qc }: { qc: LitQCType }) {
  const meta = NOVELTY_META[qc.signal];

  return (
    <section className="relative">
      <div className="flex items-baseline justify-between gap-3 border-b border-ink pb-2">
        <div className="flex items-baseline gap-3">
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">
            §02
          </span>
          <h2 className="font-display text-[22px] leading-none tracking-tight">
            Literature QC
          </h2>
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">
            ↳ Has this been done before?
          </span>
        </div>
        <span className="hidden font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute md:inline">
          Tavily · Semantic Scholar · protocols.io
        </span>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[280px_1fr]">
        {/* Verdict */}
        <motion.div
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          className="relative"
        >
          <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">
            Novelty signal
          </div>
          <div
            className={`mt-2 inline-flex items-center gap-2 border-l-4 pl-3 ${TONE_CLASSES[meta.tone]}`}
          >
            <span className="font-display text-[26px] leading-none tracking-tight">
              {meta.label}
            </span>
          </div>
          <p className="mt-3 font-display text-[14px] leading-[1.5] text-ink-soft">
            {meta.description}
          </p>

          <div className="mt-5 border-t border-rule pt-3 font-mono text-[10px] uppercase tracking-[0.2em] text-ink-mute">
            Indexed sources scanned
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-mono text-[28px] tabular-nums text-ink">
              1,847
            </span>
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">
              papers · 92 protocol entries
            </span>
          </div>
        </motion.div>

        {/* References */}
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">
            Most relevant prior work
          </div>
          <p className="mt-1 font-display text-[14px] italic leading-[1.5] text-ink-soft">
            {qc.summary}
          </p>

          <ol className="mt-4 space-y-3">
            {qc.references.map((ref, i) => (
              <motion.li
                key={ref.url}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * i + 0.2 }}
                className="group relative grid grid-cols-[40px_1fr] gap-3 border-l border-rule pl-4"
              >
                <span className="font-mono text-[28px] leading-none tabular-nums text-rust">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="min-w-0">
                  <a
                    href={ref.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group/link inline-flex items-start gap-1.5 font-display text-[16px] leading-[1.25] tracking-tight text-ink hover:text-rust"
                  >
                    {ref.title}
                    <ExternalLink
                      className="mt-1 h-3 w-3 shrink-0 opacity-50 group-hover/link:opacity-100"
                      strokeWidth={1.5}
                    />
                  </a>
                  <div className="mt-1 font-mono text-[11px] tabular-nums text-ink-soft">
                    <span className="italic">{ref.authors}</span> ·{" "}
                    <span>{ref.venue}</span> · <span>{ref.year}</span>
                  </div>
                  <p className="mt-1.5 font-display text-[13px] leading-[1.45] text-ink-soft">
                    {ref.relevance}
                  </p>
                </div>
              </motion.li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
