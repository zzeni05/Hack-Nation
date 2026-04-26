"use client";

import { useEffect, useRef, useState } from "react";

/**
 * The compounding loop section: a circular animated diagram showing
 * how scientist corrections improve future plans. The arrow keeps
 * cycling, and a counter ticks up as if corrections are being absorbed.
 */
export function CompoundingLoop() {
  return (
    <section id="loop" className="relative border-t border-ink/15">
      <div className="mx-auto max-w-[1480px] px-8 py-24 lg:py-32">
        <div className="grid gap-16 lg:grid-cols-[1.2fr_1fr] lg:gap-20">
          {/* Left: the loop diagram */}
          <div className="relative flex items-center justify-center">
            <LoopDiagram />
          </div>

          {/* Right: copy */}
          <div className="lg:pl-8">
            <div className="flex items-center gap-3">
              <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-ink-mute">
                §05 · The compounding loop
              </span>
              <span className="h-px w-12 bg-rule" />
            </div>
            <h2 className="mt-5 font-display text-[44px] leading-[1.02] tracking-[-0.02em] sm:text-[56px]">
              <span style={{ fontWeight: 500 }}>Every correction</span>{" "}
              <span className="italic" style={{ fontVariationSettings: '"opsz" 144' }}>
                makes
              </span>{" "}
              <span style={{ fontWeight: 500 }}>the next plan better.</span>
            </h2>
            <p className="mt-7 font-display text-[18px] leading-[1.55] text-ink-soft">
              When a scientist edits a step, picks one decision branch over another, or
              records what actually happened during execution, that signal is captured.
              The next time someone in the lab compiles a similar hypothesis, those
              corrections shape what gets generated.
            </p>
            <p className="mt-5 font-display text-[18px] leading-[1.55] text-ink-soft">
              When the same step gets modified in 87% of prior runs, Operon surfaces it
              as an SOP improvement signal, not just for the next experiment, but
              for the runbook itself.
            </p>

            <div className="mt-9 grid grid-cols-2 gap-6 border-t border-ink pt-6">
              <div>
                <div className="font-display text-[28px] leading-none tracking-tight" style={{ fontWeight: 500 }}>
                  87%
                </div>
                <div className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-mute">
                  of prior runs modified the same viability step
                </div>
              </div>
              <div>
                <div className="font-display text-[28px] leading-none tracking-tight" style={{ fontWeight: 500 }}>
                  →
                </div>
                <div className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-rust">
                  Update the runbook itself
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------------- */

const NODES = [
  { angle: 0, label: "Compile plan", sub: "From hypothesis" },
  { angle: 72, label: "Scientist reviews", sub: "Edits, decides" },
  { angle: 144, label: "Run the experiment", sub: "Notes, deviations" },
  { angle: 216, label: "Capture corrections", sub: "Tagged structurally" },
  { angle: 288, label: "Index as memory", sub: "Lab-scoped" },
];

export function LoopDiagram() {
  const [t, setT] = useState(0);
  const [count, setCount] = useState(1247);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    let raf = 0;
    const loop = (now: number) => {
      if (startRef.current == null) startRef.current = now;
      const elapsed = (now - startRef.current) / 1000;
      // The traveling dot does a full lap every 8s
      const lapT = (elapsed / 8) % 1;
      setT(lapT);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Increment counter every full loop
  useEffect(() => {
    const id = setInterval(() => {
      setCount((c) => c + 1);
    }, 8000);
    return () => clearInterval(id);
  }, []);

  const size = 460;
  const cx = size / 2;
  const cy = size / 2;
  const r = 165;

  const polar = (angleDeg: number, radius: number) => {
    const rad = ((angleDeg - 90) * Math.PI) / 180;
    return [cx + radius * Math.cos(rad), cy + radius * Math.sin(rad)];
  };

  // Traveling dot position
  const dotAngle = t * 360;
  const [dotX, dotY] = polar(dotAngle, r);

  return (
    <div className="relative">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Outer ring */}
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#16140f" strokeWidth="0.5" opacity="0.3" />
        <circle cx={cx} cy={cy} r={r + 12} fill="none" stroke="#16140f" strokeWidth="0.5" opacity="0.15" />

        {/* Tick marks on outer ring */}
        {Array.from({ length: 60 }).map((_, i) => {
          const angle = (i / 60) * 360;
          const inner = i % 5 === 0 ? r + 4 : r + 8;
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
              strokeWidth={i % 5 === 0 ? 0.8 : 0.4}
              opacity={0.4}
            />
          );
        })}

        {/* Arc segments connecting nodes */}
        {NODES.map((node, i) => {
          const next = NODES[(i + 1) % NODES.length];
          const startAngle = node.angle;
          const endAngle = next.angle > startAngle ? next.angle : next.angle + 360;
          const [x1, y1] = polar(startAngle + 8, r);
          const [x2, y2] = polar(endAngle - 8, r);
          const arcSweep = endAngle - startAngle - 16;
          const largeArc = arcSweep > 180 ? 1 : 0;
          // Whether the dot has passed this segment in current cycle
          const dotPastStart = dotAngle >= startAngle;
          return (
            <path
              key={i}
              d={`M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`}
              fill="none"
              stroke="#16140f"
              strokeWidth="1"
              opacity={dotPastStart ? 0.7 : 0.3}
            />
          );
        })}

        {/* Center label */}
        <g>
          <text
            x={cx}
            y={cy - 26}
            textAnchor="middle"
            className="fill-ink-mute"
            style={{
              fontFamily: "JetBrains Mono, monospace",
              fontSize: 9,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
            }}
          >
            Corrections absorbed
          </text>
          <text
            x={cx}
            y={cy + 6}
            textAnchor="middle"
            className="fill-ink"
            style={{
              fontFamily: "Fraunces, Georgia, serif",
              fontSize: 44,
              fontWeight: 500,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {count.toLocaleString()}
          </text>
          <text
            x={cx}
            y={cy + 28}
            textAnchor="middle"
            className="fill-rust"
            style={{
              fontFamily: "JetBrains Mono, monospace",
              fontSize: 9,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
            }}
          >
            ◆ and counting
          </text>
        </g>

        {/* Nodes */}
        {NODES.map((node, i) => {
          const [nx, ny] = polar(node.angle, r);
          // Label position outside the ring
          const [lx, ly] = polar(node.angle, r + 50);
          const isPassed = dotAngle >= node.angle - 5 && dotAngle <= node.angle + 5;
          return (
            <g key={i}>
              {/* Node dot */}
              <circle
                cx={nx}
                cy={ny}
                r={isPassed ? 8 : 5}
                fill={isPassed ? "#b8431c" : "#16140f"}
                style={{ transition: "r 0.2s, fill 0.2s" }}
              />
              <circle cx={nx} cy={ny} r="3" fill="#f4efe6" />

              {/* Label */}
              <text
                x={lx}
                y={ly - 4}
                textAnchor="middle"
                className="fill-ink"
                style={{
                  fontFamily: "JetBrains Mono, monospace",
                  fontSize: 9,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  fontWeight: 600,
                }}
              >
                {String(i + 1).padStart(2, "0")} · {node.label}
              </text>
              <text
                x={lx}
                y={ly + 10}
                textAnchor="middle"
                className="fill-ink-mute"
                style={{
                  fontFamily: "Fraunces, Georgia, serif",
                  fontSize: 11,
                  fontStyle: "italic",
                }}
              >
                {node.sub}
              </text>
            </g>
          );
        })}

        {/* Traveling dot - the active correction */}
        <g>
          <circle cx={dotX} cy={dotY} r="6" fill="#b8431c" />
          <circle cx={dotX} cy={dotY} r="6" fill="none" stroke="#b8431c" strokeWidth="1" opacity="0.5">
            <animate attributeName="r" values="6;14;6" dur="1.2s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.5;0;0.5" dur="1.2s" repeatCount="indefinite" />
          </circle>
        </g>
      </svg>
    </div>
  );
}
