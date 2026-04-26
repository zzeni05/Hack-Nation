"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Check, ClipboardCheck, Save } from "lucide-react";
import type { ExecutionRun, Workflow } from "@/types";
import { classNames } from "@/lib/display";

interface Props {
  workflow: Workflow;
  run: ExecutionRun | null;
  onCreateRun: () => Promise<void>;
  onStartStep: (stepId: string) => Promise<void>;
  onSaveStep: (stepId: string, operatorNote: string, deviationNote: string, actuals: Record<string, unknown>) => Promise<void>;
  onCompleteStep: (stepId: string, operatorNote: string, deviationNote: string, actuals: Record<string, unknown>) => Promise<void>;
  onAddAttachment: (stepId: string, filename: string, note: string, contentType?: string) => Promise<void>;
  onCompleteRun: () => Promise<void>;
  onActiveStepChange?: (stepId: string | null) => void;
}

export function ExecutionWorkspace({
  workflow,
  run,
  onCreateRun,
  onStartStep,
  onSaveStep,
  onCompleteStep,
  onAddAttachment,
  onCompleteRun,
  onActiveStepChange,
}: Props) {
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
  const [operatorNote, setOperatorNote] = useState("");
  const [deviationNote, setDeviationNote] = useState("");
  const [actualsText, setActualsText] = useState("");
  const [attachmentNote, setAttachmentNote] = useState("");
  const [busy, setBusy] = useState(false);

  const executableSteps = workflow.steps.filter((step) => step.classification !== "decision_required");
  const runStep = run?.steps.find((step) => step.step_id === (selectedStepId ?? run.current_step_id ?? run.steps[0]?.step_id));
  const workflowStep = workflow.steps.find((step) => step.step_id === runStep?.step_id) ?? executableSteps[0];
  const currentIndex = Math.max(0, executableSteps.findIndex((step) => step.step_id === workflowStep?.step_id));
  const completedCount = run?.steps.filter((step) => step.status === "completed").length ?? 0;

  useEffect(() => {
    if (!runStep) return;
    setOperatorNote(runStep.operator_note ?? "");
    setDeviationNote(runStep.deviation_note ?? "");
    setActualsText(Object.keys(runStep.actuals ?? {}).length ? JSON.stringify(runStep.actuals, null, 2) : "");
  }, [runStep?.step_id]);

  useEffect(() => {
    onActiveStepChange?.(workflowStep?.step_id ?? null);
  }, [onActiveStepChange, workflowStep?.step_id]);

  async function withBusy(action: () => Promise<void>) {
    setBusy(true);
    try {
      await action();
    } finally {
      setBusy(false);
    }
  }

  function parsedActuals(): Record<string, unknown> {
    if (!actualsText.trim()) return {};
    try {
      return JSON.parse(actualsText) as Record<string, unknown>;
    } catch {
      return { note: actualsText };
    }
  }

  function go(offset: number) {
    const next = executableSteps[currentIndex + offset];
    if (next) setSelectedStepId(next.step_id);
  }

  return (
    <section className="relative border-t border-ink pt-8">
      <div className="mb-5 flex items-baseline justify-between gap-3 border-b border-ink pb-2">
        <div className="flex items-baseline gap-3">
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">
            §07
          </span>
          <h2 className="font-display text-[22px] leading-none tracking-tight">
            Execute Run
          </h2>
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">
            ↳ Check off steps · notes · actuals · provenance
          </span>
        </div>
        {run && (
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-mute">
            {completedCount}/{run.steps.length} complete · {run.status}
          </span>
        )}
      </div>

      {!run ? (
        <div className="border border-ink bg-paper-deep/30 p-6">
          <div className="font-display text-[24px] leading-tight tracking-tight">
            Start a live execution run from this compiled workflow.
          </div>
          <p className="mt-2 max-w-[70ch] font-display text-[14px] leading-[1.55] text-ink-soft">
            This creates a run instance with per-step status, notes, actual values, and provenance events. The compiled plan remains the template; the run records what actually happened.
          </p>
          <button
            onClick={() => withBusy(onCreateRun)}
            disabled={busy}
            className="mt-5 inline-flex items-center gap-2 bg-ink px-4 py-3 font-mono text-[10px] uppercase tracking-[0.18em] text-paper transition-colors hover:bg-rust disabled:opacity-40"
          >
            <ClipboardCheck className="h-3.5 w-3.5" strokeWidth={1.5} />
            Start execution run
          </button>
        </div>
      ) : workflowStep && runStep ? (
        <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
          <div className="space-y-1 border-r border-ink/15 pr-4">
            {run.steps.map((step) => (
              <button
                key={step.step_id}
                onClick={() => setSelectedStepId(step.step_id)}
                className={classNames(
                  "grid w-full grid-cols-[28px_1fr] gap-2 border-l px-2 py-2 text-left transition-colors",
                  step.step_id === runStep.step_id
                    ? "border-rust bg-rust/5"
                    : "border-transparent hover:border-ink/30 hover:bg-paper-deep/30"
                )}
              >
                <span className={classNames(
                  "mt-0.5 flex h-5 w-5 items-center justify-center border font-mono text-[9px]",
                  step.status === "completed"
                    ? "border-moss bg-moss text-paper"
                    : step.status === "active"
                    ? "border-rust text-rust"
                    : "border-ink/30 text-ink-mute"
                )}>
                  {step.status === "completed" ? <Check className="h-3 w-3" /> : step.order}
                </span>
                <span>
                  <span className="block font-display text-[13px] leading-[1.25]">{step.title}</span>
                  <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-ink-mute">{step.status}</span>
                </span>
              </button>
            ))}
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-rust">
                  Step {workflowStep.order.toString().padStart(2, "0")} · {workflowStep.classification}
                </div>
                <h3 className="mt-1 font-display text-[34px] leading-[1.05] tracking-tight">
                  {workflowStep.title}
                </h3>
                <p className="mt-3 max-w-[80ch] font-display text-[14px] leading-[1.55] text-ink-soft">
                  {workflowStep.rationale}
                </p>
              </div>
              <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-mute">
                {runStep.status}
              </div>
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_300px]">
              <div>
                <div className="border border-ink/20 bg-paper-deep/30 p-4">
                  <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">
                    Instructions
                  </div>
                  <ol className="mt-3 space-y-2">
                    {workflowStep.instructions.map((instruction, i) => (
                      <li key={i} className="grid grid-cols-[24px_1fr] gap-2 font-display text-[14px] leading-[1.5]">
                        <span className="font-mono text-[10px] text-ink-mute">{i + 1}</span>
                        <span>{instruction}</span>
                      </li>
                    ))}
                  </ol>
                </div>

                <div className="mt-5 grid gap-4">
                  <label>
                    <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">What happened</span>
                    <textarea
                      value={operatorNote}
                      onChange={(event) => setOperatorNote(event.target.value)}
                      rows={4}
                      className="mt-1 w-full resize-none border border-ink/20 bg-paper-deep/30 px-3 py-2 font-display text-[14px] leading-[1.45] focus:outline-none"
                      placeholder="Record what you did, observations, measurements, or operator context."
                    />
                  </label>
                  <label>
                    <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">Deviation note</span>
                    <textarea
                      value={deviationNote}
                      onChange={(event) => setDeviationNote(event.target.value)}
                      rows={3}
                      className="mt-1 w-full resize-none border border-ink/20 bg-paper-deep/30 px-3 py-2 font-display text-[14px] leading-[1.45] focus:outline-none"
                      placeholder="If you changed or skipped anything, record why."
                    />
                  </label>
                  <label>
                    <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">Actual values JSON or notes</span>
                    <textarea
                      value={actualsText}
                      onChange={(event) => setActualsText(event.target.value)}
                      rows={4}
                      className="mt-1 w-full resize-none border border-ink/20 bg-paper-deep/30 px-3 py-2 font-mono text-[12px] leading-[1.45] focus:outline-none"
                      placeholder={'{\n  "cell_count": "1.2e6",\n  "freezing_medium": "10% trehalose candidate"\n}'}
                    />
                  </label>
                  <div className="border border-ink/15 bg-paper-deep/20 p-3">
                    <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">Attachments</div>
                    <input
                      type="file"
                      className="mt-2 block w-full font-mono text-[11px]"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (!file) return;
                        void withBusy(() => onAddAttachment(runStep.step_id, file.name, attachmentNote, file.type));
                        event.currentTarget.value = "";
                      }}
                    />
                    <input
                      value={attachmentNote}
                      onChange={(event) => setAttachmentNote(event.target.value)}
                      className="mt-2 w-full border border-ink/20 bg-paper px-2 py-1.5 font-display text-[13px] focus:outline-none"
                      placeholder="Optional note for next attachment"
                    />
                    {runStep.attachments.length > 0 && (
                      <ul className="mt-2 space-y-1">
                        {runStep.attachments.map((attachment) => (
                          <li key={attachment.attachment_id ?? attachment.filename} className="font-mono text-[10px] text-ink-mute">
                            {attachment.filename ?? attachment.name}{attachment.note ? ` · ${attachment.note}` : ""}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>

              <aside className="space-y-4">
                <div className="border border-ink/15 bg-paper-deep/20 p-4">
                  <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">Sources</div>
                  <ul className="mt-2 space-y-2">
                    {workflowStep.source_refs.length ? workflowStep.source_refs.map((ref, i) => (
                      <li key={i} className="font-display text-[13px] leading-[1.35] text-ink-soft">
                        <span className="text-ink">{ref.source_name}</span>
                        <span className="block font-mono text-[9px] uppercase tracking-[0.16em] text-ink-mute">
                          {ref.source_origin ?? ref.source_type}
                        </span>
                      </li>
                    )) : (
                      <li className="font-display text-[13px] text-ink-soft">No source reference attached.</li>
                    )}
                  </ul>
                </div>
                <div className="border border-ochre/30 bg-ochre/5 p-4">
                  <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-ochre">Execution provenance</div>
                  <p className="mt-2 font-display text-[13px] leading-[1.45] text-ink-soft">
                    Completing this step records timestamped notes, deviations, and actuals into the run event log and workflow trace.
                  </p>
                </div>
              </aside>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-rule pt-4">
              <div className="flex items-center gap-2">
                <button onClick={() => go(-1)} disabled={currentIndex === 0} className="inline-flex items-center gap-2 border border-ink/25 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.16em] disabled:opacity-30">
                  <ArrowLeft className="h-3 w-3" /> Previous
                </button>
                <button onClick={() => go(1)} disabled={currentIndex >= executableSteps.length - 1} className="inline-flex items-center gap-2 border border-ink/25 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.16em] disabled:opacity-30">
                  Next <ArrowRight className="h-3 w-3" />
                </button>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => withBusy(() => onStartStep(runStep.step_id))} disabled={busy || runStep.status === "active" || runStep.status === "completed"} className="border border-ink/30 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.16em] disabled:opacity-30">
                  Start step
                </button>
                <button onClick={() => withBusy(() => onSaveStep(runStep.step_id, operatorNote, deviationNote, parsedActuals()))} disabled={busy} className="inline-flex items-center gap-2 border border-ink/30 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.16em] disabled:opacity-30">
                  <Save className="h-3 w-3" /> Save notes
                </button>
                <button onClick={() => withBusy(() => onCompleteStep(runStep.step_id, operatorNote, deviationNote, parsedActuals()))} disabled={busy || runStep.status === "completed"} className="inline-flex items-center gap-2 bg-ink px-4 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-paper hover:bg-rust disabled:opacity-30">
                  <Check className="h-3 w-3" /> Complete step
                </button>
              </div>
            </div>

            {completedCount === run.steps.length && run.status !== "completed" && (
              <button onClick={() => withBusy(onCompleteRun)} disabled={busy} className="mt-4 bg-moss px-4 py-3 font-mono text-[10px] uppercase tracking-[0.18em] text-paper disabled:opacity-40">
                Complete execution run
              </button>
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
}
