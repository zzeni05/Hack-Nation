"use client";

import Link from "next/link";
import { useReducedMotion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";

const CYCLE_S = 18;
const BASES = ["A", "T", "G", "C"] as const;

export function HeroOperon() {
  return (
    <section className="relative min-h-screen overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.42]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(22,20,15,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(22,20,15,0.05) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />

      <div className="relative mx-auto grid min-h-screen max-w-[1480px] items-center gap-12 px-8 py-12 lg:grid-cols-[minmax(420px,0.82fr)_minmax(560px,1.18fr)] lg:py-16">
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <span className="h-px w-12 bg-ink" />
            <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-ink">
              Operon · A lab operations engine
            </span>
          </div>

          <h1 className="mt-6 max-w-[18ch] font-display text-[68px] leading-[0.92] tracking-[-0.025em] sm:text-[88px] lg:text-[104px] xl:text-[112px]">
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

          <p className="mt-8 max-w-[52ch] font-display text-[19px] leading-[1.45] text-ink-soft sm:text-[21px]">
            From a single sentence to a personalized, lab-ready experiment plan,
            step by step, materials to validation, grounded in your lab&rsquo;s own SOPs
            and the world&rsquo;s authoritative protocol literature.
          </p>

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

          <div className="mt-12 grid max-w-[560px] grid-cols-3 border-y border-ink/30 py-4 font-mono text-[9px] uppercase tracking-[0.18em] text-ink-mute">
            <span>
              <span className="text-rust">◆</span> hypothesis
            </span>
            <span className="text-center">source map</span>
            <span className="text-right">run plan</span>
          </div>
        </div>

        <HeroScientificIllustration />
      </div>
    </section>
  );
}

function HeroScientificIllustration() {
  const reduce = useReducedMotion();
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (reduce) return;
    const start = performance.now();
    let raf = 0;
    const loop = (now: number) => {
      setTick(((now - start) / 1000) % CYCLE_S);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [reduce]);

  const progress = reduce ? 0.42 : tick / CYCLE_S;
  const polymeraseY = 92 + progress * 610;
  const synthHeight = Math.max(0, polymeraseY - 96);
  const temp = (37 - progress * 2.8).toFixed(1);
  const elapsed = Math.floor(progress * 126);
  const conc = (0.18 + progress * 0.42).toFixed(2);

  const basePairs = useMemo(
    () =>
      Array.from({ length: 24 }).map((_, i) => {
        const y = 82 + i * 28;
        const phase = i * 0.58;
        const left = 344 + Math.sin(phase) * 84;
        const right = 344 - Math.sin(phase) * 84;
        const nearReadHead = Math.max(0, 1 - Math.abs(y - polymeraseY) / 150);
        const split = nearReadHead * 32;
        const x1 = left - Math.sign(left - right) * split;
        const x2 = right + Math.sign(left - right) * split;
        return {
          y,
          x1,
          x2,
          a: BASES[i % BASES.length],
          b: BASES[(i + 1) % BASES.length],
          passed: y < polymeraseY,
          emphasis: nearReadHead,
        };
      }),
    [polymeraseY],
  );

  const leftPath = basePairs.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x1.toFixed(1)} ${p.y}`).join(" ");
  const rightPath = basePairs.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x2.toFixed(1)} ${p.y}`).join(" ");

  return (
    <div className="relative min-h-[720px] overflow-hidden border border-ink bg-paper shadow-[18px_18px_0_rgba(22,20,15,0.07)] lg:min-h-[820px]">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.24]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(135deg, rgba(22,20,15,0.13) 0 1px, transparent 1px 9px)",
        }}
      />

      <InstrumentDial className="-left-28 -top-28 h-72 w-72 animate-[slowRotate_42s_linear_infinite]" />
      <InstrumentDial className="-bottom-24 right-8 h-56 w-56 animate-[slowRotateReverse_48s_linear_infinite]" />
      <InstrumentDial className="right-20 top-8 h-40 w-40 animate-[slowRotate_55s_linear_infinite]" />

      <svg viewBox="0 0 760 840" className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid meet">
        <defs>
          <filter id="ragged">
            <feTurbulence type="fractalNoise" baseFrequency="0.018" numOctaves="2" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="0.9" />
          </filter>
          <filter id="rustGlow">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <pattern id="stipples" width="18" height="18" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="4" r="0.7" fill="#16140f" opacity="0.22" />
            <circle cx="12" cy="10" r="0.45" fill="#16140f" opacity="0.18" />
            <circle cx="7" cy="15" r="0.55" fill="#16140f" opacity="0.14" />
          </pattern>
        </defs>

        <rect x="0" y="0" width="760" height="840" fill="url(#stipples)" opacity="0.42" />

        <g opacity="0.4">
          {Array.from({ length: 18 }).map((_, i) => (
            <line key={i} x1={82 + i * 32} y1="46" x2={82 + i * 32} y2="792" stroke="#16140f" strokeWidth="0.35" strokeDasharray="2 10" />
          ))}
          {Array.from({ length: 22 }).map((_, i) => (
            <line key={i} x1="58" y1={72 + i * 32} x2="700" y2={72 + i * 32} stroke="#16140f" strokeWidth="0.35" strokeDasharray="2 10" />
          ))}
        </g>

        <g filter="url(#ragged)">
          <path d={leftPath} fill="none" stroke="#16140f" strokeWidth="2" strokeLinecap="round" />
          <path d={rightPath} fill="none" stroke="#16140f" strokeWidth="2" strokeLinecap="round" />

          {basePairs.map((pair, i) => (
            <g key={i} opacity={pair.passed ? 1 : 0.58}>
              <line
                x1={pair.x1}
                y1={pair.y}
                x2={pair.x2}
                y2={pair.y}
                stroke={pair.passed ? "#b8431c" : "#16140f"}
                strokeWidth={pair.emphasis > 0.2 ? 1.9 : 0.8}
                strokeDasharray={pair.emphasis > 0.2 ? "0" : "3 5"}
              />
              <circle cx={pair.x1} cy={pair.y} r={3.5} fill="#f4efe6" stroke="#16140f" strokeWidth="0.8" />
              <circle cx={pair.x2} cy={pair.y} r={3.5} fill="#f4efe6" stroke="#16140f" strokeWidth="0.8" />
              <text x={pair.x1 - 15} y={pair.y + 4} textAnchor="middle" className="fill-ink" style={mono(9, 0.12)}>
                {pair.a}
              </text>
              <text x={pair.x2 + 15} y={pair.y + 4} textAnchor="middle" className="fill-ink" style={mono(9, 0.12)}>
                {pair.b}
              </text>
            </g>
          ))}
        </g>

        <g filter="url(#rustGlow)">
          <path
            d={`M 344 96 C 318 190 374 258 344 340 C 314 426 374 510 344 ${96 + synthHeight}`}
            fill="none"
            stroke="#b8431c"
            strokeWidth="4"
            strokeLinecap="round"
            opacity="0.84"
          />
          <path
            d={`M 344 ${polymeraseY - 50} C 366 ${polymeraseY - 46} 386 ${polymeraseY - 20} 374 ${polymeraseY + 6} C 360 ${polymeraseY + 38} 302 ${polymeraseY + 34} 294 ${polymeraseY + 4} C 286 ${polymeraseY - 28} 312 ${polymeraseY - 56} 344 ${polymeraseY - 50} Z`}
            fill="#b8431c"
            opacity="0.95"
          />
          <circle cx="340" cy={polymeraseY - 12} r="5" fill="#f4efe6" opacity="0.82" />
        </g>

        <g>
          <path d="M 446 172 C 514 160 540 126 596 118" fill="none" stroke="#16140f" strokeWidth="0.9" strokeDasharray="4 6" />
          <text x="604" y="113" className="fill-ink" style={mono(10, 0.18)}>PROMOTER</text>
          <text x="426" y="112" className="fill-rust" style={mono(10, 0.18)}>5&apos;</text>
          <text x="232" y="706" className="fill-ink" style={mono(10, 0.18)}>3&apos;</text>

          <path d="M 260 422 C 200 418 178 396 142 376" fill="none" stroke="#16140f" strokeWidth="0.8" strokeDasharray="4 6" />
          <text x="54" y="366" className="fill-ink" style={mono(9, 0.18)}>150 BP/S</text>
          <text x="54" y="384" className="fill-ink-mute" style={mono(8, 0.14)}>COMPILE RATE</text>
        </g>

        <Magnifier basePairs={basePairs.slice(8, 12)} />
        <TrehaloseInset />
        <ReadoutStrip temp={temp} elapsed={elapsed} conc={conc} />

        <g opacity="0.55">
          <path d="M 62 52 L 130 52 M 62 52 L 62 120" fill="none" stroke="#16140f" strokeWidth="1.1" />
          <path d="M 698 788 L 630 788 M 698 788 L 698 720" fill="none" stroke="#16140f" strokeWidth="1.1" />
        </g>
      </svg>

      <div className="absolute left-6 top-6 max-w-[270px] font-mono text-[9px] uppercase leading-[1.65] tracking-[0.18em] text-ink-mute">
        hypothesis as promoter · protocol steps as regulated outputs · branch points resolved by the scientist
      </div>

      <style jsx>{`
        @keyframes slowRotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes slowRotateReverse {
          from { transform: rotate(360deg); }
          to { transform: rotate(0deg); }
        }
      `}</style>
    </div>
  );
}

