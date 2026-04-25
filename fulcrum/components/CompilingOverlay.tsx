"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import type { CompileProgressEvent } from "@/lib/api";

const STAGES: { id: string; label: string }[] = [
  { id: "ingest_internal_knowledge", label: "Querying internal SOP knowledge base" },
  { id: "extract_structured_intent", label: "Extracting structured intent" },
  { id: "discover_external_sources_tavily", label: "Discovering external protocols via Tavily" },
  { id: "tavily_query", label: "Running targeted external searches" },
  { id: "tavily_query_complete", label: "Collecting Tavily results" },
  { id: "ingest_external_sources", label: "Embedding external references locally" },
  { id: "retrieve_context", label: "Retrieving nearest source chunks" },
  { id: "compile_from_protocol_candidates", label: "Compiling executable workflow" },
  { id: "scoring_protocol_candidates", label: "Scoring SOP and protocol fit" },
  { id: "generating_decision_nodes", label: "Generating decision nodes" },
  { id: "drafting_plan_sections", label: "Drafting plan sections" },
  { id: "validating_workflow", label: "Validating provenance" },
  { id: "save_workflow", label: "Saving workflow" },
];

interface Props {
  visible: boolean;
  events: CompileProgressEvent[];
}

export function CompilingOverlay({ visible, events }: Props) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!visible) {
      setElapsed(0);
      return;
    }
    const startedAt = Date.now();
    const id = setInterval(() => {
      setElapsed(Date.now() - startedAt);
    }, 250);
    return () => clearInterval(id);
  }, [visible]);

  const progressEvents = events.filter((event): event is Extract<CompileProgressEvent, { type: "progress" }> => event.type === "progress");
  const latest = progressEvents.at(-1);
  const completedStageIds = new Set(progressEvents.slice(0, -1).map((event) => event.stage));
  const currentStageId = latest?.stage;
  const currentIndex = Math.max(
    0,
    STAGES.findIndex((item) => item.id === currentStageId)
  );
  const progressPercent = Math.max(
    6,
    ((currentIndex + (latest?.current && latest?.total ? latest.current / latest.total : 0.25)) / STAGES.length) * 100
  );

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-paper/80 backdrop-blur-sm"
        >
          <div className="corner-mark relative w-[480px] max-w-[90vw] border border-ink bg-paper-deep/80 p-8">
            {/* Scan line */}
            <div className="pointer-events-none absolute inset-x-0 top-0 h-full overflow-hidden">
              <div className="absolute inset-x-0 h-px animate-scan-line bg-rust/40" />
            </div>

            <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-rust">
              ◆ Compile in progress
            </div>
            <div className="mt-3 font-display text-[28px] leading-[1.05]">
              Mapping hypothesis onto operational reality
            </div>
            <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-mute">
              Internal SOPs · External literature · Prior runs
            </div>
            <div className="mt-4 border-l border-rust pl-3">
              <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-ink-mute">
                Live backend stage · {(elapsed / 1000).toFixed(1)}s elapsed
              </div>
              <div className="mt-1 font-display text-[14px] leading-[1.4] text-ink">
                {latest?.message ?? "Opening compile stream"}
              </div>
              {latest?.current && latest?.total && (
                <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-mute">
                  {latest.current} / {latest.total}
                </div>
              )}
            </div>

            <div className="mt-6 space-y-2">
              {STAGES.map(({ id, label }) => {
                const isCurrent = id === currentStageId;
                const isDone = completedStageIds.has(id) || STAGES.findIndex((item) => item.id === id) < currentIndex;
                return (
                <div
                  key={id}
                  className="flex items-center gap-3 font-mono text-[11px]"
                >
                  <span
                    className={`inline-flex h-3 w-3 items-center justify-center border ${
                      isDone
                        ? "border-moss bg-moss"
                        : isCurrent
                        ? "border-rust bg-rust animate-pulse-soft"
                        : "border-ink-mute"
                    }`}
                  >
                    {isDone && (
                      <svg viewBox="0 0 8 8" className="h-2 w-2 text-paper">
                        <path
                          d="M1 4l2 2 4-5"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.5"
                        />
                      </svg>
                    )}
                  </span>
                  <span
                    className={`${
                      isDone || isCurrent ? "text-ink" : "text-ink-mute"
                    } uppercase tracking-[0.12em]`}
                  >
                    {label}
                  </span>
                  {isDone && (
                    <span className="ml-auto text-[9px] uppercase tracking-[0.22em] text-ink-mute">
                      OK
                    </span>
                  )}
                </div>
              )})}
            </div>

            {/* Progress bar */}
            <div className="mt-6 h-px w-full bg-rule">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(progressPercent, 98)}%` }}
                className="h-full bg-rust"
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
