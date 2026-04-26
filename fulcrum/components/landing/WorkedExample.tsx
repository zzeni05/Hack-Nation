"use client";

import { motion } from "framer-motion";
import Link from "next/link";

export function WorkedExample() {
  return (
    <section id="example" className="relative border-t border-ink/15">
      <div className="mx-auto max-w-[1480px] px-8 py-24 lg:py-32">
        {/* Section header */}
        <div className="grid gap-8 lg:grid-cols-[1fr_1.5fr] lg:gap-16">
          <div>
            <div className="flex items-center gap-3">
              <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-ink-mute">
                §03 · One hypothesis, end to end
              </span>
              <span className="h-px w-12 bg-rule" />
            </div>
            <h2 className="mt-5 font-display text-[44px] leading-[1.02] tracking-[-0.02em] sm:text-[56px]">
              <span style={{ fontWeight: 500 }}>Worked</span>{" "}
              <span className="italic" style={{ fontVariationSettings: '"opsz" 144' }}>
                example
              </span>
            </h2>
          </div>
          <p className="self-end max-w-[60ch] font-display text-[18px] leading-[1.55] text-ink-soft">
            A real hypothesis from the cell biology literature.
            What follows is what Operon actually produces: the workflow,
            the operational plan, and the audit trail. No marketing renders.
          </p>
        </div>

        {/* The hypothesis quote */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mt-12 grid gap-6 border-y border-ink py-8 lg:grid-cols-[120px_1fr_120px] lg:gap-10"
        >
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">
              Hypothesis
            </div>
            <div className="mt-1 font-mono text-[11px] uppercase tracking-[0.22em] text-rust">
              Cell Biology
            </div>
          </div>
          <p className="font-display text-[22px] italic leading-[1.4] tracking-tight" style={{ fontVariationSettings: '"opsz" 144' }}>
            &ldquo;Replacing sucrose with trehalose as a cryoprotectant in the
            freezing medium will increase post-thaw viability of HeLa cells by at
            least 15 percentage points compared to the standard DMSO protocol, due
            to trehalose&rsquo;s superior membrane stabilization at low
            temperatures.&rdquo;
          </p>
          <div className="text-right">
            <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">
              Operon output
            </div>
            <div className="mt-1 font-mono text-[11px] uppercase tracking-[0.22em] text-ink">
              ↓ below
            </div>
          </div>
        </motion.div>

        {/* The three preview frames */}
        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          <PreviewFrame
            number="01"
            title="Workflow"
            subtitle="9 steps · 2 decisions"
            delay={0.1}
          >
            <WorkflowFrame />
          </PreviewFrame>
          <PreviewFrame
            number="02"
            title="Operational plan"
            subtitle="Materials · Budget · Timeline"
            delay={0.2}
          >
            <PlanFrame />
          </PreviewFrame>
          <PreviewFrame
            number="03"
            title="Execution trace"
            subtitle="Auditable · source-grounded"
            delay={0.3}
          >
            <TraceFrame />
          </PreviewFrame>
        </div>

        {/* CTA */}
        <div className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t border-ink pt-8">
          <p className="max-w-[50ch] font-display text-[16px] leading-[1.5] text-ink-soft">
            Compile it yourself with one of the four sample hypotheses, or paste your
            own. Three minutes, end to end.
          </p>
          <Link
            href="/login"
            className="group inline-flex items-center gap-3 bg-ink px-5 py-3 font-mono text-[11px] uppercase tracking-[0.2em] text-paper transition-colors hover:bg-rust"
          >
            Try it now
            <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M3 8h10M9 4l4 4-4 4" />
            </svg>
          </Link>
        </div>
      </div>
    </section>
  );
}

function PreviewFrame({
  number,
  title,
  subtitle,
  delay,
  children,
}: {
  number: string;
  title: string;
  subtitle: string;
  delay: number;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.5, delay }}
      className="relative border border-ink bg-paper-deep/30"
    >
      {/* Frame header */}
      <div className="flex items-center justify-between border-b border-ink/30 px-4 py-2">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] tabular-nums text-rust">{number}</span>
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink">
            {title}
          </span>
        </div>
        <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-ink-mute">
          {subtitle}
        </span>
      </div>
      {/* Frame body */}
      <div className="p-4">{children}</div>
    </motion.div>
  );
}

/* ---------------------------------------------------------------------- */

function WorkflowFrame() {
  const steps = [
    { n: "01", t: "Culture HeLa", c: "EXACT", color: "text-moss" },
    { n: "02", t: "Harvest, count, aliquot", c: "EXACT", color: "text-moss" },
    { n: "03", t: "Prepare cryoprotectants", c: "ADAPTED", color: "text-ink" },
    { n: "04", t: "Select trehalose delivery", c: "DECIDE", color: "text-rust" },
    { n: "05", t: "Equilibrate on ice", c: "ADAPTED", color: "text-ink" },
    { n: "06", t: "Controlled-rate freeze", c: "FACILITY", color: "text-ink" },
    { n: "07", t: "LN₂ storage ≥7d", c: "EXACT", color: "text-moss" },
    { n: "08", t: "Rapid thaw, recover", c: "EXACT", color: "text-moss" },
    { n: "09", t: "Viability assessment", c: "HISTORY", color: "text-ochre" },
  ];

  return (
    <div className="space-y-1">
      {steps.map((s) => (
        <div key={s.n} className="grid grid-cols-[20px_1fr_60px] items-baseline gap-2 border-b border-rule-soft py-1">
          <span className="font-mono text-[9px] tabular-nums text-ink-mute">{s.n}</span>
          <span className="truncate font-display text-[12px] text-ink">{s.t}</span>
          <span className={`text-right font-mono text-[8px] uppercase tracking-[0.16em] ${s.color}`}>
            {s.c}
          </span>
        </div>
      ))}
    </div>
  );
}

