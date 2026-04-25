"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Workflow } from "@/types";
import { compileWorkflow, commitDecision, modifyStep, submitFeedback } from "@/lib/api";
import { Masthead } from "@/components/Masthead";
import { HypothesisInput } from "@/components/HypothesisInput";
import { CompilingOverlay } from "@/components/CompilingOverlay";
import { LiteratureQC } from "@/components/LiteratureQC";
import { SopMatchPanel } from "@/components/SopMatchPanel";
import { IntentCard } from "@/components/IntentCard";
import { WorkflowSummary } from "@/components/WorkflowSummary";
import { WorkflowStepper } from "@/components/WorkflowStepper";
import { StepInspector } from "@/components/StepInspector";
import { PlanTabs } from "@/components/PlanTabs";
import { ExecutionTrace, SopImprovementPanel } from "@/components/Trace";
import { ArrowUp, RefreshCw } from "lucide-react";

export default function Home() {
  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [isCompiling, setIsCompiling] = useState(false);
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedStep =
    workflow?.steps.find((s) => s.step_id === selectedStepId) ?? null;

  async function handleCompile(hypothesis: string) {
    setIsCompiling(true);
    setSelectedStepId(null);
    setError(null);
    try {
      const wf = await compileWorkflow(hypothesis, { useExternalRetrieval: true });
      setWorkflow(wf);
      // Smoothly scroll to results after compile
      setTimeout(() => {
        document
          .getElementById("results")
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 200);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Workflow compilation failed");
    } finally {
      setIsCompiling(false);
    }
  }

  async function handleCommitDecision(
    stepId: string,
    optionId: string,
    note: string
  ) {
    if (!workflow) return;
    const result = await commitDecision(workflow.workflow_id, stepId, optionId, note);
    setWorkflow(result.workflow);
    setSelectedStepId(null);
  }

  async function handleModifyStep(stepId: string, instructions: string[], note: string) {
    if (!workflow) return;
    const result = await modifyStep(workflow.workflow_id, stepId, instructions, note);
    setWorkflow(result.workflow);
  }

  async function handleSubmitFeedback(
    stepId: string,
    section: string,
    rating: number,
    correction: string,
    reason: string
  ) {
    if (!workflow) return;
    const result = await submitFeedback(
      workflow.workflow_id,
      stepId,
      section,
      rating,
      correction,
      reason
    );
    setWorkflow(result.workflow);
  }

  function handleReset() {
    setWorkflow(null);
    setSelectedStepId(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <main className="relative min-h-screen">
      <CompilingOverlay visible={isCompiling} />

      <Masthead />

      {/* Hero / input */}
      <section className="relative">
        <div className="grid-paper absolute inset-0 opacity-60" aria-hidden />
        <div className="relative mx-auto max-w-[1480px] px-8 py-12">
          <div className="grid gap-12 lg:grid-cols-[1fr_460px]">
            <div>
              <HypothesisInput
                onCompile={handleCompile}
                isCompiling={isCompiling}
              />
              {error && (
                <div className="mt-4 border-l-2 border-rust pl-3 font-display text-[14px] leading-[1.5] text-rust">
                  {error}
                </div>
              )}
            </div>

            {/* Sidebar manifesto */}
            <aside className="relative lg:border-l lg:border-ink/15 lg:pl-12">
              <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">
                Editor's note
              </div>
              <p className="mt-3 font-display text-[20px] leading-[1.35] tracking-tight">
                <span className="italic" style={{ fontVariationSettings: '"opsz" 144' }}>
                  "It's not the ideas that slow science down."
                </span>{" "}
                <span style={{ fontWeight: 500 }}>
                  It's the operations.
                </span>
              </p>
              <p className="mt-3 font-display text-[14px] leading-[1.55] text-ink-soft">
                A senior scientist who has run a similar experiment can scope a new
                one in hours. One who hasn't may take days — and the quality
                difference is real. A plan with the wrong concentration or an
                unrealistic timeline can send a lab down the wrong path for weeks.
              </p>

              <div className="mt-6 border-t border-ink pt-4">
                <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">
                  How this differs
                </div>
                <ul className="mt-2 space-y-2 font-display text-[13px] leading-[1.45]">
                  <li className="grid grid-cols-[20px_1fr] gap-1">
                    <span className="font-mono text-[11px] tabular-nums text-rust">01</span>
                    <span>Grounded in your lab's existing SOPs and runbooks, not generated from scratch.</span>
                  </li>
                  <li className="grid grid-cols-[20px_1fr] gap-1">
                    <span className="font-mono text-[11px] tabular-nums text-rust">02</span>
                    <span>Every step is labelled by origin — exact reuse, adapted, external, or decision required.</span>
                  </li>
                  <li className="grid grid-cols-[20px_1fr] gap-1">
                    <span className="font-mono text-[11px] tabular-nums text-rust">03</span>
                    <span>Ambiguity becomes auditable decision branches, not hidden assumptions.</span>
                  </li>
                  <li className="grid grid-cols-[20px_1fr] gap-1">
                    <span className="font-mono text-[11px] tabular-nums text-rust">04</span>
                    <span>Scientist feedback compounds — every correction improves the next plan.</span>
                  </li>
                </ul>
              </div>

              <div className="mt-6 border-t border-rule pt-3 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-mute">
                Powered by Fulcrum Science · MIT Club of Northern California × MIT Club of Germany
              </div>
            </aside>
          </div>
        </div>
      </section>

      {/* Results */}
      <AnimatePresence>
        {workflow && (
          <motion.div
            id="results"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="relative border-t border-ink bg-paper-deep/30"
          >
            <div className="mx-auto max-w-[1480px] px-8 py-12">
              {/* Hypothesis recap + reset */}
              <div className="mb-10 flex flex-wrap items-start justify-between gap-4 border-b border-ink pb-4">
                <div className="max-w-[68ch]">
                  <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">
                    Compiled workflow · {workflow.workflow_id}
                  </div>
                  <p className="mt-1.5 font-display text-[20px] leading-[1.35] italic tracking-tight">
                    "{workflow.hypothesis}"
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleReset}
                    className="inline-flex items-center gap-2 border border-ink/30 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-soft transition-colors hover:border-ink hover:text-ink"
                  >
                    <RefreshCw className="h-3 w-3" strokeWidth={1.5} />
                    New hypothesis
                  </button>
                </div>
              </div>

              {/* Summary banner */}
              <WorkflowSummary workflow={workflow} />

              {/* Two-column main content */}
              <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_360px]">
                <div className="space-y-12">
                  {/* Literature QC */}
                  <LiteratureQC qc={workflow.qc} />

                  {/* SOP match */}
                  <SopMatchPanel match={workflow.sop_match} />

                  {/* Workflow stepper */}
                  <WorkflowStepper
                    steps={workflow.steps}
                    selectedStepId={selectedStepId}
                    onSelectStep={setSelectedStepId}
                  />

                  {/* Plan tabs */}
                  <PlanTabs workflow={workflow} />

                  {/* SOP improvements */}
                  <SopImprovementPanel recs={workflow.sop_recommendations} />
                </div>

                {/* Sticky sidebar */}
                <aside className="space-y-8 lg:sticky lg:top-6 lg:self-start">
                  <IntentCard intent={workflow.structured_intent} />
                  {workflow.memory_used && workflow.memory_used.length > 0 && (
                    <section className="border border-ochre/40 bg-ochre/5 p-4">
                      <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-ochre">
                        Prior lab memory used
                      </div>
                      <ul className="mt-3 space-y-2">
                        {workflow.memory_used.map((memory, i) => (
                          <li
                            key={i}
                            className="border-l border-ochre pl-3 font-display text-[13px] italic leading-[1.45] text-ink-soft"
                          >
                            {memory}
                          </li>
                        ))}
                      </ul>
                    </section>
                  )}
                  {workflow.protocol_basis && (
                    <section className="border border-moss/40 bg-moss/5 p-4">
                      <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-moss">
                        Protocol basis
                      </div>
                      <h3 className="mt-2 font-display text-[18px] leading-tight tracking-tight">
                        {workflow.protocol_basis.base_protocol_name}
                      </h3>
                      <div className="mt-3 grid grid-cols-2 gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-mute">
                        <span>Score {Math.round(workflow.protocol_basis.base_protocol_score * 100)}%</span>
                        <span>{workflow.protocol_basis.candidate_count} candidates</span>
                        <span>{workflow.protocol_basis.imported_steps} imported</span>
                        <span>{workflow.protocol_basis.gap_filled_steps} gap-filled</span>
                      </div>
                    </section>
                  )}
                  <ExecutionTrace trace={workflow.trace} />
                </aside>
              </div>
            </div>

            {/* Footer / scroll-to-top */}
            <div className="border-t border-ink bg-paper">
              <div className="mx-auto flex max-w-[1480px] items-center justify-between px-8 py-4">
                <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">
                  End of compiled plan · Source-grounded · Scientist-correctable
                </div>
                <button
                  onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                  className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-ink hover:text-rust"
                >
                  <ArrowUp className="h-3 w-3" strokeWidth={1.5} />
                  Top of issue
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Step inspector drawer */}
      <StepInspector
        step={selectedStep}
        onClose={() => setSelectedStepId(null)}
        onCommitDecision={handleCommitDecision}
        onModifyStep={handleModifyStep}
        onSubmitFeedback={handleSubmitFeedback}
      />

      {/* Empty-state footer when no workflow */}
      {!workflow && !isCompiling && (
        <footer className="relative border-t border-ink bg-paper py-6">
          <div className="mx-auto flex max-w-[1480px] flex-wrap items-center justify-between gap-3 px-8 font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">
            <span>Challenge 04 · The AI Scientist</span>
            <span>Powered by Fulcrum Science</span>
          </div>
        </footer>
      )}
    </main>
  );
}
