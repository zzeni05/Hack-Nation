"use client";

import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

/**
 * The bottleneck section: editorial pull-quote on the left, animated
 * "weeks-eaten-by-operations" clock on the right. The clock runs on
 * compressed time, one rotation per ~12s, and as it sweeps it fills
 * in arc segments labeled with the operational phases that consume
 * the time (scoping, sourcing, scheduling, validation).
 */
export function Bottleneck() {
  return (
    <section className="relative border-t border-ink/15">
      <div className="mx-auto grid max-w-[1480px] gap-14 px-8 py-24 lg:grid-cols-[minmax(0,1.08fr)_minmax(420px,0.92fr)] lg:gap-20 lg:py-32">
        {/* Left: editorial copy */}
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-ink-mute">
              The bottleneck
            </span>
            <span className="h-px w-12 bg-rule" />
          </div>

          <h2 className="mt-5 max-w-[13ch] text-balance font-display text-[44px] leading-[1.02] tracking-[-0.02em] sm:max-w-[15ch] sm:text-[56px] lg:max-w-[16ch]">
            <span style={{ fontWeight: 500 }}>It is not</span>{" "}
            <span className="italic text-ink-soft" style={{ fontVariationSettings: '"opsz" 144' }}>
              the ideas
            </span>{" "}
            <span style={{ fontWeight: 500 }}>that slow science down.</span>
          </h2>

          <p className="mt-7 max-w-[62ch] font-display text-[18px] leading-[1.6] text-ink-soft">
            A hypothesis is rarely the only hard part. The slower step is translating it
            into operations: which SOP can be reused exactly, which protocol needs
            adaptation, which assay choice branches the plan, and where a scientist must
            make a judgment call.
          </p>

          <p className="mt-5 max-w-[62ch] font-display text-[18px] leading-[1.6] text-ink-soft">
            Operon treats that translation like compilation. It parses the hypothesis,
            retrieves internal and external protocol evidence, assembles the deterministic
            parts into a step-by-step plan, and turns uncertainty into explicit decision
            nodes with traceable options.{" "}
            <span className="text-ink" style={{ fontWeight: 500 }}>
              The output is not a generic protocol. It is a lab-specific run path.
            </span>
          </p>

          {/* Stat row */}
          <div className="mt-10 grid gap-6 border-t border-ink pt-6 sm:grid-cols-3">
            <Stat number="reuse" label="Deterministic SOP-backed steps" />
            <Stat number="branch" label="Evidence-backed decision points" />
            <Stat number="human" label="Explicit judgment required" />
          </div>
        </div>

        {/* Right: animated clock */}
        <div className="relative flex min-w-0 items-center justify-center overflow-visible">
          <BottleneckClock />
        </div>
      </div>
    </section>
  );
}

