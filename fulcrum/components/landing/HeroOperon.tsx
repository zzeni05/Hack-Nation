"use client";

import Link from "next/link";
import { useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";

/**
 * The hero animation literalizes the product name.
 *
 * In molecular biology, an operon is a cluster of co-regulated genes
 * transcribed as a single unit from one promoter. We treat the
 * hypothesis as the promoter, and the experiment plan sections
 * (Materials, Protocol, Budget, Timeline, Validation) as the genes
 * that get transcribed in order.
 *
 * A polymerase-shaped read-head moves left-to-right along the DNA
 * backbone. As it passes over each gene, that gene "transcribes" -
 * a small ticker of contents rises up from it (catalog numbers, dollar
 * amounts, week numbers, threshold signals). The cycle loops every 14s.
 */
export function HeroOperon() {
  return (
    <section className="relative overflow-hidden">
      {/* Background grid - very faint */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.4]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(22,20,15,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(22,20,15,0.05) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />

      <div className="relative mx-auto max-w-[1480px] px-8 pt-12 pb-20 lg:pt-20 lg:pb-32">
        {/* Eyebrow */}
        <div className="flex items-center gap-3">
          <span className="h-px w-12 bg-ink" />
          <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-ink">
            Operon · A lab operations engine
          </span>
        </div>

        {/* Display headline */}
        <h1 className="mt-6 max-w-[18ch] font-display text-[68px] leading-[0.92] tracking-[-0.025em] sm:text-[88px] lg:text-[112px]">
          <span className="block" style={{ fontWeight: 500, fontVariationSettings: '"opsz" 144' }}>
            Hypothesis
          </span>
          <span
            className="block italic text-ink-soft"
            style={{ fontVariationSettings: '"opsz" 144, "SOFT" 100' }}
          >
            becomes
          </span>
          <span className="block" style={{ fontWeight: 600, fontVariationSettings: '"opsz" 144' }}>
            experiment.
          </span>
        </h1>

        {/* Tagline */}
        <p className="mt-8 max-w-[52ch] font-display text-[19px] leading-[1.45] text-ink-soft sm:text-[21px]">
          From a single sentence to a personalized, lab-ready experiment plan,
          step by step, materials to validation, grounded in your lab&rsquo;s own SOPs
          and the world&rsquo;s authoritative protocol literature.
        </p>

        {/* CTA row */}
        <div className="mt-10 flex flex-wrap items-center gap-4">
          <Link
            href="/login"
            className="group inline-flex items-center gap-3 bg-ink px-6 py-4 font-mono text-[11px] uppercase tracking-[0.2em] text-paper transition-colors hover:bg-rust"
          >
            Compile a hypothesis
            <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M3 8h10M9 4l4 4-4 4" />
            </svg>
          </Link>
          <a
            href="#how"
            className="inline-flex items-center gap-2 px-3 py-3 font-mono text-[11px] uppercase tracking-[0.2em] text-ink-soft transition-colors hover:text-ink"
          >
            See how it works
            <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M8 3v10M4 9l4 4 4-4" />
            </svg>
          </a>
        </div>

        {/* The operon track - sits below the headline, full-width */}
        <div className="relative mt-20">
          <OperonTrack />
        </div>

        {/* Caption */}
        <div className="mt-6 grid grid-cols-1 gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute sm:grid-cols-[1fr_auto_1fr]">
          <span>
            <span className="text-rust">◆</span> A hypothesis is a promoter
          </span>
          <span className="hidden text-center sm:block">transcribed in sequence</span>
          <span className="text-right">
            All five plan sections · one coordinated unit
          </span>
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------------- */

interface Gene {
  id: string;
  label: string;
  sublabel: string;
  contents: string[];
}

const GENES: Gene[] = [
  {
    id: "materials",
    label: "Materials",
    sublabel: "Reagents · Catalog #",
    contents: ["T9531", "G7570", "10566016", "26140079", "430659"],
  },
  {
    id: "protocol",
    label: "Protocol",
    sublabel: "Source-grounded steps",
    contents: ["Harvest 80%", "−1°C/min", "37°C thaw", "n=6/cond", "RLU read"],
  },
  {
    id: "budget",
    label: "Budget",
    sublabel: "Line-item cost",
    contents: ["$648", "$454", "$512", "$180", "$4,800"],
  },
  {
    id: "timeline",
    label: "Timeline",
    sublabel: "Phased schedule",
    contents: ["W1 procure", "W2 expand", "W4 freeze", "W5 store", "W7 analyze"],
  },
  {
    id: "validation",
    label: "Validation",
    sublabel: "Endpoints · controls",
    contents: ["≥15pp Δ", "p<0.05", "vs DMSO", "24h read", "48h recov"],
  },
];

const CYCLE_S = 14; // total loop duration in seconds
const LANE_W = 1280; // SVG viewbox width
const LANE_H = 320; // SVG viewbox height
const TRACK_Y = 200; // y-position of the DNA backbone
const PROMOTER_X = 60;
const PROMOTER_W = 90;
const GENE_W = 180;
const GENE_GAP = 30;
const GENE_H = 56;
const FIRST_GENE_X = PROMOTER_X + PROMOTER_W + 36;

function OperonTrack() {
  const reduce = useReducedMotion();
  const [tick, setTick] = useState(0);

  // We use a "virtual time" tick so the contents above each gene appear
  // *as the polymerase passes over it*. This avoids relying on overlapping
  // SVG animateMotion timing.
  useEffect(() => {
    if (reduce) return;
    const start = performance.now();
    let raf = 0;
    const loop = (now: number) => {
      const elapsed = ((now - start) / 1000) % CYCLE_S;
      setTick(elapsed);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [reduce]);

  // Polymerase x-position over time
  const polymeraseTravel = (t: number) => {
    // Progresses from left edge to right edge, then quickly resets.
    const cycleProgress = t / CYCLE_S;
    const easedProgress = cycleProgress < 0.85 ? cycleProgress / 0.85 : 1;
    const startX = PROMOTER_X - 30;
    const endX = FIRST_GENE_X + GENES.length * (GENE_W + GENE_GAP) - GENE_GAP + 30;
    return startX + (endX - startX) * easedProgress;
  };

  const polyX = polymeraseTravel(tick);

  return (
    <div className="relative w-full">
      <svg
        viewBox={`0 0 ${LANE_W} ${LANE_H}`}
        className="w-full"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* ---- Top label rail (over each gene) ---- */}
        {GENES.map((gene, i) => {
          const x = FIRST_GENE_X + i * (GENE_W + GENE_GAP);
          return (
            <g key={`label-${gene.id}`}>
              <text
                x={x + GENE_W / 2}
                y={28}
                textAnchor="middle"
                className="fill-ink-mute"
                style={{
                  fontFamily: "JetBrains Mono, monospace",
                  fontSize: 10,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                }}
              >
                §{String(i + 1).padStart(2, "0")}
              </text>
              <text
                x={x + GENE_W / 2}
                y={50}
                textAnchor="middle"
                className="fill-ink"
                style={{
                  fontFamily: "Fraunces, Georgia, serif",
                  fontSize: 22,
                  fontWeight: 500,
                }}
              >
                {gene.label}
              </text>
              <text
                x={x + GENE_W / 2}
                y={66}
                textAnchor="middle"
                className="fill-ink-mute"
                style={{
                  fontFamily: "JetBrains Mono, monospace",
                  fontSize: 9,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                }}
              >
                {gene.sublabel}
              </text>
            </g>
          );
        })}

        {/* ---- Transcribed contents (rise above each gene as polymerase passes) ---- */}
        {GENES.map((gene, i) => {
          const geneX = FIRST_GENE_X + i * (GENE_W + GENE_GAP);
          const geneCenterX = geneX + GENE_W / 2;
          const geneStart = geneX;
          const geneEnd = geneX + GENE_W;

          // Has the polymerase passed over this gene yet?
          const passed = polyX >= geneStart;
          const completed = polyX >= geneEnd;

          return (
            <g key={`contents-${gene.id}`}>
              {gene.contents.map((c, j) => {
                // Stagger contents within a gene
                const geneProgress = Math.max(
                  0,
                  Math.min(1, (polyX - geneStart) / GENE_W)
                );
                const itemAppears = geneProgress > j / gene.contents.length;
                const itemY = 92 + j * 14;
                const opacity = itemAppears ? (completed ? 0.5 : 0.95) : 0;
                return (
                  <text
                    key={j}
                    x={geneCenterX}
                    y={itemY}
                    textAnchor="middle"
                    className="fill-rust"
                    style={{
                      fontFamily: "JetBrains Mono, monospace",
                      fontSize: 10,
                      opacity,
                      transition: "opacity 0.35s ease-out",
                    }}
                  >
                    {c}
                  </text>
                );
              })}
            </g>
          );
        })}

        {/* ---- The DNA backbone ---- */}
        {/* Two parallel lines = double helix abstraction */}
        <line
          x1={20}
          y1={TRACK_Y - 4}
          x2={LANE_W - 20}
          y2={TRACK_Y - 4}
          stroke="#16140f"
          strokeWidth="1"
        />
        <line
          x1={20}
          y1={TRACK_Y + 4}
          x2={LANE_W - 20}
          y2={TRACK_Y + 4}
          stroke="#16140f"
          strokeWidth="1"
        />
        {/* Tick marks on the track - small base-pair indicators */}
        {Array.from({ length: 80 }).map((_, i) => {
          const x = 28 + i * 15.5;
          if (x > LANE_W - 28) return null;
          return (
            <line
              key={`tick-${i}`}
              x1={x}
              y1={TRACK_Y - 4}
              x2={x}
              y2={TRACK_Y + 4}
              stroke="#16140f"
              strokeWidth="0.5"
              opacity={0.45}
            />
          );
        })}

        {/* ---- Promoter (filled rust block, the hypothesis) ---- */}
        <g>
          <rect
            x={PROMOTER_X}
            y={TRACK_Y - GENE_H / 2}
            width={PROMOTER_W}
            height={GENE_H}
            fill="#b8431c"
          />
          <text
            x={PROMOTER_X + PROMOTER_W / 2}
            y={TRACK_Y + 5}
            textAnchor="middle"
            className="fill-paper"
            style={{
              fontFamily: "JetBrains Mono, monospace",
              fontSize: 10,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
            }}
          >
            Hypothesis
          </text>
          {/* Promoter caret */}
          <text
            x={PROMOTER_X + PROMOTER_W / 2}
            y={TRACK_Y - 38}
            textAnchor="middle"
            className="fill-rust"
            style={{
              fontFamily: "JetBrains Mono, monospace",
              fontSize: 9,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
            }}
          >
            ▼ Promoter
          </text>
        </g>

        {/* ---- Genes (open boxes) ---- */}
        {GENES.map((gene, i) => {
          const x = FIRST_GENE_X + i * (GENE_W + GENE_GAP);
          const passed = polyX >= x;
          const completed = polyX >= x + GENE_W;
          return (
            <g key={`gene-${gene.id}`}>
              <rect
                x={x}
                y={TRACK_Y - GENE_H / 2}
                width={GENE_W}
                height={GENE_H}
                fill={completed ? "#16140f" : "#f4efe6"}
                stroke="#16140f"
                strokeWidth="1"
                style={{ transition: "fill 0.4s ease" }}
              />
              {/* Vertical stripes inside the gene = base-pair texture */}
              {Array.from({ length: 9 }).map((_, j) => (
                <line
                  key={j}
                  x1={x + 12 + j * 19}
                  y1={TRACK_Y - GENE_H / 2 + 8}
                  x2={x + 12 + j * 19}
                  y2={TRACK_Y + GENE_H / 2 - 8}
                  stroke={completed ? "#f4efe6" : "#16140f"}
                  strokeWidth="0.5"
                  opacity={completed ? 0.4 : 0.2}
                />
              ))}
              {/* Gene order number */}
              <text
                x={x + GENE_W / 2}
                y={TRACK_Y + 5}
                textAnchor="middle"
                style={{
                  fontFamily: "JetBrains Mono, monospace",
                  fontSize: 10,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  fill: completed ? "#f4efe6" : "#16140f",
                  transition: "fill 0.4s",
                }}
              >
                {gene.label.toUpperCase()}
              </text>
              {/* "Transcribed" tick under the gene when complete */}
              {completed && (
                <text
                  x={x + GENE_W / 2}
                  y={TRACK_Y + GENE_H / 2 + 22}
                  textAnchor="middle"
                  className="fill-moss"
                  style={{
                    fontFamily: "JetBrains Mono, monospace",
                    fontSize: 9,
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                  }}
                >
                  ✓ transcribed
                </text>
              )}
            </g>
          );
        })}

        {/* ---- Polymerase read-head ---- */}
        {!reduce && (
          <g style={{ transform: `translateX(${polyX}px)` }}>
            {/* Vertical guide line */}
            <line
              x1={0}
              y1={TRACK_Y - 70}
              x2={0}
              y2={TRACK_Y + 90}
              stroke="#b8431c"
              strokeWidth="1"
              opacity={0.3}
            />
            {/* The head: an inverted teardrop / triangle */}
            <polygon
              points="-12,-32 12,-32 0,-8"
              fill="#b8431c"
            />
            <circle cx={0} cy={-32} r={4} fill="#b8431c" />
            {/* Pulse ring at base */}
            <circle
              cx={0}
              cy={TRACK_Y * 0 - 6}
              r={5}
              fill="none"
              stroke="#b8431c"
              strokeWidth="1"
              opacity={0.6}
            >
              <animate
                attributeName="r"
                values="5;14;5"
                dur="1.5s"
                repeatCount="indefinite"
              />
              <animate
                attributeName="opacity"
                values="0.6;0;0.6"
                dur="1.5s"
                repeatCount="indefinite"
              />
            </circle>
            {/* RNA strand extending below the head - abstracted as a wavy line */}
            <path
              d="M 0,8 Q -8,16 0,24 Q 8,32 0,40 Q -8,48 0,56 Q 8,64 0,72"
              fill="none"
              stroke="#b8431c"
              strokeWidth="1.2"
              opacity={0.5}
            />
            {/* Polymerase label */}
            <text
              x={0}
              y={-42}
              textAnchor="middle"
              className="fill-rust"
              style={{
                fontFamily: "JetBrains Mono, monospace",
                fontSize: 9,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
              }}
            >
              Compile
            </text>
          </g>
        )}

        {/* ---- Terminator marker at the right ---- */}
        <g>
          <line
            x1={FIRST_GENE_X + GENES.length * (GENE_W + GENE_GAP) - GENE_GAP + 12}
            y1={TRACK_Y - 30}
            x2={FIRST_GENE_X + GENES.length * (GENE_W + GENE_GAP) - GENE_GAP + 12}
            y2={TRACK_Y + 30}
            stroke="#16140f"
            strokeWidth="1.5"
          />
          <text
            x={FIRST_GENE_X + GENES.length * (GENE_W + GENE_GAP) - GENE_GAP + 22}
            y={TRACK_Y + 5}
            className="fill-ink"
            style={{
              fontFamily: "JetBrains Mono, monospace",
              fontSize: 10,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
            }}
          >
            Plan
          </text>
        </g>
      </svg>

      {/* Faint corner registration marks */}
      <CornerMark className="absolute -top-1 -left-1" />
      <CornerMark className="absolute -top-1 -right-1 rotate-90" />
      <CornerMark className="absolute -bottom-1 -left-1 -rotate-90" />
      <CornerMark className="absolute -bottom-1 -right-1 rotate-180" />
    </div>
  );
}

function CornerMark({ className = "" }: { className?: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" className={className}>
      <path d="M0 0 L7 0 M0 0 L0 7" stroke="#16140f" strokeWidth="1" />
    </svg>
  );
}