function InstrumentDial({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 220 220" className={`pointer-events-none absolute opacity-[0.22] ${className}`}>
      <circle cx="110" cy="110" r="96" fill="none" stroke="#16140f" strokeWidth="1" />
      <circle cx="110" cy="110" r="72" fill="none" stroke="#16140f" strokeWidth="0.6" strokeDasharray="3 8" />
      {Array.from({ length: 48 }).map((_, i) => {
        const a = (i / 48) * Math.PI * 2;
        const inner = i % 4 === 0 ? 82 : 88;
        const outer = 98;
        return (
          <line
            key={i}
            x1={110 + Math.cos(a) * inner}
            y1={110 + Math.sin(a) * inner}
            x2={110 + Math.cos(a) * outer}
            y2={110 + Math.sin(a) * outer}
            stroke="#16140f"
            strokeWidth={i % 4 === 0 ? 1.1 : 0.45}
          />
        );
      })}
      <path d="M 110 28 L 118 110 L 110 192 L 102 110 Z" fill="#16140f" opacity="0.16" />
    </svg>
  );
}

function Magnifier({ basePairs }: { basePairs: Array<{ a: string; b: string }> }) {
  return (
    <g transform="translate(68 500)">
      <circle cx="78" cy="78" r="66" fill="#f4efe6" stroke="#16140f" strokeWidth="1.3" />
      <circle cx="78" cy="78" r="58" fill="none" stroke="#16140f" strokeWidth="0.5" strokeDasharray="2 5" />
      <line x1="126" y1="126" x2="168" y2="168" stroke="#16140f" strokeWidth="2" strokeLinecap="round" />
      {basePairs.map((pair, i) => (
        <g key={i} transform={`translate(35 ${42 + i * 19})`}>
          <text x="0" y="4" className="fill-rust" style={mono(10, 0.12)}>{pair.a}</text>
          <line x1="22" y1="0" x2="70" y2="0" stroke="#16140f" strokeWidth={i === 1 ? 1.6 : 0.75} />
          <text x="88" y="4" className="fill-rust" style={mono(10, 0.12)}>{pair.b}</text>
        </g>
      ))}
      <text x="78" y="18" textAnchor="middle" className="fill-ink" style={mono(8, 0.18)}>BASE ZOOM</text>
    </g>
  );
}