function Stat({ number, label }: { number: string; label: string }) {
  return (
    <div>
      <div className="font-display text-[24px] leading-none tracking-tight text-ink" style={{ fontWeight: 500 }}>
        {number}
      </div>
      <div className="mt-1 font-mono text-[10px] uppercase leading-snug tracking-[0.18em] text-ink-mute">
        {label}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------- */

const PHASES = [
  { label: "Scope protocol", days: "1-2d" },
  { label: "Source materials", days: "3-5d" },
  { label: "Estimate budget", days: "1d" },
  { label: "Build timeline", days: "1-2d" },
  { label: "Define validation", days: "1d" },
  { label: "Coordinate team", days: "2d" },
];

const CYCLE = 14000; // ms per full sweep

function BottleneckClock() {
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

  const size = 460;
  const cx = size / 2;
  const cy = size / 2;
  const r = 148;

  // Each phase occupies an equal arc. As `t` progresses, more phases fill.
  const segCount = PHASES.length;
  const segAngle = 360 / segCount;

  // Helper to convert an angle (degrees, 0 = top, clockwise) to xy
  const polar = (angleDeg: number, radius: number) => {
    const rad = ((angleDeg - 90) * Math.PI) / 180;
    return [cx + radius * Math.cos(rad), cy + radius * Math.sin(rad)];
  };

  // Build an SVG arc path from startDeg to endDeg
  const arcPath = (startDeg: number, endDeg: number, radius: number) => {
    const [x1, y1] = polar(startDeg, radius);
    const [x2, y2] = polar(endDeg, radius);
    const large = endDeg - startDeg > 180 ? 1 : 0;
    return `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${large} 1 ${x2} ${y2} Z`;
  };

  // Sweep angle: from 0 to 360 degrees as t goes 0->1
  const sweepDeg = t * 360;

  return (
    <div className="relative w-full max-w-[460px]">
      <svg className="w-full overflow-visible" viewBox={`0 0 ${size} ${size}`}>
        {/* Outer ring with tick marks */}
        <circle cx={cx} cy={cy} r={r + 12} fill="none" stroke="#16140f" strokeWidth="1" opacity={0.3} />

        {/* Tick marks on outer ring */}
        {Array.from({ length: 60 }).map((_, i) => {
          const angle = (i / 60) * 360;
          const inner = i % 5 === 0 ? r + 6 : r + 9;
          const outer = r + 12;
          const [x1, y1] = polar(angle, inner);
          const [x2, y2] = polar(angle, outer);
          return (
            <line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="#16140f"
              strokeWidth={i % 5 === 0 ? 1 : 0.5}
              opacity={0.4}
            />
          );
        })}

        {/* Filled phase segments - fill in as the sweep passes */}
        {PHASES.map((phase, i) => {
          const startDeg = i * segAngle;
          const endDeg = (i + 1) * segAngle;
          const filled = sweepDeg >= endDeg;
          const filling = sweepDeg > startDeg && sweepDeg < endDeg;
          const partialDeg = filling ? sweepDeg : endDeg;

          return (
            <g key={phase.label}>
              {/* Background segment outline */}
              <path
                d={arcPath(startDeg, endDeg, r)}
                fill="none"
                stroke="#16140f"
                strokeWidth="0.5"
                opacity={0.15}
              />
              {/* Filled portion */}
              {(filled || filling) && (
                <path
                  d={arcPath(startDeg, partialDeg, r)}
                  fill={filled ? "#16140f" : "#3a352b"}
                  opacity={filled ? 0.85 : 0.55}
                />
              )}
              {/* Segment dividers */}
              {(() => {
                const [x, y] = polar(startDeg, r);
                return (
                  <line
                    x1={cx}
                    y1={cy}
                    x2={x}
                    y2={y}
                    stroke="#f4efe6"
                    strokeWidth="1"
                  />
                );
              })()}
            </g>
          );
        })}

        {/* Inner clearing - paper colored disc with the eyebrow text */}
        <circle cx={cx} cy={cy} r={62} fill="#f4efe6" stroke="#16140f" strokeWidth="1" />
        <text
          x={cx}
          y={cy - 12}
          textAnchor="middle"
          className="fill-ink-mute"
          style={{
            fontFamily: "JetBrains Mono, monospace",
            fontSize: 9,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
          }}
        >
          One experiment
        </text>
        <text
          x={cx}
          y={cy + 8}
          textAnchor="middle"
          className="fill-ink"
          style={{
            fontFamily: "Fraunces, Georgia, serif",
            fontSize: 28,
            fontWeight: 500,
          }}
        >
          ~10
        </text>
        <text
          x={cx}
          y={cy + 28}
          textAnchor="middle"
          className="fill-ink-mute"
          style={{
            fontFamily: "JetBrains Mono, monospace",
            fontSize: 9,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
          }}
        >
          working days
        </text>

        {/* Sweep line */}
        {(() => {
          const [x, y] = polar(sweepDeg, r);
          return (
            <line
              x1={cx}
              y1={cy}
              x2={x}
              y2={y}
              stroke="#b8431c"
              strokeWidth="1.5"
            />
          );
        })()}

        {/* Center dot */}
        <circle cx={cx} cy={cy} r={3} fill="#b8431c" />

        {/* Phase labels around the outside */}
        {PHASES.map((phase, i) => {
          const midDeg = i * segAngle + segAngle / 2;
          const [rawLx, rawLy] = polar(midDeg, r + 56);
          const boxW = 138;
          const boxH = 42;
          const lx = Math.max(boxW / 2 + 12, Math.min(size - boxW / 2 - 12, rawLx));
          const ly = Math.max(boxH / 2 + 12, Math.min(size - boxH / 2 - 12, rawLy));
          return (
            <g key={`label-${phase.label}`}>
              <rect
                x={lx - boxW / 2}
                y={ly - boxH / 2}
                width={boxW}
                height={boxH}
                fill="#f4efe6"
                stroke="#16140f"
                strokeWidth="0.55"
                opacity="0.92"
              />
              <text
                x={lx}
                y={ly - 2}
                textAnchor="middle"
                className="fill-ink"
                style={{
                  fontFamily: "JetBrains Mono, monospace",
                  fontSize: 7.5,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                }}
              >
                {phase.label}
              </text>
              <text
                x={lx}
                y={ly + 10}
                textAnchor="middle"
                className="fill-rust"
                style={{
                  fontFamily: "JetBrains Mono, monospace",
                  fontSize: 8,
                  letterSpacing: "0.08em",
                }}
              >
                {phase.days}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
