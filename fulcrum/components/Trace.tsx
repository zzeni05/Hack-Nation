"use client";

import { motion } from "framer-motion";
import type { TraceEvent, SopRecommendation } from "@/types";
import {
  Activity,
  Database,
  Globe,
  GitBranch,
  CheckCircle2,
  RefreshCw,
  FileEdit,
  MessageSquare,
  TrendingUp,
  FileText,
} from "lucide-react";

const EVENT_META: Record<
  TraceEvent["event_type"],
  { icon: any; color: string; label: string }
> = {
  workflow_compiled: { icon: Activity, color: "text-ink", label: "Compiled" },
  internal_sources_retrieved: { icon: Database, color: "text-ink-soft", label: "Internal RAG" },
  external_sources_retrieved: { icon: Globe, color: "text-ink-soft", label: "Tavily" },
  external_sources_embedded: { icon: Database, color: "text-ink-soft", label: "External RAG" },
  memory_retrieved: { icon: MessageSquare, color: "text-ochre", label: "Memory" },
  sop_match_scored: { icon: CheckCircle2, color: "text-moss", label: "SOP scored" },
  decision_node_created: { icon: GitBranch, color: "text-rust", label: "Branch" },
  decision_committed: { icon: CheckCircle2, color: "text-moss", label: "Decision" },
  step_modified: { icon: FileEdit, color: "text-ochre", label: "Modified" },
  note_added: { icon: MessageSquare, color: "text-ink-soft", label: "Note" },
  feedback_submitted: { icon: MessageSquare, color: "text-ink-soft", label: "Feedback" },
  workflow_recompiled: { icon: RefreshCw, color: "text-ink", label: "Recompile" },
  sop_improvement_recommended: { icon: TrendingUp, color: "text-ochre", label: "SOP signal" },
};

export function ExecutionTrace({ trace }: { trace: TraceEvent[] }) {
  const reversed = [...trace].reverse();
  return (
    <section>
      <div className="flex items-baseline justify-between gap-3 border-b border-ink pb-2">
        <div className="flex items-baseline gap-3">
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">
            §06
          </span>
          <h2 className="font-display text-[22px] leading-none tracking-tight">
            Execution Trace
          </h2>
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">
            ↳ {trace.length} events · auditable
          </span>
        </div>
      </div>

      <ol className="mt-5 relative">
        <div className="absolute left-[15px] top-2 bottom-2 w-px bg-rule" aria-hidden />
        {reversed.map((event, i) => {
          const meta = EVENT_META[event.event_type];
          const Icon = meta.icon;
          return (
            <motion.li
              key={event.event_id}
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03 }}
              className="relative grid grid-cols-[40px_70px_1fr] items-start gap-3 py-2"
            >
              <span className="relative z-10 flex h-7 w-7 items-center justify-center border border-ink bg-paper">
                <Icon className={`h-3 w-3 ${meta.color}`} strokeWidth={1.8} />
              </span>
              <span className="pt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-mute">
                {meta.label}
              </span>
              <div className="min-w-0">
                <p className="font-display text-[13px] leading-[1.45] text-ink">
                  {event.summary}
                </p>
                {event.scientist_note && (
                  <p className="mt-1 border-l border-rust pl-2 font-display text-[12px] italic leading-[1.4] text-ink-soft">
                    "{event.scientist_note}"
                  </p>
                )}
                {event.affected_sections && event.affected_sections.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {event.affected_sections.map((s) => (
                      <span
                        key={s}
                        className="border border-ink/20 px-1 py-0.5 font-mono text-[9px] uppercase tracking-[0.16em] text-ink-mute"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                )}
                <time className="mt-0.5 block font-mono text-[10px] tabular-nums text-ink-mute">
                  {new Date(event.timestamp).toLocaleTimeString("en-US", { hour12: false })}
                </time>
              </div>
            </motion.li>
          );
        })}
      </ol>
    </section>
  );
}

export function SopImprovementPanel({ recs }: { recs: SopRecommendation[] }) {
  if (recs.length === 0) return null;
  return (
    <section>
      <div className="flex items-baseline justify-between gap-3 border-b border-ink pb-2">
        <div className="flex items-baseline gap-3">
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">
            ◆
          </span>
          <h2 className="font-display text-[22px] leading-none tracking-tight">
            SOP Improvement Signals
          </h2>
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-ochre">
            ↳ Detected from prior run history
          </span>
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        {recs.map((rec, i) => (
          <motion.div
            key={rec.recommendation_id}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="relative border border-ochre/40 bg-ochre/5 p-5"
          >
            <div className="absolute right-0 top-0 px-2 py-1 font-mono text-[9px] uppercase tracking-[0.2em] text-ochre">
              ◆ Pattern
            </div>
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-ochre" strokeWidth={1.5} />
              <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">
                {rec.sop_name}
              </span>
            </div>
            <h3 className="mt-2 font-display text-[18px] leading-tight tracking-tight" style={{ fontWeight: 500 }}>
              {rec.step_reference}
            </h3>

            <div className="mt-3 border-l-2 border-ochre pl-3">
              <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-ochre">
                Signal
              </div>
              <p className="mt-0.5 font-display text-[14px] leading-[1.4]">
                {rec.signal}
              </p>
            </div>

            <div className="mt-3">
              <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">
                Common modification
              </div>
              <p className="mt-0.5 font-display text-[13px] italic leading-[1.45] text-ink-soft">
                {rec.common_modification}
              </p>
            </div>

            <div className="mt-3 border-t border-ochre/30 pt-3">
              <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink">
                Recommendation
              </div>
              <p className="mt-1 font-display text-[14px] leading-[1.5]">
                {rec.recommendation}
              </p>
            </div>

            <div className="mt-4 flex gap-2">
              <button className="border border-ink px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-ink transition-colors hover:bg-ink hover:text-paper">
                Accept
              </button>
              <button className="border border-ink/30 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-soft transition-colors hover:border-ink hover:text-ink">
                Defer
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