function TrehaloseInset() {
  return (
    <g transform="translate(468 604)">
      <rect x="0" y="0" width="214" height="142" fill="#f4efe6" stroke="#16140f" strokeWidth="1" />
      <text x="14" y="22" className="fill-ink" style={mono(8, 0.18)}>TREHALOSE</text>
      <text x="14" y="38" className="fill-ink-mute" style={mono(6.8, 0.08)}>alpha,alpha-trehalose</text>
      <HexoseRing x={56} y={82} />
      <HexoseRing x={132} y={82} />
      <line x1="84" y1="82" x2="104" y2="82" stroke="#16140f" strokeWidth="1.1" />
      <text x="94" y="76" textAnchor="middle" className="fill-rust" style={mono(8, 0.1)}>O</text>
      <text x="18" y="126" className="fill-ink-mute" style={mono(6.7, 0.1)}>cryoprotectant candidate</text>
    </g>
  );
}

function HexoseRing({ x, y }: { x: number; y: number }) {
  const pts = [
    [x - 24, y - 12],
    [x, y - 26],
    [x + 24, y - 12],
    [x + 24, y + 14],
    [x, y + 28],
    [x - 24, y + 14],
  ];
  return (
    <g>
      <polygon points={pts.map((p) => p.join(",")).join(" ")} fill="none" stroke="#16140f" strokeWidth="1.1" />
      <text x={x} y={y - 18} textAnchor="middle" className="fill-rust" style={mono(7.2, 0.08)}>O</text>
      <text x={x - 34} y={y - 18} className="fill-ink-mute" style={mono(6, 0.05)}>OH</text>
      <text x={x + 28} y={y + 22} className="fill-ink-mute" style={mono(6, 0.05)}>OH</text>
    </g>
  );
}

function ReadoutStrip({ temp, elapsed, conc }: { temp: string; elapsed: number; conc: string }) {
  const values = [
    ["TEMP", `${temp} C`],
    ["TRE", `${conc} M`],
    ["THAW", `${elapsed}s`],
    ["FIT", "0.82"],
    ["SOP", "SCAN"],
  ];
  return (
    <g transform="translate(684 138)">
      <rect x="0" y="0" width="50" height="476" fill="#16140f" />
      <text x="25" y="22" textAnchor="middle" fill="#f4efe6" style={mono(6.5, 0.18)}>READOUT</text>
      {values.map(([label, value], i) => (
        <g key={label} transform={`translate(0 ${56 + i * 76})`}>
          <line x1="7" y1="0" x2="43" y2="0" stroke="#f4efe6" strokeWidth="0.5" opacity="0.36" />
          <text x="25" y="18" textAnchor="middle" fill="#f4efe6" style={mono(6, 0.14)} opacity="0.62">{label}</text>
          <text x="25" y="42" textAnchor="middle" fill={i === 1 ? "#52613a" : "#f4efe6"} style={mono(8.5, 0.06)}>{value}</text>
        </g>
      ))}
      <rect x="8" y="438" width="34" height="20" fill="#b8431c" opacity="0.92" />
    </g>
  );
}

function mono(size: number, letterSpacing: number) {
  return {
    fontFamily: "JetBrains Mono, monospace",
    fontSize: size,
    letterSpacing: `${letterSpacing}em`,
    textTransform: "uppercase" as const,
  };
}
