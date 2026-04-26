"use client";

import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

/**
 * The "personalized" section: emphasizes that Operon doesn't write
 * protocols from scratch. It adapts your lab's own SOPs and runbooks,
 * filling gaps with authoritative external sources only when needed.
 *
 * Animated graphic: two stacks of paper documents (internal SOPs on
 * the left, external protocols on the right) being read, marked up,
 * and stitched together into a single source-grounded workflow in
 * the middle.
 */
export function Personalized() {
  return (
    <section className="relative border-t border-ink/15 bg-paper-deep/30">
      <div className="mx-auto max-w-[1480px] px-8 py-24 lg:py-32">
        <div className="grid gap-16 lg:grid-cols-[1fr_1.2fr] lg:gap-24">
          {/* Left: copy */}
          <div>
            <div className="flex items-center gap-3">
              <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-ink-mute">
                §04 · Personalized, not generated
              </span>
              <span className="h-px w-12 bg-rule" />
            </div>
            <h2 className="mt-5 font-display text-[44px] leading-[1.02] tracking-[-0.02em] sm:text-[56px]">
              <span style={{ fontWeight: 500 }}>Your lab&rsquo;s</span>{" "}
              <span className="italic" style={{ fontVariationSettings: '"opsz" 144' }}>
                memory,
              </span>{" "}
              <span style={{ fontWeight: 500 }}>not a stranger&rsquo;s.</span>
            </h2>
            <p className="mt-7 max-w-[52ch] font-display text-[18px] leading-[1.55] text-ink-soft">
              Operon does not invent protocols. It reads the SOPs your lab already wrote,
              the runbooks your team already uses, the equipment you actually own, and
              the prior runs your scientists already conducted, and adapts them.
            </p>
            <p className="mt-5 max-w-[52ch] font-display text-[18px] leading-[1.55] text-ink-soft">
              External literature only fills gaps your lab has not yet covered. Every
              step of the resulting plan is labeled by its origin: an exact reuse of an
              SOP, an adaptation, an external supplement, or an explicit decision the
              scientist must make.
            </p>

            {/* Source provenance legend */}
            <div className="mt-9 grid grid-cols-2 gap-3 border-t border-ink pt-6 sm:grid-cols-4">
              <Origin label="Exact reuse" tone="moss" />
              <Origin label="Adapted" tone="ink" />
              <Origin label="External" tone="ink-soft" />
              <Origin label="Decision" tone="rust" />
            </div>
          </div>

          {/* Right: animated stitch graphic */}
          <div className="relative">
            <PersonalizedStitch />
          </div>
        </div>
      </div>
    </section>
  );
}

function Origin({ label, tone }: { label: string; tone: "moss" | "ink" | "ink-soft" | "rust" }) {
  const colors = {
    moss: { bg: "#52613a", text: "#52613a" },
    ink: { bg: "#16140f", text: "#16140f" },
    "ink-soft": { bg: "#3a352b", text: "#3a352b" },
    rust: { bg: "#b8431c", text: "#b8431c" },
  };
  const c = colors[tone];
  return (
    <div className="flex items-center gap-2">
      <span className="h-2.5 w-2.5" style={{ background: c.bg }} />
      <span
        className="font-mono text-[10px] uppercase tracking-[0.18em]"
        style={{ color: c.text }}
      >
        {label}
      </span>
    </div>
  );
}

/* ---------------------------------------------------------------------- */

const CYCLE = 9000;

