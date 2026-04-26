"use client";

import { useEffect, useRef, useState } from "react";

const HYPOTHESIS_WORDS = [
  { text: "Replacing", field: null },
  { text: "sucrose", field: null },
  { text: "with", field: null },
  { text: "trehalose", field: "intervention" },
  { text: "as", field: null },
  { text: "a", field: null },
  { text: "cryoprotectant", field: null },
  { text: "in", field: null },
  { text: "HeLa", field: "model" },
  { text: "cells", field: "model" },
  { text: "will", field: null },
  { text: "increase", field: null },
  { text: "post-thaw", field: "outcome" },
  { text: "viability", field: "outcome" },
  { text: "by", field: null },
  { text: "≥15", field: "threshold" },
  { text: "pp", field: "threshold" },
  { text: "vs", field: null },
  { text: "DMSO.", field: "comparator" },
];

const FIELDS = [
  { key: "model", label: "Model system", color: "#16140f" },
  { key: "intervention", label: "Intervention", color: "#b8431c" },
  { key: "comparator", label: "Comparator", color: "#16140f" },
  { key: "outcome", label: "Outcome", color: "#16140f" },
  { key: "threshold", label: "Threshold", color: "#b8431c" },
];

const CYCLE = 7000;

export function ParseAnimation() {
  const [t, setT] = useState(0);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    let raf = 0;
    const loop = (now: number) => {
      if (startRef.current == null) startRef.current = now;
      const elapsed = (now - startRef.current) % CYCLE;
      setT(elapsed / CYCLE);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Reading phase: 0 to 0.55 (cursor sweeps the text)
  // Field-fill phase: 0.55 to 0.95
  const wordsHighlighted = Math.floor(t * 1.8 * HYPOTHESIS_WORDS.length);

  return (
    <div className="flex h-full flex-col">
      {/* Top: the hypothesis text being read */}
      <div className="relative flex-1">
        <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-ink-mute">
          Input · plain language
        </div>
        <div className="mt-2 font-display text-[15px] leading-[1.5]">
          {HYPOTHESIS_WORDS.map((word, i) => {
            const reached = i < wordsHighlighted;
            const isField = word.field !== null;
            const fieldMeta = isField ? FIELDS.find((f) => f.key === word.field) : null;
            return (
              <span
                key={i}
                style={{
                  color: reached
                    ? isField
                      ? fieldMeta!.color
                      : "#16140f"
                    : "#7a7264",
                  fontWeight: reached && isField ? 600 : 400,
                  borderBottom: reached && isField ? `1.5px solid ${fieldMeta!.color}` : "none",
                  transition: "color 0.18s, border 0.18s",
                  paddingBottom: 1,
                }}
              >
                {word.text}{" "}
              </span>
            );
          })}
        </div>
      </div>

      {/* Middle: arrow */}
      <div className="my-3 flex items-center gap-2">
        <span className="h-px flex-1 bg-rule" />
        <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-ink-mute">
          extracted
        </span>
        <span className="h-px flex-1 bg-rule" />
      </div>

      {/* Bottom: extracted fields fill in */}
      <div className="space-y-1.5">
        {FIELDS.map((field, i) => {
          // Field appears once the relevant words have been highlighted
          const fieldFirstIndex = HYPOTHESIS_WORDS.findIndex((w) => w.field === field.key);
          const visible = wordsHighlighted > fieldFirstIndex;

          // The actual extracted value:
          const value =
            field.key === "model"
              ? "HeLa cells"
              : field.key === "intervention"
              ? "trehalose"
              : field.key === "comparator"
              ? "DMSO 10%"
              : field.key === "outcome"
              ? "post-thaw viability"
              : "≥15 pp";

          return (
            <div
              key={field.key}
              className="grid grid-cols-[100px_1fr] items-baseline gap-3"
              style={{
                opacity: visible ? 1 : 0.2,
                transition: "opacity 0.4s",
              }}
            >
              <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-ink-mute">
                {field.label}
              </span>
              <span
                className="font-mono text-[12px] tabular-nums"
                style={{
                  color: field.color,
                  fontWeight: 500,
                }}
              >
                {visible ? value : "-"}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