function PlanFrame() {
  const materials = [
    { n: "Trehalose dihydrate", s: "Sigma T9531", p: "$184" },
    { n: "DMSO Hybri-Max", s: "Sigma D2650", p: "$92" },
    { n: "DMEM GlutaMAX", s: "Thermo 10566016", p: "$77" },
    { n: "CellTiter-Glo", s: "Promega G7570", p: "$412" },
    { n: "Cryovials 2mL", s: "Corning 430659", p: "$178" },
  ];

  return (
    <div>
      {/* Materials block */}
      <div className="space-y-1">
        {materials.map((m) => (
          <div key={m.n} className="grid grid-cols-[1fr_50px] items-baseline gap-2 border-b border-rule-soft py-1">
            <div className="min-w-0">
              <div className="truncate font-display text-[11px] text-ink" style={{ fontWeight: 500 }}>
                {m.n}
              </div>
              <div className="font-mono text-[9px] tabular-nums text-ink-mute">{m.s}</div>
            </div>
            <span className="text-right font-mono text-[11px] tabular-nums text-ink">
              {m.p}
            </span>
          </div>
        ))}
      </div>

      {/* Budget summary */}
      <div className="mt-3 grid grid-cols-3 gap-2 border-t border-ink pt-3">
        <div>
          <div className="font-mono text-[8px] uppercase tracking-[0.18em] text-ink-mute">Reagents</div>
          <div className="font-display text-[16px] tabular-nums" style={{ fontWeight: 500 }}>$1,102</div>
        </div>
        <div>
          <div className="font-mono text-[8px] uppercase tracking-[0.18em] text-ink-mute">Personnel</div>
          <div className="font-display text-[16px] tabular-nums" style={{ fontWeight: 500 }}>$4,800</div>
        </div>
        <div>
          <div className="font-mono text-[8px] uppercase tracking-[0.18em] text-rust">Total</div>
          <div className="font-display text-[16px] tabular-nums text-rust" style={{ fontWeight: 500 }}>$7,985</div>
        </div>
      </div>

      {/* Timeline */}
      <div className="mt-3 border-t border-rule pt-3">
        <div className="font-mono text-[8px] uppercase tracking-[0.18em] text-ink-mute">
          Schedule · 7 weeks · critical path
        </div>
        <div className="mt-2 flex h-2 gap-px">
          {[1, 1, 1, 0.4, 1, 0.6, 1].map((w, i) => (
            <div
              key={i}
              className={i === 3 || i === 5 ? "bg-paper border border-ink/40" : "bg-ink"}
              style={{ flex: 1, opacity: w }}
            />
          ))}
        </div>
        <div className="mt-1 flex justify-between font-mono text-[8px] uppercase tracking-[0.18em] text-ink-mute">
          <span>W1</span>
          <span>W2</span>
          <span>W3</span>
          <span>W4</span>
          <span>W5</span>
          <span>W6</span>
          <span>W7</span>
        </div>
      </div>
    </div>
  );
}

function TraceFrame() {
  const events = [
    { type: "Compile", t: "Hypothesis ingested · intent extracted", color: "text-ink" },
    { type: "Internal", t: "5 internal SOPs retrieved · 14 chunks", color: "text-ink-soft" },
    { type: "External", t: "9 Tavily sources · 6 retained", color: "text-ink-soft" },
    { type: "Match", t: "Mammalian Cell Freezing SOP · 78%", color: "text-moss" },
    { type: "Decision", t: "Trehalose delivery node generated", color: "text-rust" },
    { type: "Decision", t: "Statistical plan node generated", color: "text-rust" },
    { type: "Signal", t: "Viability step: 87% history modified", color: "text-ochre" },
    { type: "Plan", t: "Materials, budget, timeline derived", color: "text-ink" },
  ];

  return (
    <div className="space-y-1.5">
      {events.map((e, i) => (
        <div key={i} className="grid grid-cols-[60px_1fr] items-baseline gap-2">
          <span className={`font-mono text-[8px] uppercase tracking-[0.16em] ${e.color}`}>
            {e.type}
          </span>
          <span className="font-display text-[11px] leading-tight text-ink">{e.t}</span>
        </div>
      ))}
      <div className="mt-2 border-t border-rule pt-2 font-mono text-[8px] uppercase tracking-[0.18em] text-ink-mute">
        ◆ Every step traceable to its source
      </div>
    </div>
  );
}
