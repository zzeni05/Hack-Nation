"use client";

import { useEffect, useRef, useState } from "react";

const STEPS = [
  { n: "01", title: "Culture HeLa to 80% confluence", tag: "EXACT", color: "#52613a" },
  { n: "02", title: "Harvest and aliquot", tag: "EXACT", color: "#52613a" },
  { n: "03", title: "Prepare cryoprotectant", tag: "ADAPTED", color: "#16140f" },
  { n: "04", title: "Select trehalose delivery", tag: "DECIDE", color: "#b8431c" },
  { n: "05", title: "Equilibrate on ice", tag: "ADAPTED", color: "#16140f" },
  { n: "06", title: "Controlled-rate freeze", tag: "FACILITY", color: "#16140f" },
  { n: "07", title: "Storage interval (≥7d)", tag: "EXACT", color: "#52613a" },
  { n: "08", title: "Thaw & recover", tag: "EXACT", color: "#52613a" },
  { n: "09", title: "Viability assay", tag: "HISTORY", color: "#c8932e" },
];

const CYCLE = 9000;

export function CompileAnimation() {
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

  const stepsVisible = Math.floor(t * 1.2 * STEPS.length);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between">
        <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-ink-mute">
          Workflow · {Math.min(stepsVisible, STEPS.length)}/{STEPS.length} steps
        </div>
        <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-rust">
          Compiling…
        </div>
      </div>

      <div className="mt-2 flex-1 space-y-1 overflow-hidden">
        {STEPS.map((step, i) => {
          const visible = i < stepsVisible;
          return (
            <div
              key={step.n}
              className="grid grid-cols-[24px_1fr_60px] items-center gap-2 border-b border-rule-soft py-1.5"
              style={{
                opacity: visible ? 1 : 0,
                transform: visible ? "translateX(0)" : "translateX(-8px)",
                transition: "opacity 0.35s, transform 0.35s",
              }}
            >
              <span className="font-mono text-[10px] tabular-nums text-ink-mute">
                {step.n}
              </span>
              <span className="truncate font-display text-[12px] leading-tight text-ink">
                {step.title}
              </span>
              <span
                className="text-right font-mono text-[8px] uppercase tracking-[0.16em]"
                style={{ color: step.color }}
              >
                {step.tag}
              </span>
            </div>
          );
        })}
      </div>

      {/* Progress + summary */}
      <div className="mt-2 border-t border-ink pt-2">
        <div className="h-1 w-full bg-rule">
          <div
            className="h-full bg-rust"
            style={{
              width: `${Math.min(100, (stepsVisible / STEPS.length) * 100)}%`,
              transition: "width 0.3s",
            }}
          />
        </div>
        <div className="mt-1.5 flex justify-between font-mono text-[8px] uppercase tracking-[0.16em] text-ink-mute">
          <span>5 exact · 2 adapted · 2 decide · 1 hist</span>
          <span>$7,985 · 7 wks</span>
        </div>
      </div>
    </div>
  );
}
