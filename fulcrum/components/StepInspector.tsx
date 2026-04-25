"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, GitBranch, BookOpen, AlertTriangle, Star, Send, FileEdit, MessageSquare } from "lucide-react";
import type { WorkflowStep } from "@/types";
import { CLASSIFICATION_META, classNames } from "@/lib/display";

interface Props {
  step: WorkflowStep | null;
  onClose: () => void;
  onCommitDecision: (
    stepId: string,
    optionId: string,
    note: string
  ) => void;
  onModifyStep: (stepId: string, instructions: string[], note: string) => void;
  onSubmitFeedback: (
    stepId: string,
    section: string,
    rating: number,
    correction: string,
    reason: string
  ) => void;
}

const TONE_TEXT: Record<string, string> = {
  neutral: "text-ink",
  moss: "text-moss",
  rust: "text-rust",
  ochre: "text-ochre",
};

export function StepInspector({
  step,
  onClose,
  onCommitDecision,
  onModifyStep,
  onSubmitFeedback,
}: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editedInstructions, setEditedInstructions] = useState("");
  const [editNote, setEditNote] = useState("");
  const [feedbackSection, setFeedbackSection] = useState("protocol");
  const [feedbackRating, setFeedbackRating] = useState(4);
  const [feedbackCorrection, setFeedbackCorrection] = useState("");
  const [feedbackReason, setFeedbackReason] = useState("");

  useEffect(() => {
    if (step?.classification === "decision_required") {
      const recommended = step.options?.find((o) => o.recommended);
      setSelected(step.selected_option_id ?? recommended?.option_id ?? null);
      setNote(step.scientist_note ?? "");
    } else {
      setSelected(null);
      setNote("");
    }
    setIsEditing(false);
    setEditedInstructions((step?.instructions ?? []).join("\n"));
    setEditNote("");
    setFeedbackSection("protocol");
    setFeedbackRating(4);
    setFeedbackCorrection("");
    setFeedbackReason("");
  }, [step?.step_id]);

  return (
    <AnimatePresence>
      {step && (
        <motion.aside
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ type: "spring", damping: 28, stiffness: 220 }}
          className="fixed inset-y-0 right-0 z-40 w-full max-w-[640px] overflow-y-auto border-l border-ink bg-paper shadow-[-12px_0_40px_rgba(0,0,0,0.08)]"
        >
          {/* Sticky header */}
          <div className="sticky top-0 z-10 border-b border-ink bg-paper-deep">
            <div className="flex items-center justify-between px-6 py-3">
              <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">
                Step inspector · {String(step.order).padStart(2, "0")}
              </div>
              <button
                onClick={onClose}
                className="flex h-7 w-7 items-center justify-center text-ink transition-colors hover:bg-ink hover:text-paper"
              >
                <X className="h-3.5 w-3.5" strokeWidth={2} />
              </button>
            </div>
          </div>

          <div className="px-6 py-6">
            {/* Title block */}
            <div className="flex items-start gap-3">
              <span
                className={classNames(
                  "mt-1 border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.2em]",
                  CLASSIFICATION_META[step.classification].tone === "rust"
                    ? "border-rust text-rust"
                    : CLASSIFICATION_META[step.classification].tone === "moss"
                    ? "border-moss text-moss"
                    : CLASSIFICATION_META[step.classification].tone === "ochre"
                    ? "border-ochre text-ochre"
                    : "border-ink text-ink"
                )}
              >
                {CLASSIFICATION_META[step.classification].label}
              </span>
            </div>
            <h2 className="mt-3 font-display text-[28px] leading-[1.1] tracking-tight">
              {step.title}
            </h2>

            {/* Rationale */}
            <div className="mt-5">
              <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">
                Rationale
              </div>
              <p className="mt-1.5 font-display text-[14px] leading-[1.55] text-ink-soft">
                {step.rationale}
              </p>
            </div>

            {/* Decision UI */}
            {step.classification === "decision_required" && step.options && (
              <div className="mt-7">
                <div className="flex items-center gap-2 border-b border-ink pb-2">
                  <GitBranch className="h-4 w-4 text-rust" strokeWidth={1.5} />
                  <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink">
                    Choose a branch
                  </span>
                  <span className="ml-auto font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">
                    {step.options.length} options
                  </span>
                </div>
                {step.reason && (
                  <p className="mt-3 border-l-2 border-rust pl-3 font-display text-[13px] italic leading-[1.5] text-ink-soft">
                    {step.reason}
                  </p>
                )}

                <div className="mt-4 space-y-3">
                  {step.options.map((option) => {
                    const isSelected = selected === option.option_id;
                    return (
                      <button
                        key={option.option_id}
                        onClick={() => setSelected(option.option_id)}
                        className={classNames(
                          "group relative w-full border bg-paper p-4 text-left transition-all",
                          isSelected
                            ? "border-ink bg-paper-deep/60"
                            : "border-ink/15 hover:border-ink/50"
                        )}
                      >
                        {/* Selected mark */}
                        <span
                          className={classNames(
                            "absolute left-0 top-0 h-full w-1 transition-all",
                            isSelected ? "bg-rust" : "bg-transparent"
                          )}
                        />

                        <div className="flex items-start gap-3">
                          {/* Radio */}
                          <span
                            className={classNames(
                              "mt-1 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border",
                              isSelected ? "border-ink" : "border-ink-mute"
                            )}
                          >
                            {isSelected && (
                              <span className="h-1.5 w-1.5 rounded-full bg-rust" />
                            )}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-display text-[17px] tracking-tight" style={{ fontWeight: 500 }}>
                                {option.label}
                              </span>
                              {option.recommended && (
                                <span className="inline-flex items-center gap-1 border border-rust px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.18em] text-rust">
                                  <Star className="h-2.5 w-2.5" strokeWidth={2} fill="currentColor" />
                                  Recommended
                                </span>
                              )}
                            </div>
                            <p className="mt-1 font-display text-[13px] leading-[1.5] text-ink-soft">
                              {option.summary}
                            </p>

                            {/* Tradeoffs grid */}
                            <div className="mt-3 grid gap-x-4 gap-y-2 sm:grid-cols-3">
                              <Stat label="Cost" value={option.cost_impact} />
                              <Stat label="Timeline" value={option.timeline_impact} />
                              <Stat label="Risk" value={option.risks.length === 0 ? "Low" : option.risks.length === 1 ? "Med" : "High"} />
                            </div>

                            {/* Tradeoffs */}
                            <ul className="mt-3 space-y-0.5">
                              {option.tradeoffs.map((t, i) => (
                                <li
                                  key={i}
                                  className="font-display text-[12px] leading-[1.4] text-ink-soft before:mr-1.5 before:font-mono before:text-[10px] before:text-ink-mute before:content-['◦']"
                                >
                                  {t}
                                </li>
                              ))}
                            </ul>

                            {/* Risks */}
                            {option.risks.length > 0 && (
                              <div className="mt-2 flex items-start gap-1.5 font-mono text-[10px] uppercase tracking-[0.15em] text-rust">
                                <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" strokeWidth={1.8} />
                                <span className="normal-case tracking-normal font-display text-[12px] leading-[1.4] text-rust">
                                  {option.risks.join(" · ")}
                                </span>
                              </div>
                            )}

                            {/* Sources */}
                            {option.supporting_refs.length > 0 && (
                              <div className="mt-3 border-t border-rule pt-2">
                                <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-ink-mute">
                                  Supporting sources
                                </span>
                                <ul className="mt-1 space-y-0.5">
                                  {option.supporting_refs.map((ref) => (
                                    <li
                                      key={ref.chunk_id}
                                      className="font-mono text-[10px] text-ink-soft"
                                    >
                                      <span className="text-ink-mute">↳</span> {ref.source_name}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Note input */}
                <div className="mt-5">
                  <label className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">
                    Scientist note (optional)
                  </label>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={3}
                    placeholder="Why this branch? Constraints, prior experience, lab context…"
                    className="mt-1.5 w-full border border-ink/30 bg-paper-deep/30 px-3 py-2 font-display text-[14px] leading-[1.5] placeholder:text-ink-mute/70 focus:border-ink focus:outline-none"
                  />
                </div>

                <button
                  disabled={!selected}
                  onClick={() => selected && onCommitDecision(step.step_id, selected, note)}
                  className="mt-4 inline-flex items-center gap-2 bg-ink px-5 py-3 font-mono text-[11px] uppercase tracking-[0.18em] text-paper transition-colors hover:bg-rust disabled:opacity-30"
                >
                  <Send className="h-3.5 w-3.5" strokeWidth={1.5} />
                  Commit decision · recompile workflow
                </button>
              </div>
            )}

            {/* Instructions for non-decision steps */}
            {step.instructions.length > 0 && (
              <div className="mt-7">
                <div className="flex items-center gap-2 border-b border-ink pb-2">
                  <BookOpen className="h-4 w-4" strokeWidth={1.5} />
                  <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink">
                    Operational instructions
                  </span>
                  <button
                    onClick={() => setIsEditing((value) => !value)}
                    className="ml-auto inline-flex items-center gap-1.5 border border-ink/30 px-2 py-1 font-mono text-[9px] uppercase tracking-[0.18em] text-ink-soft transition-colors hover:border-ink hover:text-ink"
                  >
                    <FileEdit className="h-3 w-3" strokeWidth={1.5} />
                    {isEditing ? "Cancel" : "Edit"}
                  </button>
                </div>
                {isEditing ? (
                  <div className="mt-3">
                    <textarea
                      value={editedInstructions}
                      onChange={(e) => setEditedInstructions(e.target.value)}
                      rows={8}
                      className="w-full border border-ink/30 bg-paper-deep/30 px-3 py-2 font-display text-[14px] leading-[1.5] text-ink-soft focus:border-ink focus:outline-none"
                    />
                    <label className="mt-3 block font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">
                      Scientist edit note
                    </label>
                    <textarea
                      value={editNote}
                      onChange={(e) => setEditNote(e.target.value)}
                      rows={2}
                      placeholder="Why are you modifying this SOP-derived step?"
                      className="mt-1.5 w-full border border-ink/30 bg-paper-deep/30 px-3 py-2 font-display text-[14px] leading-[1.5] placeholder:text-ink-mute/70 focus:border-ink focus:outline-none"
                    />
                    <button
                      onClick={() => {
                        const instructions = editedInstructions
                          .split("\n")
                          .map((line) => line.trim())
                          .filter(Boolean);
                        onModifyStep(step.step_id, instructions, editNote);
                        setIsEditing(false);
                      }}
                      className="mt-3 inline-flex items-center gap-2 bg-ink px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.18em] text-paper transition-colors hover:bg-rust"
                    >
                      <Send className="h-3.5 w-3.5" strokeWidth={1.5} />
                      Save modification
                    </button>
                  </div>
                ) : (
                  <ol className="mt-3 space-y-2">
                    {step.instructions.map((inst, i) => (
                      <li key={i} className="grid grid-cols-[28px_1fr] gap-2 font-display text-[14px] leading-[1.55]">
                        <span className="font-mono text-[11px] tabular-nums text-ink-mute">
                          {String(i + 1).padStart(2, "0")}.
                        </span>
                        <span className="text-ink-soft">{inst}</span>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            )}

            {/* Scientist feedback */}
            <div className="mt-7 border-t border-rule pt-5">
              <div className="flex items-center gap-2 border-b border-ink pb-2">
                <MessageSquare className="h-4 w-4" strokeWidth={1.5} />
                <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink">
                  Scientist review
                </span>
              </div>

              <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_90px]">
                <label>
                  <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">
                    Section
                  </span>
                  <select
                    value={feedbackSection}
                    onChange={(e) => setFeedbackSection(e.target.value)}
                    className="mt-1.5 w-full border border-ink/30 bg-paper-deep/30 px-3 py-2 font-mono text-[12px] uppercase tracking-[0.14em] text-ink focus:border-ink focus:outline-none"
                  >
                    <option value="protocol">Protocol</option>
                    <option value="materials">Materials</option>
                    <option value="budget">Budget</option>
                    <option value="timeline">Timeline</option>
                    <option value="validation">Validation</option>
                    <option value="risks">Risks</option>
                  </select>
                </label>
                <label>
                  <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">
                    Rating
                  </span>
                  <input
                    type="number"
                    min={1}
                    max={5}
                    value={feedbackRating}
                    onChange={(e) => setFeedbackRating(Number(e.target.value))}
                    className="mt-1.5 w-full border border-ink/30 bg-paper-deep/30 px-3 py-2 font-mono text-[12px] text-ink focus:border-ink focus:outline-none"
                  />
                </label>
              </div>
              <label className="mt-3 block">
                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">
                  Correction
                </span>
                <textarea
                  value={feedbackCorrection}
                  onChange={(e) => setFeedbackCorrection(e.target.value)}
                  rows={3}
                  placeholder="What should future workflows do differently?"
                  className="mt-1.5 w-full border border-ink/30 bg-paper-deep/30 px-3 py-2 font-display text-[14px] leading-[1.5] placeholder:text-ink-mute/70 focus:border-ink focus:outline-none"
                />
              </label>
              <label className="mt-3 block">
                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">
                  Reason
                </span>
                <textarea
                  value={feedbackReason}
                  onChange={(e) => setFeedbackReason(e.target.value)}
                  rows={2}
                  placeholder="Prior lab experience, cost, equipment constraint, reproducibility concern..."
                  className="mt-1.5 w-full border border-ink/30 bg-paper-deep/30 px-3 py-2 font-display text-[14px] leading-[1.5] placeholder:text-ink-mute/70 focus:border-ink focus:outline-none"
                />
              </label>
              <button
                disabled={!feedbackCorrection.trim()}
                onClick={() => {
                  onSubmitFeedback(
                    step.step_id,
                    feedbackSection,
                    feedbackRating,
                    feedbackCorrection,
                    feedbackReason
                  );
                  setFeedbackCorrection("");
                  setFeedbackReason("");
                }}
                className="mt-3 inline-flex items-center gap-2 border border-ink px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.18em] text-ink transition-colors hover:bg-ink hover:text-paper disabled:opacity-30"
              >
                <Send className="h-3.5 w-3.5" strokeWidth={1.5} />
                Save feedback to lab memory
              </button>
            </div>

            {/* Sources */}
            {step.source_refs.length > 0 && (
              <div className="mt-6 border-t border-rule pt-4">
                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">
                  Source references
                </span>
                <ul className="mt-2 space-y-1.5">
                  {step.source_refs.map((ref) => (
                    <li key={ref.chunk_id} className="grid grid-cols-[80px_1fr] gap-3 font-mono text-[11px]">
                      <span className="border border-ink/20 px-1.5 py-0.5 text-center text-[9px] uppercase tracking-[0.16em] text-ink-mute">
                        {ref.source_type.replace(/_/g, " ")}
                      </span>
                      <span className="font-display text-[14px] text-ink">
                        {ref.source_name}
                        {ref.section && (
                          <span className="font-mono text-[10px] text-ink-mute"> · {ref.section}</span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-ink-mute">
        {label}
      </div>
      <div className="font-mono text-[12px] tabular-nums text-ink">{value}</div>
    </div>
  );
}
