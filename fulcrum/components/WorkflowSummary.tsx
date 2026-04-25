"use client";

import { motion } from "framer-motion";
import type { Workflow } from "@/types";
import { CLASSIFICATION_META, formatCurrency } from "@/lib/display";

export function WorkflowSummary({ workflow }: { workflow: Workflow }) {
  const counts = workflow.steps.reduce<Record<string, number>>((acc, s) => {
    acc[s.classification] = (acc[s.classification] || 0) + 1;
    return acc;
  }, {});

  const totalBudget = workflow.plan.budget.reduce((sum, b) => sum + b.total, 0);
  const totalWeeks = Math.max(...workflow.plan.timeline.map((p) => p.end_week));
  const externalCount = workflow.steps.reduce(
    (s, step) =>
      s +
      step.source_refs.filter(
        (r) => r.source_type.startsWith("external") || r.source_type === "supplier_doc"
      ).length,
    0
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="grid gap-px overflow-hidden border border-ink bg-ink sm:grid-cols-3 lg:grid-cols-8"
    >
      <Cell label="Steps" value={workflow.steps.length.toString()} />
      <Cell
        label="Open decisions"
        value={workflow.open_decision_count.toString()}
        accent={workflow.open_decision_count > 0}
      />
      <Cell label="External refs" value={externalCount.toString()} />
      <Cell label="Schedule" value={`${totalWeeks} wks`} />
      <Cell label="Est. budget" value={formatCurrency(totalBudget)} />
      <Cell
        label="SOP signals"
        value={workflow.sop_recommendations.length.toString()}
        amber
      />
      <Cell
        label="Lab memory"
        value={(workflow.memory_used?.length ?? 0).toString()}
        amber={(workflow.memory_used?.length ?? 0) > 0}
      />
      <Cell
        label="Protocols"
        value={(workflow.protocol_basis?.candidate_count ?? 0).toString()}
      />
    </motion.div>
  );
}

function Cell({
  label,
  value,
  accent,
  amber,
}: {
  label: string;
  value: string;
  accent?: boolean;
  amber?: boolean;
}) {
  return (
    <div className="bg-paper px-4 py-3">
      <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-ink-mute">
        {label}
      </div>
      <div
        className={`mt-0.5 font-display text-[26px] leading-none tabular-nums ${
          accent ? "text-rust" : amber ? "text-ochre" : "text-ink"
        }`}
        style={{ fontWeight: 500 }}
      >
        {value}
      </div>
    </div>
  );
}
