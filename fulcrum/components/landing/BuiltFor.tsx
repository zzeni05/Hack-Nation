"use client";

import { motion } from "framer-motion";

export function BuiltFor() {
  return (
    <section id="built-for" className="relative border-t border-ink/15 bg-paper-deep/30">
      <div className="mx-auto max-w-[1480px] px-8 py-24 lg:py-32">
        <div className="grid gap-8 lg:grid-cols-[1fr_1.5fr] lg:gap-16">
          <div>
            <div className="flex items-center gap-3">
              <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-ink-mute">
                §06 · Built for
              </span>
              <span className="h-px w-12 bg-rule" />
            </div>
            <h2 className="mt-5 font-display text-[44px] leading-[1.02] tracking-[-0.02em] sm:text-[56px]">
              <span style={{ fontWeight: 500 }}>Three kinds of</span>{" "}
              <span className="italic" style={{ fontVariationSettings: '"opsz" 144' }}>
                people
              </span>
            </h2>
          </div>
          <p className="self-end max-w-[58ch] font-display text-[18px] leading-[1.55] text-ink-soft">
            Operon is built for the people who feel the cost of slow operations
            most acutely: principal investigators, contract research labs,
            and lab managers running multiple parallel experiments.
          </p>
        </div>

        <div className="mt-16 grid gap-6 lg:grid-cols-3">
          <PersonaCard
            number="01"
            title="Principal investigators"
            description="Scope a new direction in an afternoon, not a fortnight. Generate a defensible plan with a budget you can actually put on a grant proposal, then run the experiment with the same plan you scoped."
            icon={<MicroscopeIcon />}
            delay={0}
          />
          <PersonaCard
            number="02"
            title="Contract research orgs"
            description="Convert a client brief into a scoped proposal in hours instead of days. Every line backed by a source, every estimate explained, including which parts your team has done before and which require fresh adaptation."
            icon={<HandshakeIcon />}
            delay={0.08}
          />
          <PersonaCard
            number="03"
            title="Lab managers"
            description="See where the same SOP gets modified across runs and turn that into runbook updates. Turn operational memory from scattered notes and one-off corrections into something the whole team can use."
            icon={<ClipboardIcon />}
            delay={0.16}
          />
        </div>
      </div>
    </section>
  );
}

function PersonaCard({
  number,
  title,
  description,
  icon,
  delay,
}: {
  number: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.5, delay }}
      className="relative border border-ink bg-paper p-7"
    >
      {/* Number marker */}
      <div className="flex items-baseline justify-between border-b border-ink pb-4">
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">
          Persona · {number}
        </span>
        <span className="font-mono text-[10px] tabular-nums text-ink-mute">/ 03</span>
      </div>

      {/* Icon */}
      <div className="mt-7 flex h-32 items-center justify-center">{icon}</div>

      {/* Title */}
      <h3 className="mt-7 font-display text-[24px] leading-tight tracking-tight" style={{ fontWeight: 500 }}>
        {title}
      </h3>

      {/* Description */}
      <p className="mt-3 font-display text-[14px] leading-[1.55] text-ink-soft">
        {description}
      </p>
    </motion.div>
  );
}

/* ---------------------------------------------------------------------- */
/* Custom hand-drawn-feeling SVG icons. No Lucide. */
/* These are intentionally not perfectly geometric. They have the slight
   wobble of a technical illustrator's pen line. */

function MicroscopeIcon() {
  return (
    <svg width="84" height="100" viewBox="0 0 84 100" fill="none">
      {/* Base */}
      <ellipse cx="42" cy="92" rx="34" ry="4" fill="none" stroke="#16140f" strokeWidth="1.2" />
      {/* Lower stage support */}
      <path d="M 22 92 L 28 70 L 56 70 L 62 92" stroke="#16140f" strokeWidth="1.2" fill="none" />
      {/* Stage */}
      <rect x="22" y="62" width="40" height="8" stroke="#16140f" strokeWidth="1.2" fill="#f4efe6" />
      {/* Specimen slide */}
      <rect x="28" y="58" width="14" height="4" fill="#b8431c" />
      {/* Light source */}
      <circle cx="42" cy="78" r="3" fill="none" stroke="#16140f" strokeWidth="1" />
      {/* Vertical arm */}
      <path d="M 56 70 L 56 30 Q 56 22 50 22 L 38 22" stroke="#16140f" strokeWidth="1.2" fill="none" />
      {/* Eyepiece */}
      <rect x="30" y="14" width="12" height="10" stroke="#16140f" strokeWidth="1.2" fill="#f4efe6" />
      <path d="M 32 14 L 32 8 L 40 8 L 40 14" stroke="#16140f" strokeWidth="1.2" fill="none" />
      {/* Objective lens turret */}
      <circle cx="38" cy="34" r="6" stroke="#16140f" strokeWidth="1.2" fill="#f4efe6" />
      <line x1="38" y1="40" x2="38" y2="46" stroke="#16140f" strokeWidth="1.2" />
      <rect x="36" y="46" width="4" height="10" fill="#16140f" />
      {/* Focus knob */}
      <circle cx="60" cy="48" r="3" stroke="#16140f" strokeWidth="1" fill="#f4efe6" />
      <circle cx="60" cy="48" r="1" fill="#16140f" />
    </svg>
  );
}

