"use client";

import { motion } from "framer-motion";
import type { WorkflowStep } from "@/types";
import { CLASSIFICATION_META, classNames } from "@/lib/display";
import { GitBranch, Check } from "lucide-react";

interface Props {
  steps: WorkflowStep[];
  selectedStepId: string | null;
  onSelectStep: (stepId: string) => void;
}

const TONE_BG: Record<string, string> = {
  neutral: "bg-paper-deep/60 text-ink border-ink/30",
  moss: "bg-moss/10 text-moss border-moss/40",
  rust: "bg-rust/10 text-rust border-rust/40",
  ochre: "bg-ochre/10 text-ochre border-ochre/40",
};

export function WorkflowStepper({ steps, selectedStepId, onSelectStep }: Props) {
  return (
    <section className="relative">
      <div className="flex items-baseline justify-between gap-3 border-b border-ink pb-2">
        <div className="flex items-baseline gap-3">
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">
            §04
          </span>
          <h2 className="font-display text-[22px] leading-none tracking-tight">
            Executable Workflow
          </h2>
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">
            ↳ {steps.length} steps · {steps.filter((s) => s.status === "needs_user_choice").length} open decisions
          </span>
        </div>
        <span className="hidden font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute md:inline">
          Click any step to inspect
        </span>
      </div>

      <ol className="mt-6 relative">
        {/* The vertical rule */}
        <div className="absolute left-[27px] top-3 bottom-3 w-px bg-rule" aria-hidden />

        {steps.map((step, i) => {
          const meta = CLASSIFICATION_META[step.classification];
          const isSelected = selectedStepId === step.step_id;
          const isDecision = step.classification === "decision_required";
          const isOpen = step.status === "needs_user_choice";
          const isComplete = step.status === "complete";

          return (
            <motion.li
              key={step.step_id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04, duration: 0.35 }}
              className="relative pl-16 pb-3"
            >
              {/* Order marker */}
              <button
                onClick={() => onSelectStep(step.step_id)}
                className={classNames(
                  "absolute left-0 top-2 z-10 flex h-14 w-14 items-center justify-center border bg-paper transition-all",
                  isSelected
                    ? "border-ink bg-ink text-paper"
                    : isDecision && isOpen
                    ? "border-rust text-rust hover:bg-rust hover:text-paper"
                    : isComplete
                    ? "border-moss bg-moss text-paper"
                    : "border-ink/40 text-ink hover:border-ink"
                )}
              >
                {isComplete ? (
                  <Check className="h-5 w-5" strokeWidth={2} />
                ) : isDecision ? (
                  <GitBranch className="h-5 w-5" strokeWidth={1.5} />
                ) : (
                  <span className="font-mono text-[15px] tabular-nums">
                    {String(step.order).padStart(2, "0")}
                  </span>
                )}
              </button>

              <div
                onClick={() => onSelectStep(step.step_id)}
                className={classNames(
                  "group cursor-pointer border bg-paper-deep/30 px-5 py-3 transition-all",
                  isSelected
                    ? "border-ink bg-paper-deep/70"
                    : "border-ink/15 hover:border-ink/50 hover:bg-paper-deep/50"
                )}
              >
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={classNames(
                          "border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.2em]",
                          TONE_BG[meta.tone]
                        )}
                      >
                        {meta.short}
                      </span>
                      {isDecision && isOpen && (
                        <span className="inline-flex items-center gap-1 font-mono text-[9px] uppercase tracking-[0.2em] text-rust">
                          <span className="relative flex h-1.5 w-1.5">
                            <span className="absolute inset-0 animate-ping rounded-full bg-rust opacity-60" />
                            <span className="relative h-1.5 w-1.5 rounded-full bg-rust" />
                          </span>
                          Awaiting choice
                        </span>
                      )}
                      {step.classification === "historically_modified" && (
                        <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-ochre">
                          Pattern detected
                        </span>
                      )}
                    </div>
                    <h3 className="mt-1.5 font-display text-[18px] leading-[1.2] tracking-tight">
                      {step.title}
                    </h3>
                    {step.modification_signal && (
                      <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.12em] text-ochre">
                        ◆ {step.modification_signal.split(".")[0]}.
                      </p>
                    )}
                    {step.source_refs.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[10px] text-ink-mute">
                        {step.source_refs.slice(0, 3).map((ref, idx) => (
                          <span key={idx} className="inline-flex items-center gap-1">
                            <span className="text-ink-mute">↳</span>
                            <span className="text-ink-soft">{ref.source_name}</span>
                          </span>
                        ))}
                        {step.source_refs.length > 3 && (
                          <span>+{step.source_refs.length - 3} more</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.li>
          );
        })}
      </ol>
    </section>
  );
}
