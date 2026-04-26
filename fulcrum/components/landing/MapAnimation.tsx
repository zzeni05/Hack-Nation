"use client";

import { useEffect, useRef, useState } from "react";

const SOPS = [
  { id: "freezing", label: "Mammalian Cell Freezing SOP", x: 0.62, y: 0.42, internal: true, distance: 0.18 },
  { id: "viability", label: "Viability Assay Runbook", x: 0.78, y: 0.62, internal: true, distance: 0.34 },
  { id: "culture", label: "HeLa Culture SOP", x: 0.42, y: 0.66, internal: true, distance: 0.36 },
  { id: "freezer", label: "CryoMed Manual", x: 0.30, y: 0.36, internal: true, distance: 0.45 },
  { id: "facility", label: "Lab Facility Constraints", x: 0.84, y: 0.30, internal: true, distance: 0.50 },
  { id: "external1", label: "protocols.io · Trehalose", x: 0.18, y: 0.22, internal: false, distance: 0.62 },
  { id: "external2", label: "Promega CellTiter-Glo", x: 0.86, y: 0.78, internal: false, distance: 0.64 },
];

const CYCLE = 8000;

export function MapAnimation() {
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

  const W = 380;
  const H = 280;
  const cx = W / 2;
  const cy = H / 2;

  // Phase: ring expansion 0 to 0.4, then tethers connect 0.4 to 1
  const ringPhase = Math.min(1, t / 0.4);
  const tetherPhase = Math.max(0, Math.min(1, (t - 0.35) / 0.55));

  return (
    <div className="flex h-full flex-col">
      <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-ink-mute">
        Hypothesis · matched against lab memory
      </div>

      <div className="relative flex-1">
        <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 h-full w-full">
          {/* Concentric rings (semantic distance) */}
          {[60, 90, 120].map((r, i) => (
            <circle
              key={i}
              cx={cx}
              cy={cy}
              r={r * ringPhase}
              fill="none"
              stroke="#16140f"
              strokeWidth="0.5"
              opacity={0.15 - i * 0.03}
              strokeDasharray="2 4"
            />
          ))}

          {/* Tethers from each SOP to the center, drawn left-to-right by distance */}
          {SOPS.map((sop, i) => {
            const x = sop.x * W;
            const y = sop.y * H;
            const stagger = i / SOPS.length;
            const visible = tetherPhase > stagger;
            if (!visible) return null;

            const isMatch = sop.id === "freezing";

            return (
              <g key={sop.id}>
                <line
                  x1={cx}
                  y1={cy}
                  x2={x}
                  y2={y}
                  stroke={isMatch ? "#b8431c" : "#16140f"}
                  strokeWidth={isMatch ? 1.5 : 0.5}
                  opacity={isMatch ? 0.85 : 0.3}
                  strokeDasharray={sop.internal ? "0" : "3 3"}
                />
              </g>
            );
          })}

          {/* SOP nodes */}
          {SOPS.map((sop, i) => {
            const x = sop.x * W;
            const y = sop.y * H;
            const stagger = i / SOPS.length;
            const nodeVisible = ringPhase + tetherPhase * 0.5 > stagger * 0.8;
            const isMatch = sop.id === "freezing";

            return (
              <g
                key={sop.id}
                style={{
                  opacity: nodeVisible ? 1 : 0,
                  transition: "opacity 0.4s",
                }}
              >
                {/* Node - square for internal, circle for external */}
                {sop.internal ? (
                  <rect
                    x={x - 5}
                    y={y - 5}
                    width="10"
                    height="10"
                    fill={isMatch ? "#b8431c" : "#f4efe6"}
                    stroke={isMatch ? "#b8431c" : "#16140f"}
                    strokeWidth="1"
                  />
                ) : (
                  <circle
                    cx={x}
                    cy={y}
                    r="5"
                    fill="#f4efe6"
                    stroke="#16140f"
                    strokeWidth="1"
                    strokeDasharray="2 2"
                  />
                )}
                {/* Label */}
                <text
                  x={x + 10}
                  y={y + 3}
                  className="fill-ink"
                  style={{
                    fontFamily: "JetBrains Mono, monospace",
                    fontSize: 8,
                    letterSpacing: "0.1em",
                    fontWeight: isMatch ? 600 : 400,
                  }}
                >
                  {sop.label}
                </text>
                {/* Match marker */}
                {isMatch && tetherPhase > 0.5 && (
                  <text
                    x={x + 10}
                    y={y + 14}
                    className="fill-rust"
                    style={{
                      fontFamily: "JetBrains Mono, monospace",
                      fontSize: 7,
                      letterSpacing: "0.18em",
                      textTransform: "uppercase",
                    }}
                  >
                    ✓ best match · 78%
                  </text>
                )}
              </g>
            );
          })}

          {/* Center node - the hypothesis */}
          <g>
            <circle cx={cx} cy={cy} r="14" fill="#16140f" />
            <text
              x={cx}
              y={cy + 3}
              textAnchor="middle"
              className="fill-paper"
              style={{
                fontFamily: "JetBrains Mono, monospace",
                fontSize: 8,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                fontWeight: 600,
              }}
            >
              h
            </text>
            {/* Pulse ring */}
            <circle cx={cx} cy={cy} r="14" fill="none" stroke="#16140f" strokeWidth="0.5" opacity="0.4">
              <animate attributeName="r" values="14;30;14" dur="3s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.4;0;0.4" dur="3s" repeatCount="indefinite" />
            </circle>
          </g>
        </svg>
      </div>

      {/* Legend */}
      <div className="mt-3 flex items-center gap-4 border-t border-rule pt-2 font-mono text-[9px] uppercase tracking-[0.16em] text-ink-mute">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 bg-ink" /> Internal SOP
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full border border-ink" style={{ borderStyle: "dashed" }} /> External
        </span>
        <span className="ml-auto inline-flex items-center gap-1.5 text-rust">
          <span className="h-2 w-2 bg-rust" /> Match
        </span>
      </div>
    </div>
  );
}
