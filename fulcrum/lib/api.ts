// Frontend API client. Currently returns local mock data — when the
// backend is ready, replace each function body with a fetch call to
// the matching endpoint. Signatures mirror the API design in §20 of
// the implementation plan exactly.

import type { Workflow } from "@/types";
import { HELA_TREHALOSE_WORKFLOW } from "./mock-workflow";

const SIMULATED_DELAY = 1800; // ms — simulates the LLM compile call

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * POST /api/workflows/compile
 * Takes a hypothesis, returns a fully compiled workflow.
 */
export async function compileWorkflow(
  hypothesis: string,
  options: { useExternalRetrieval?: boolean } = {}
): Promise<Workflow> {
  // TODO(backend): replace with:
  //   const res = await fetch("/api/workflows/compile", {
  //     method: "POST",
  //     headers: { "Content-Type": "application/json" },
  //     body: JSON.stringify({ hypothesis, use_external_retrieval: options.useExternalRetrieval }),
  //   });
  //   return (await res.json()).workflow;
  await wait(SIMULATED_DELAY);
  return {
    ...HELA_TREHALOSE_WORKFLOW,
    hypothesis,
    structured_intent: {
      ...HELA_TREHALOSE_WORKFLOW.structured_intent,
      hypothesis,
    },
  };
}

/**
 * POST /api/workflows/{id}/decisions
 * Commits a decision and triggers downstream recompilation.
 */
export async function commitDecision(
  workflowId: string,
  stepId: string,
  selectedOptionId: string,
  scientistNote?: string
): Promise<{ workflow: Workflow }> {
  // TODO(backend): real implementation
  await wait(700);
  const updated: Workflow = JSON.parse(
    JSON.stringify(HELA_TREHALOSE_WORKFLOW)
  );
  const step = updated.steps.find((s) => s.step_id === stepId);
  if (step) {
    step.selected_option_id = selectedOptionId;
    step.scientist_note = scientistNote ?? null;
    step.status = "complete";
  }
  updated.open_decision_count = updated.steps.filter(
    (s) => s.status === "needs_user_choice"
  ).length;
  updated.trace.push({
    event_id: `trace_${Date.now()}`,
    event_type: "decision_committed",
    summary: `Scientist committed decision for ${stepId}: ${selectedOptionId}`,
    scientist_note: scientistNote,
    affected_sections: ["protocol", "materials", "timeline", "validation"],
    timestamp: new Date().toISOString(),
  });
  updated.trace.push({
    event_id: `trace_${Date.now() + 1}`,
    event_type: "workflow_recompiled",
    summary: `Downstream sections recompiled. Protocol, materials, timeline, validation, and risks updated.`,
    timestamp: new Date().toISOString(),
  });
  return { workflow: updated };
}

/**
 * POST /api/workflows/{id}/feedback
 */
export async function submitFeedback(
  workflowId: string,
  stepId: string,
  section: string,
  rating: number,
  correction: string,
  reason: string
): Promise<{ ok: true }> {
  await wait(400);
  return { ok: true };
}
