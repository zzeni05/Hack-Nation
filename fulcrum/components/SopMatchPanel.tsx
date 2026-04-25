"use client";

import { motion } from "framer-motion";
import { FileText, CheckCircle2, AlertTriangle, MinusCircle } from "lucide-react";
import type { SopMatch } from "@/types";

export function SopMatchPanel({ match }: { match: SopMatch }) {
  const confidencePct = Math.round(match.match_confidence * 100);

  return (
    <section className="relative">
      <div className="flex items-baseline justify-between gap-3 border-b border-ink pb-2">
        <div className="flex items-baseline gap-3">
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">
            §03
          </span>
          <h2 className="font-display text-[22px] leading-none tracking-tight">
            SOP Match
          </h2>
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">
            ↳ Mapping onto institutional memory
          </span>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
        <div>
          <div className="flex items-start gap-4">
            <FileText className="mt-1 h-5 w-5 text-ink-soft" strokeWidth={1.5} />
            <div className="flex-1 min-w-0">
              <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">
                Best matched SOP
              </div>
              <h3 className="mt-1 font-display text-[28px] leading-[1.05] tracking-tight">
                {match.best_match_name}
              </h3>
              <p className="mt-3 max-w-[60ch] font-display text-[14px] leading-[1.55] text-ink-soft">
                {match.reason}
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <ReuseColumn
              icon={<CheckCircle2 className="h-3.5 w-3.5" strokeWidth={1.8} />}
              tone="moss"
              label="Exact reuse"
              count={match.exact_reuse_candidates.length}
              items={match.exact_reuse_candidates}
              delay={0.1}
            />
            <ReuseColumn
              icon={<AlertTriangle className="h-3.5 w-3.5" strokeWidth={1.8} />}
              tone="ochre"
              label="Adaptation"
              count={match.adaptation_candidates.length}
              items={match.adaptation_candidates}
              delay={0.2}
            />
            <ReuseColumn
              icon={<MinusCircle className="h-3.5 w-3.5" strokeWidth={1.8} />}
              tone="rust"
              label="Missing context"
              count={match.missing_context.length}
              items={match.missing_context}
              delay={0.3}
            />
          </div>
        </div>

        {/* Confidence dial */}
        <div className="border border-ink/15 bg-paper-deep/30 p-5">
          <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">
            Match confidence
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-display text-[60px] leading-none tabular-nums" style={{ fontWeight: 500 }}>
              {confidencePct}
            </span>
            <span className="font-mono text-[14px] text-ink-mute">%</span>
          </div>
          <div className="mt-3 ticker-marks h-3 w-full opacity-30" />
          <div className="relative mt-2 h-1 w-full bg-rule">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${confidencePct}%` }}
              transition={{ duration: 1.0, delay: 0.3, ease: "easeOut" }}
              className="absolute inset-y-0 left-0 bg-rust"
            />
          </div>
          <div className="mt-1 flex justify-between font-mono text-[9px] uppercase tracking-[0.18em] text-ink-mute">
            <span>0</span>
            <span>50</span>
            <span>100</span>
          </div>

          <div className="mt-5 border-t border-rule pt-3 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-mute">
            Interpretation
          </div>
          <p className="mt-1 font-display text-[13px] leading-[1.5] text-ink-soft">
            High partial match. Most procedural infrastructure reusable; specific intervention requires informed adaptation.
          </p>
        </div>
      </div>
    </section>
  );
}

function ReuseColumn({
  icon,
  tone,
  label,
  count,
  items,
  delay,
}: {
  icon: React.ReactNode;
  tone: "moss" | "ochre" | "rust";
  label: string;
  count: number;
  items: string[];
  delay: number;
}) {
  const toneClasses = {
    moss: "text-moss",
    ochre: "text-ochre",
    rust: "text-rust",
  };
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="border-t border-ink/30 pt-3"
    >
      <div className={`flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.18em] ${toneClasses[tone]}`}>
        {icon}
        {label}
        <span className="ml-auto font-mono text-[14px] tabular-nums text-ink">
          {count}
        </span>
      </div>
      <ul className="mt-2 space-y-1">
        {items.map((item, i) => (
          <li
            key={i}
            className="font-display text-[13px] leading-[1.4] text-ink-soft before:mr-1.5 before:font-mono before:text-[10px] before:text-ink-mute before:content-['—']"
          >
            {item}
          </li>
        ))}
      </ul>
    </motion.div>
  );
}
