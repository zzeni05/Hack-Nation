"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Workflow } from "@/types";
import { formatCurrency, classNames } from "@/lib/display";
import { Beaker, Coins, CalendarDays, ShieldCheck, AlertOctagon } from "lucide-react";

const TABS = [
  { id: "materials", label: "Materials", icon: Beaker },
  { id: "budget", label: "Budget", icon: Coins },
  { id: "timeline", label: "Timeline", icon: CalendarDays },
  { id: "validation", label: "Validation", icon: ShieldCheck },
  { id: "risks", label: "Risks", icon: AlertOctagon },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function PlanTabs({ workflow }: { workflow: Workflow }) {
  const [tab, setTab] = useState<TabId>("materials");

  const totalBudget = workflow.plan.budget.reduce((sum, b) => sum + b.total, 0);
  const totalMaterials = workflow.plan.materials.reduce((sum, m) => sum + m.total, 0);
  const totalWeeks = Math.max(...workflow.plan.timeline.map((p) => p.end_week));

  return (
    <section className="relative">
      <div className="flex items-baseline justify-between gap-3 border-b border-ink pb-2">
        <div className="flex items-baseline gap-3">
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">
            §05
          </span>
          <h2 className="font-display text-[22px] leading-none tracking-tight">
            The Operational Plan
          </h2>
        </div>
        <span className="hidden font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute md:inline">
          {formatCurrency(totalBudget)} · {totalWeeks}-week schedule
        </span>
      </div>

      {/* Tab nav */}
      <div className="mt-5 flex gap-0 border-b border-ink/20">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = t.id === tab;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={classNames(
                "relative -mb-px flex items-center gap-2 border-b-2 px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.18em] transition-colors",
                active
                  ? "border-ink text-ink"
                  : "border-transparent text-ink-mute hover:text-ink"
              )}
            >
              <Icon className="h-3.5 w-3.5" strokeWidth={1.5} />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="mt-6">
        <AnimatePresence mode="wait">
          {tab === "materials" && (
            <motion.div
              key="materials"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <MaterialsTable workflow={workflow} total={totalMaterials} />
            </motion.div>
          )}
          {tab === "budget" && (
            <motion.div
              key="budget"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <BudgetView workflow={workflow} total={totalBudget} />
            </motion.div>
          )}
          {tab === "timeline" && (
            <motion.div
              key="timeline"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <TimelineView workflow={workflow} totalWeeks={totalWeeks} />
            </motion.div>
          )}
          {tab === "validation" && (
            <motion.div
              key="validation"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <ValidationView workflow={workflow} />
            </motion.div>
          )}
          {tab === "risks" && (
            <motion.div
              key="risks"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <RisksView workflow={workflow} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}

function MaterialsTable({ workflow, total }: { workflow: Workflow; total: number }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full font-display text-[13px]">
        <thead>
          <tr className="border-b border-ink text-left">
            <th className="py-2 pr-3 font-mono text-[9px] uppercase tracking-[0.22em] text-ink-mute">Item · Purpose</th>
            <th className="py-2 pr-3 font-mono text-[9px] uppercase tracking-[0.22em] text-ink-mute">Supplier</th>
            <th className="py-2 pr-3 font-mono text-[9px] uppercase tracking-[0.22em] text-ink-mute">Catalog</th>
            <th className="py-2 pr-3 text-right font-mono text-[9px] uppercase tracking-[0.22em] text-ink-mute">Qty</th>
            <th className="py-2 pl-3 text-right font-mono text-[9px] uppercase tracking-[0.22em] text-ink-mute">Total</th>
          </tr>
        </thead>
        <tbody>
          {workflow.plan.materials.map((m, i) => (
            <tr key={i} className="border-b border-rule-soft">
              <td className="py-3 pr-3">
                <div className="text-ink" style={{ fontWeight: 500 }}>{m.name}</div>
                <div className="font-mono text-[10px] text-ink-mute">{m.purpose}</div>
              </td>
              <td className="py-3 pr-3 font-mono text-[12px] tabular-nums text-ink-soft">{m.supplier}</td>
              <td className="py-3 pr-3 font-mono text-[12px] tabular-nums text-ink">{m.catalog}</td>
              <td className="py-3 pr-3 text-right font-mono text-[12px] tabular-nums text-ink-soft">{m.quantity}</td>
              <td className="py-3 pl-3 text-right font-mono text-[13px] tabular-nums text-ink">
                {formatCurrency(m.total)}
              </td>
            </tr>
          ))}
          <tr>
            <td colSpan={4} className="pt-3 text-right font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">
              Materials subtotal
            </td>
            <td className="pt-3 pl-3 text-right font-display text-[20px] tabular-nums text-ink" style={{ fontWeight: 500 }}>
              {formatCurrency(total)}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function BudgetView({ workflow, total }: { workflow: Workflow; total: number }) {
  const max = Math.max(...workflow.plan.budget.map((b) => b.total));
  return (
    <div>
      <div className="mb-6 flex items-baseline justify-between border-b border-ink/20 pb-3">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">
            Total estimated cost
          </div>
          <div className="font-display text-[40px] leading-none tabular-nums" style={{ fontWeight: 500 }}>
            {formatCurrency(total)}
          </div>
        </div>
        <div className="text-right">
          <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">
            {workflow.plan.budget.length} line items · {workflow.plan.materials.length} reagents tracked
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {workflow.plan.budget.map((b, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className="grid grid-cols-[1fr_120px] items-center gap-4"
          >
            <div>
              <div className="flex items-baseline justify-between">
                <span className="font-display text-[14px]" style={{ fontWeight: 500 }}>
                  {b.item}
                </span>
                <span className="font-mono text-[12px] tabular-nums text-ink">
                  {formatCurrency(b.total)}
                </span>
              </div>
              <div className="mt-1.5 h-1 w-full bg-rule">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(b.total / max) * 100}%` }}
                  transition={{ delay: i * 0.05 + 0.2, duration: 0.6, ease: "easeOut" }}
                  className="h-full bg-ink"
                />
              </div>
              <div className="mt-1 flex items-center gap-2 font-mono text-[10px] text-ink-mute">
                <span className="border border-ink/20 px-1.5 py-0.5 text-[9px] uppercase tracking-[0.18em]">
                  {b.category}
                </span>
                <span>{b.basis}</span>
                <span className="ml-auto uppercase tracking-[0.18em]">
                  conf · {b.confidence}
                </span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function TimelineView({ workflow, totalWeeks }: { workflow: Workflow; totalWeeks: number }) {
  return (
    <div>
      <div className="mb-6 flex items-baseline justify-between border-b border-ink/20 pb-3">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">
            Total schedule
          </div>
          <div className="font-display text-[40px] leading-none tabular-nums" style={{ fontWeight: 500 }}>
            {totalWeeks} <span className="text-[20px] text-ink-mute">weeks</span>
          </div>
        </div>
        <div className="text-right font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">
          {workflow.plan.timeline.filter((t) => t.critical_path).length} critical-path phases
        </div>
      </div>

      {/* Week scale */}
      <div className="relative mb-2 grid font-mono text-[10px] tabular-nums text-ink-mute" style={{ gridTemplateColumns: `220px repeat(${totalWeeks}, 1fr)` }}>
        <span></span>
        {Array.from({ length: totalWeeks }).map((_, i) => (
          <span key={i} className="border-l border-rule pl-1.5">
            W{i + 1}
          </span>
        ))}
      </div>

      <div className="space-y-1.5">
        {workflow.plan.timeline.map((phase, i) => {
          const left = ((phase.start_week - 1) / totalWeeks) * 100;
          const width = ((phase.end_week - phase.start_week + 1) / totalWeeks) * 100;
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.06 }}
              className="grid items-center gap-2"
              style={{ gridTemplateColumns: `220px 1fr` }}
            >
              <div className="font-display text-[13px]">
                <div style={{ fontWeight: 500 }}>{phase.phase}</div>
                <div className="font-mono text-[10px] text-ink-mute">{phase.duration}</div>
              </div>
              <div className="relative h-7 border-y border-rule-soft bg-paper-deep/20">
                {/* Week guides */}
                {Array.from({ length: totalWeeks - 1 }).map((_, j) => (
                  <div
                    key={j}
                    className="absolute top-0 bottom-0 w-px bg-rule-soft"
                    style={{ left: `${((j + 1) / totalWeeks) * 100}%` }}
                  />
                ))}
                <motion.div
                  initial={{ opacity: 0, scaleX: 0 }}
                  animate={{ opacity: 1, scaleX: 1 }}
                  transition={{ delay: i * 0.06 + 0.2, duration: 0.5, ease: "easeOut" }}
                  className={classNames(
                    "absolute top-1 bottom-1 origin-left flex items-center justify-start px-2 font-mono text-[10px] uppercase tracking-[0.12em]",
                    phase.critical_path
                      ? "bg-ink text-paper"
                      : "border border-ink/30 bg-paper text-ink-soft"
                  )}
                  style={{ left: `${left}%`, width: `${width}%` }}
                >
                  {phase.critical_path && <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-rust" />}
                  <span className="truncate">
                    {phase.duration}
                  </span>
                </motion.div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-4 flex items-center gap-4 border-t border-rule pt-3 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-mute">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-3 bg-ink" /> Critical path
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-3 border border-ink/30 bg-paper" /> Parallel / non-critical
        </span>
      </div>
    </div>
  );
}

function ValidationView({ workflow }: { workflow: Workflow }) {
  return (
    <div className="space-y-4">
      {workflow.plan.validation.map((v, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.06 }}
          className={classNames(
            "border bg-paper-deep/30 p-4",
            v.type === "primary" ? "border-ink" : "border-ink/20"
          )}
        >
          <div className="flex items-baseline justify-between gap-3">
            <div className="flex items-baseline gap-2">
              <span
                className={classNames(
                  "border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.2em]",
                  v.type === "primary"
                    ? "border-rust bg-rust text-paper"
                    : "border-ink/30 text-ink-soft"
                )}
              >
                {v.type}
              </span>
              <h3 className="font-display text-[18px] tracking-tight" style={{ fontWeight: 500 }}>
                {v.endpoint}
              </h3>
            </div>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <div>
              <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-ink-mute">
                Assay
              </div>
              <div className="mt-0.5 font-display text-[13px]">{v.assay}</div>
            </div>
            <div>
              <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-ink-mute">
                Threshold
              </div>
              <div className="mt-0.5 font-display text-[13px]">{v.threshold}</div>
            </div>
            <div>
              <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-ink-mute">
                Controls
              </div>
              <div className="mt-0.5 font-display text-[13px]">
                {v.controls.join(" · ")}
              </div>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

function RisksView({ workflow }: { workflow: Workflow }) {
  const severityColors = {
    high: "border-rust text-rust",
    medium: "border-ochre text-ochre",
    low: "border-moss text-moss",
  };
  return (
    <div className="space-y-3">
      {workflow.plan.risks.map((r, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          className="grid grid-cols-[80px_1fr] gap-4 border-b border-rule pb-3"
        >
          <div className="space-y-1">
            <span className={classNames("inline-block border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.2em]", severityColors[r.severity])}>
              {r.severity}
            </span>
            <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-ink-mute">
              {r.category}
            </div>
          </div>
          <div>
            <div className="font-display text-[14px] leading-[1.4]" style={{ fontWeight: 500 }}>
              {r.risk}
            </div>
            <div className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-mute">
              Mitigation
            </div>
            <div className="font-display text-[13px] leading-[1.45] text-ink-soft">
              {r.mitigation}
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
