"use client";

import { motion } from "framer-motion";
import type { StructuredIntent } from "@/types";

export function IntentCard({ intent }: { intent: StructuredIntent }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="corner-mark relative border border-ink bg-paper-deep/40 p-5"
    >
      <div className="absolute -top-3 left-4 bg-paper px-2 font-mono text-[10px] uppercase tracking-[0.22em] text-rust">
        Structured intent
      </div>

      <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
        <Field label="Experiment type" value={intent.experiment_type.replace(/_/g, " ")} mono />
        <Field label="Model system" value={intent.model_system} />
        <Field label="Intervention" value={intent.intervention} />
        <Field label="Comparator" value={intent.comparator} />
        <Field label="Outcome" value={intent.outcome} />
        <Field
          label="Threshold"
          value={intent.success_threshold}
          accent
        />
      </div>

      <div className="mt-4 border-t border-rule pt-3">
        <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">
          Mechanism
        </div>
        <p className="mt-1 font-display text-[13px] italic leading-[1.5] text-ink-soft">
          {intent.mechanism}
        </p>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">
            Likely assays
          </div>
          <ul className="mt-1 space-y-0.5">
            {intent.likely_assays.map((a) => (
              <li
                key={a}
                className="font-display text-[12px] leading-[1.4] before:mr-1.5 before:font-mono before:text-[10px] before:text-ink-mute before:content-['—']"
              >
                {a}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">
            Controls
          </div>
          <ul className="mt-1 space-y-0.5">
            {intent.controls.map((c) => (
              <li
                key={c}
                className="font-display text-[12px] leading-[1.4] before:mr-1.5 before:font-mono before:text-[10px] before:text-ink-mute before:content-['—']"
              >
                {c}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-4 border-t border-rule pt-3">
        <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">
          Keywords
        </div>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {intent.keywords.map((k) => (
            <span
              key={k}
              className="border border-ink/20 px-2 py-0.5 font-mono text-[10px] tabular-nums text-ink-soft"
            >
              {k}
            </span>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

function Field({
  label,
  value,
  mono,
  accent,
}: {
  label: string;
  value: string;
  mono?: boolean;
  accent?: boolean;
}) {
  return (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">
        {label}
      </div>
      <div
        className={`mt-0.5 leading-[1.35] ${
          mono ? "font-mono text-[12px]" : "font-display text-[14px]"
        } ${accent ? "text-rust" : "text-ink"}`}
        style={{ fontWeight: accent ? 500 : 400 }}
      >
        {value}
      </div>
    </div>
  );
}
