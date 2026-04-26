"use client";

import { motion } from "framer-motion";
import { ParseAnimation } from "./ParseAnimation";
import { MapAnimation } from "./MapAnimation";
import { CompileAnimation } from "./CompileAnimation";

export function HowItWorks() {
  return (
    <section id="how" className="relative border-t border-ink/15 bg-paper-deep/30">
      <div className="mx-auto max-w-[1480px] px-8 py-24 lg:py-32">
        {/* Section header */}
        <div className="grid gap-8 lg:grid-cols-[1fr_1.5fr] lg:gap-16">
          <div>
            <div className="flex items-center gap-3">
              <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-ink-mute">
                §02 · The mechanism
              </span>
              <span className="h-px w-12 bg-rule" />
            </div>
            <h2 className="mt-5 font-display text-[44px] leading-[1.02] tracking-[-0.02em] sm:text-[56px]">
              <span style={{ fontWeight: 500 }}>How Operon</span>{" "}
              <span className="italic" style={{ fontVariationSettings: '"opsz" 144' }}>
                compiles
              </span>
            </h2>
          </div>
          <p className="self-end max-w-[58ch] font-display text-[18px] leading-[1.55] text-ink-soft">
            Three coordinated passes: reading the hypothesis, mapping it onto
            your lab&rsquo;s institutional memory, and compiling a workflow where
            deterministic steps, branching choices, and human-needed gaps are separate.
          </p>
        </div>

        {/* Three columns */}
        <div className="mt-16 grid gap-px overflow-hidden border border-ink bg-ink lg:grid-cols-3">
          <Column
            number="01"
            title="Read"
            italic="the hypothesis"
            description="A single sentence becomes structured experimental intent: model system, intervention, comparator, outcome, threshold, likely assay, operational constraints, and the mechanism being tested."
            animation={<ParseAnimation />}
          />
          <Column
            number="02"
            title="Map"
            italic="onto your lab"
            description="The structured intent is matched against uploaded SOPs, runbooks, equipment manuals, facility constraints, and prior runs, then supplemented with authoritative external protocols pulled in real time."
            animation={<MapAnimation />}
          />
          <Column
            number="03"
            title="Compile"
            italic="an executable plan"
            description="The result is a step-by-step workflow with materials, budget, timeline, validation, and risks. Deterministic parts are filled from sources, ambiguous parts become decision branches, and unsupported parts are flagged for human authoring."
            animation={<CompileAnimation />}
          />
        </div>
      </div>
    </section>
  );
}

function Column({
  number,
  title,
  italic,
  description,
  animation,
}: {
  number: string;
  title: string;
  italic: string;
  description: string;
  animation: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.5 }}
      className="bg-paper p-8 lg:p-10"
    >
      <div className="flex items-baseline gap-3">
        <span className="font-mono text-[40px] leading-none tabular-nums text-rust">
          {number}
        </span>
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">
          / 03
        </span>
      </div>

      <h3 className="mt-4 font-display text-[34px] leading-[1.05] tracking-[-0.015em]">
        <span style={{ fontWeight: 500 }}>{title}</span>{" "}
        <span className="italic text-ink-soft" style={{ fontVariationSettings: '"opsz" 144' }}>
          {italic}
        </span>
      </h3>

      {/* The animation panel */}
      <div className="mt-6 aspect-[4/3] w-full border border-ink/15 bg-paper-deep/40 p-4">
        {animation}
      </div>

      <p className="mt-5 font-display text-[15px] leading-[1.55] text-ink-soft">
        {description}
      </p>
    </motion.div>
  );
}
