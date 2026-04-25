import type { Workflow } from "@/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      ...(init?.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...(init?.headers ?? {}),
    },
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(detail || `Request failed: ${res.status}`);
  }
  return (await res.json()) as T;
}

/**
 * POST /api/workflows/compile
 * Takes a hypothesis, returns a fully compiled workflow.
 */
export async function compileWorkflow(
  hypothesis: string,
  options: { useExternalRetrieval?: boolean } = {}
): Promise<Workflow> {
  const result = await apiFetch<{ workflow: Workflow }>("/api/workflows/compile", {
    method: "POST",
    body: JSON.stringify({
      hypothesis,
      use_external_retrieval: options.useExternalRetrieval ?? true,
    }),
  });
  return result.workflow;
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
  return apiFetch<{ workflow: Workflow }>(`/api/workflows/${workflowId}/decisions`, {
    method: "POST",
    body: JSON.stringify({
      step_id: stepId,
      selected_option_id: selectedOptionId,
      scientist_note: scientistNote ?? null,
    }),
  });
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
): Promise<{ ok: true; workflow: Workflow }> {
  return apiFetch<{ ok: true; workflow: Workflow }>(`/api/workflows/${workflowId}/feedback`, {
    method: "POST",
    body: JSON.stringify({
      step_id: stepId,
      section,
      rating,
      correction,
      reason,
    }),
  });
}

export async function modifyStep(
  workflowId: string,
  stepId: string,
  modifiedInstructions: string[],
  scientistNote?: string
): Promise<{ workflow: Workflow }> {
  return apiFetch<{ workflow: Workflow }>(`/api/workflows/${workflowId}/steps/${stepId}/modify`, {
    method: "POST",
    body: JSON.stringify({
      modified_instructions: modifiedInstructions,
      scientist_note: scientistNote ?? null,
    }),
  });
}

export async function ingestInternalKnowledge(): Promise<{
  documents_ingested: number;
  chunks_created: number;
  stats: { chunks: number; sources: number; internal_chunks: number; external_chunks: number };
}> {
  return apiFetch("/api/knowledge/ingest-internal", { method: "POST" });
}

export async function uploadKnowledgeFiles(files: File[]): Promise<{
  documents_ingested: number;
  chunks_created: number;
  stats: { chunks: number; sources: number; internal_chunks: number; external_chunks: number };
}> {
  const documents = await Promise.all(
    files.map(async (file) => ({
      filename: file.name,
      text: await file.text(),
    }))
  );

  return apiFetch("/api/knowledge/upload", {
    method: "POST",
    body: JSON.stringify({ documents }),
  });
}

export async function getKnowledgeChunk(chunkId: string): Promise<{
  chunk_id: string;
  text: string;
  metadata: Record<string, unknown>;
}> {
  return apiFetch(`/api/knowledge/chunks/${encodeURIComponent(chunkId)}`);
}