function PersonalizedStitch() {
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

  // Phases:
  // 0 to 0.25: documents present, no marks
  // 0.25 to 0.55: marks appear on each side
  // 0.55 to 0.85: stitch lines connect to center
  // 0.85 to 1.0: center workflow becomes visible
  const marksPhase = Math.max(0, Math.min(1, (t - 0.2) / 0.35));
  const stitchPhase = Math.max(0, Math.min(1, (t - 0.5) / 0.35));
  const compiledPhase = Math.max(0, Math.min(1, (t - 0.75) / 0.25));

  return (
    <div className="relative">
      <svg viewBox="0 0 580 480" className="w-full">
        {/* ---- LEFT STACK: Internal SOPs ---- */}
        <g>
          {/* Stack of 3 papers */}
          {[0, 1, 2].map((i) => (
            <g key={i} transform={`translate(${20 + i * 6}, ${60 + i * 6})`}>
              <rect
                x="0"
                y="0"
                width="160"
                height="180"
                fill="#f4efe6"
                stroke="#16140f"
                strokeWidth="1"
              />
            </g>
          ))}
          {/* Top paper content */}
          <g transform="translate(32, 72)">
            <text x="0" y="0" className="fill-ink-mute" style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 8, letterSpacing: "0.18em", textTransform: "uppercase" }}>
              Internal SOP
            </text>
            <text x="0" y="18" className="fill-ink" style={{ fontFamily: "Fraunces, Georgia, serif", fontSize: 12, fontWeight: 600 }}>
              Mammalian Cell
            </text>
            <text x="0" y="32" className="fill-ink" style={{ fontFamily: "Fraunces, Georgia, serif", fontSize: 12, fontWeight: 600 }}>
              Freezing SOP
            </text>
            {/* Faux content lines */}
            {[55, 65, 75, 85, 95, 105, 115, 125, 135].map((y, i) => (
              <line
                key={i}
                x1="0"
                y1={y}
                x2={i % 3 === 2 ? 90 : 130}
                y2={y}
                stroke="#16140f"
                strokeWidth="0.5"
                opacity={0.3}
              />
            ))}
            {/* Highlighted/marked passages - appear during marksPhase */}
            {marksPhase > 0 && (
              <>
                <rect x="-2" y="62" width="120" height="8" fill="#52613a" opacity={0.25 * marksPhase} />
                <rect x="-2" y="92" width="100" height="8" fill="#16140f" opacity={0.18 * marksPhase} />
                <rect x="-2" y="122" width="80" height="8" fill="#52613a" opacity={0.25 * marksPhase} />
              </>
            )}
          </g>
          {/* Internal label */}
          <text x="100" y="280" textAnchor="middle" className="fill-ink-mute" style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 9, letterSpacing: "0.2em", textTransform: "uppercase" }}>
            Internal SOPs
          </text>
          <text x="100" y="294" textAnchor="middle" className="fill-ink" style={{ fontFamily: "Fraunces, Georgia, serif", fontSize: 13 }}>
            Your lab
          </text>
        </g>

        {/* ---- RIGHT STACK: External Protocols ---- */}
        <g>
          {/* Stack of 2 papers */}
          {[0, 1].map((i) => (
            <g key={i} transform={`translate(${400 + i * 6}, ${80 + i * 6})`}>
              <rect
                x="0"
                y="0"
                width="160"
                height="180"
                fill="#f4efe6"
                stroke="#16140f"
                strokeWidth="1"
                strokeDasharray="3 3"
              />
            </g>
          ))}
          <g transform="translate(412, 92)">
            <text x="0" y="0" className="fill-ink-mute" style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 8, letterSpacing: "0.18em", textTransform: "uppercase" }}>
              External
            </text>
            <text x="0" y="18" className="fill-ink" style={{ fontFamily: "Fraunces, Georgia, serif", fontSize: 12, fontWeight: 600 }}>
              protocols.io ·
            </text>
            <text x="0" y="32" className="fill-ink" style={{ fontFamily: "Fraunces, Georgia, serif", fontSize: 12, fontWeight: 600 }}>
              Trehalose loading
            </text>
            {[55, 65, 75, 85, 95, 105, 115, 125, 135].map((y, i) => (
              <line
                key={i}
                x1="0"
                y1={y}
                x2={i % 3 === 2 ? 90 : 130}
                y2={y}
                stroke="#16140f"
                strokeWidth="0.5"
                opacity={0.3}
              />
            ))}
            {marksPhase > 0 && (
              <rect x="-2" y="92" width="100" height="8" fill="#3a352b" opacity={0.2 * marksPhase} />
            )}
          </g>
          <text x="488" y="290" textAnchor="middle" className="fill-ink-mute" style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 9, letterSpacing: "0.2em", textTransform: "uppercase" }}>
            External protocols
          </text>
          <text x="488" y="304" textAnchor="middle" className="fill-ink" style={{ fontFamily: "Fraunces, Georgia, serif", fontSize: 13 }}>
            Authoritative literature
          </text>
        </g>

        {/* ---- STITCH LINES from sides to center ---- */}
        {stitchPhase > 0 && (
          <g opacity={stitchPhase}>
            {/* Left to center */}
            <path
              d="M 200 130 Q 270 130 290 200"
              fill="none"
              stroke="#52613a"
              strokeWidth="1"
              strokeDasharray="3 3"
            />
            <path
              d="M 200 165 Q 270 165 290 230"
              fill="none"
              stroke="#16140f"
              strokeWidth="1"
              strokeDasharray="3 3"
            />
            <path
              d="M 200 200 Q 270 200 290 260"
              fill="none"
              stroke="#52613a"
              strokeWidth="1"
              strokeDasharray="3 3"
            />
            {/* Right to center */}
            <path
              d="M 400 175 Q 350 175 310 240"
              fill="none"
              stroke="#3a352b"
              strokeWidth="1"
              strokeDasharray="3 3"
            />
          </g>
        )}

        {/* ---- CENTER: Compiled workflow ---- */}
        {compiledPhase > 0 && (
          <g opacity={compiledPhase}>
            <rect
              x="240"
              y="130"
              width="100"
              height="220"
              fill="#f4efe6"
              stroke="#16140f"
              strokeWidth="1.5"
            />
            {/* Title */}
            <text x="290" y="148" textAnchor="middle" className="fill-rust" style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 7, letterSpacing: "0.22em", textTransform: "uppercase" }}>
              ◆ Operon
            </text>
            <text x="290" y="166" textAnchor="middle" className="fill-ink" style={{ fontFamily: "Fraunces, Georgia, serif", fontSize: 13, fontWeight: 600 }}>
              Workflow
            </text>
            {/* Steps with origin colors */}
            {[
              { y: 184, c: "#52613a", n: "01" },
              { y: 200, c: "#52613a", n: "02" },
              { y: 216, c: "#16140f", n: "03" },
              { y: 232, c: "#b8431c", n: "04" },
              { y: 248, c: "#16140f", n: "05" },
              { y: 264, c: "#16140f", n: "06" },
              { y: 280, c: "#52613a", n: "07" },
              { y: 296, c: "#52613a", n: "08" },
              { y: 312, c: "#c8932e", n: "09" },
            ].map((s) => (
              <g key={s.n}>
                <rect x="252" y={s.y} width="3" height="10" fill={s.c} />
                <line
                  x1="260"
                  y1={s.y + 5}
                  x2="328"
                  y2={s.y + 5}
                  stroke="#16140f"
                  strokeWidth="0.5"
                  opacity={0.4}
                />
                <text x="328" y={s.y + 8} textAnchor="end" className="fill-ink-mute" style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 7 }}>
                  {s.n}
                </text>
              </g>
            ))}
            {/* Bottom marker */}
            <text x="290" y="338" textAnchor="middle" className="fill-ink-mute" style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 7, letterSpacing: "0.16em", textTransform: "uppercase" }}>
              Source-grounded
            </text>
          </g>
        )}

        {/* Center label below */}
        <text x="290" y="378" textAnchor="middle" className="fill-ink" style={{ fontFamily: "Fraunces, Georgia, serif", fontSize: 13, fontStyle: "italic" }}>
          Personalized to your lab
        </text>
      </svg>
    </div>
  );
}