function HandshakeIcon() {
  return (
    <svg width="120" height="80" viewBox="0 0 120 80" fill="none">
      {/* Two documents being exchanged */}
      <g>
        {/* Left doc - brief */}
        <rect x="6" y="20" width="40" height="50" stroke="#16140f" strokeWidth="1.2" fill="#f4efe6" />
        {/* Lines */}
        <line x1="12" y1="30" x2="40" y2="30" stroke="#16140f" strokeWidth="0.8" opacity="0.5" />
        <line x1="12" y1="36" x2="36" y2="36" stroke="#16140f" strokeWidth="0.8" opacity="0.5" />
        <line x1="12" y1="42" x2="40" y2="42" stroke="#16140f" strokeWidth="0.8" opacity="0.5" />
        <line x1="12" y1="48" x2="32" y2="48" stroke="#16140f" strokeWidth="0.8" opacity="0.5" />
        <text x="26" y="64" textAnchor="middle" className="fill-ink" style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 7, letterSpacing: "0.18em", textTransform: "uppercase" }}>
          Brief
        </text>
      </g>

      {/* Center connector arrow */}
      <g>
        <line x1="48" y1="42" x2="72" y2="42" stroke="#b8431c" strokeWidth="1.2" />
        <polygon points="68,38 72,42 68,46" fill="#b8431c" />
        <line x1="72" y1="38" x2="48" y2="38" stroke="#b8431c" strokeWidth="0.8" strokeDasharray="2 2" opacity="0.5" />
      </g>

      {/* Right doc - proposal */}
      <g>
        <rect x="74" y="20" width="40" height="50" stroke="#16140f" strokeWidth="1.2" fill="#f4efe6" />
        <line x1="80" y1="30" x2="108" y2="30" stroke="#16140f" strokeWidth="0.8" opacity="0.5" />
        <line x1="80" y1="36" x2="100" y2="36" stroke="#16140f" strokeWidth="0.8" opacity="0.5" />
        {/* Stamp */}
        <circle cx="100" cy="46" r="6" stroke="#b8431c" strokeWidth="1" fill="none" />
        <text x="100" y="48" textAnchor="middle" className="fill-rust" style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 5, fontWeight: 600 }}>
          ✓
        </text>
        <text x="94" y="64" textAnchor="middle" className="fill-ink" style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 7, letterSpacing: "0.18em", textTransform: "uppercase" }}>
          Proposal
        </text>
      </g>
    </svg>
  );
}

function ClipboardIcon() {
  return (
    <svg width="80" height="100" viewBox="0 0 80 100" fill="none">
      {/* Clip */}
      <rect x="30" y="6" width="20" height="10" stroke="#16140f" strokeWidth="1.2" fill="#f4efe6" />
      <rect x="34" y="2" width="12" height="6" stroke="#16140f" strokeWidth="1.2" fill="#f4efe6" />
      {/* Board */}
      <rect x="10" y="14" width="60" height="80" stroke="#16140f" strokeWidth="1.2" fill="#f4efe6" />
      {/* Inner items - checklist */}
      <g transform="translate(18, 26)">
        {[0, 1, 2, 3, 4].map((i) => {
          const checked = i < 3;
          return (
            <g key={i} transform={`translate(0, ${i * 12})`}>
              <rect
                x="0"
                y="0"
                width="6"
                height="6"
                stroke="#16140f"
                strokeWidth="1"
                fill={checked ? "#16140f" : "#f4efe6"}
              />
              {checked && (
                <path
                  d="M 1 3 L 2.5 4.5 L 5 1.5"
                  stroke="#f4efe6"
                  strokeWidth="1"
                  fill="none"
                />
              )}
              <line x1="10" y1="3" x2="44" y2="3" stroke="#16140f" strokeWidth="0.8" opacity={checked ? 0.4 : 0.7} />
              {/* Strikethrough on checked */}
              {checked && (
                <line x1="10" y1="3" x2="44" y2="3" stroke="#16140f" strokeWidth="0.8" />
              )}
            </g>
          );
        })}
      </g>
      {/* Bottom signal */}
      <g transform="translate(18, 88)">
        <rect x="-2" y="-12" width="44" height="2" fill="#b8431c" />
        <text x="0" y="-2" className="fill-rust" style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 6, letterSpacing: "0.16em", textTransform: "uppercase" }}>
          ◆ Signal
        </text>
      </g>
    </svg>
  );
}
