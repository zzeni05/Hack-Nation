import type { ExecutionRun, MemoryInsights, Workflow } from "@/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: {
        ...(init?.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
        ...(init?.headers ?? {}),
      },
    });
  } catch (error) {
    throw new Error(
      `Could not reach backend API at ${API_URL}${path}. The backend may have crashed, restarted, or been blocked by CORS. ${error instanceof Error ? error.message : ""}`.trim()
    );
  }

  if (!res.ok) {
    const body = await res.text();
    throw new Error(formatApiError(res.status, body));
  }
  return (await res.json()) as T;
}

function formatApiError(status: number, body: string): string {
  if (!body) return `Request failed: ${status}`;
  try {
    const parsed = JSON.parse(body) as {
      detail?: string | {
        message?: string;
        stage?: string;
        error_type?: string;
        error?: string;
      };
    };
    if (typeof parsed.detail === "string") return parsed.detail;
    if (parsed.detail && typeof parsed.detail === "object") {
      const parts = [
        parsed.detail.message ?? `Request failed: ${status}`,
        parsed.detail.stage ? `stage=${parsed.detail.stage}` : null,
        parsed.detail.error_type ? `type=${parsed.detail.error_type}` : null,
        parsed.detail.error ? `error=${parsed.detail.error}` : null,
      ].filter(Boolean);
      return parts.join(" | ");
    }
  } catch {
    // Fall through to raw body for non-JSON server errors.
  }
  return body || `Request failed: ${status}`;
}

/**
 * POST /api/workflows/compile
 * Takes a hypothesis, returns a fully compiled workflow.
 */
export async function compileWorkflow(
  hypothesis: string,
  options: RetrievalOptions = {}
): Promise<Workflow> {
  const result = await apiFetch<{ workflow: Workflow }>("/api/workflows/compile", {
    method: "POST",
    body: JSON.stringify({
      hypothesis,
      use_external_retrieval: options.useExternalRetrieval ?? true,
      tavily_max_results_per_query: options.maxResultsPerQuery ?? 2,
      tavily_max_sources: options.maxSources ?? 12,
      tavily_max_queries: options.maxQueries ?? 10,
      tavily_search_depth: options.searchDepth ?? "advanced",
      min_external_quality_score: options.minQualityScore ?? 0.25,
      selected_external_urls: options.selectedExternalUrls ?? null,
    }),
  });
  return result.workflow;
}

export type CompileProgressEvent =
  | {
      type: "progress";
      stage: string;
      message: string;
      timestamp?: string;
      current?: number;
      total?: number;
      source_name?: string;
      source_type?: string;
    }
  | { type: "heartbeat"; elapsed_ms: number }
  | { type: "complete"; elapsed_ms: number; workflow: Workflow }
  | { type: "error"; status_code?: number; detail: unknown };

export async function compileWorkflowStream(
  hypothesis: string,
  options: {
    useExternalRetrieval?: boolean;
    retrieval?: RetrievalOptions;
    onEvent?: (event: CompileProgressEvent) => void;
  } = {}
): Promise<Workflow> {
  const res = await fetch(`${API_URL}/api/workflows/compile-stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      hypothesis,
      use_external_retrieval: options.useExternalRetrieval ?? true,
      tavily_max_results_per_query: options.retrieval?.maxResultsPerQuery ?? 2,
      tavily_max_sources: options.retrieval?.maxSources ?? 12,
      tavily_max_queries: options.retrieval?.maxQueries ?? 10,
      tavily_search_depth: options.retrieval?.searchDepth ?? "advanced",
      min_external_quality_score: options.retrieval?.minQualityScore ?? 0.25,
      selected_external_urls: options.retrieval?.selectedExternalUrls ?? null,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(formatApiError(res.status, body));
  }
  if (!res.body) {
    throw new Error("Compile stream did not return a response body");
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    buffer += decoder.decode(value ?? new Uint8Array(), { stream: !done });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.trim()) continue;
      const event = JSON.parse(line) as CompileProgressEvent;
      options.onEvent?.(event);
      if (event.type === "complete") return event.workflow;
      if (event.type === "error") {
        throw new Error(formatStreamError(event.detail, event.status_code));
      }
    }

    if (done) break;
  }

  throw new Error("Compile stream ended before returning a workflow");
}

export interface RetrievalOptions {
  useExternalRetrieval?: boolean;
  maxResultsPerQuery?: number;
  maxSources?: number;
  maxQueries?: number;
  searchDepth?: "basic" | "advanced";
  minQualityScore?: number;
  selectedExternalUrls?: string[];
}

export interface RetrievalPreviewSource {
  title: string;
  url: string;
  source_name: string;
  source_type: string;
  domain: string;
  query: string;
  content_quality: string;
  quality_score: number;
  quality_reasons: string[];
  candidate_role: "protocol_candidate" | "evidence";
  content_preview: string;
}

export type RetrievalPreviewEvent =
  | {
      type: "progress";
      stage: string;
      message: string;
      current?: number;
      total?: number;
      query?: string;
      sources_found?: number;
    }
  | { type: "heartbeat"; elapsed_ms: number }
  | { type: "complete"; sources: RetrievalPreviewSource[]; rejected_sources: RetrievalPreviewSource[]; queries: string[] }
  | { type: "error"; detail: unknown };

export async function previewRetrieval(
  hypothesis: string,
  options: RetrievalOptions
): Promise<{ sources: RetrievalPreviewSource[]; rejected_sources: RetrievalPreviewSource[]; queries: string[] }> {
  return apiFetch("/api/retrieval/preview", {
    method: "POST",
    body: JSON.stringify({
      hypothesis,
      tavily_max_results_per_query: options.maxResultsPerQuery ?? 2,
      tavily_max_sources: options.maxSources ?? 12,
      tavily_max_queries: options.maxQueries ?? 10,
      tavily_search_depth: options.searchDepth ?? "advanced",
      min_external_quality_score: options.minQualityScore ?? 0.25,
    }),
  });
}

export async function previewRetrievalStream(
  hypothesis: string,
  options: RetrievalOptions,
  onEvent: (event: RetrievalPreviewEvent) => void
): Promise<{ sources: RetrievalPreviewSource[]; rejected_sources: RetrievalPreviewSource[]; queries: string[] }> {
  const res = await fetch(`${API_URL}/api/retrieval/preview-stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      hypothesis,
      tavily_max_results_per_query: options.maxResultsPerQuery ?? 2,
      tavily_max_sources: options.maxSources ?? 12,
      tavily_max_queries: options.maxQueries ?? 10,
      tavily_search_depth: options.searchDepth ?? "advanced",
      min_external_quality_score: options.minQualityScore ?? 0.25,
    }),
  });
  if (!res.ok) {
    throw new Error(formatApiError(res.status, await res.text()));
  }
  if (!res.body) throw new Error("Retrieval stream did not return a body");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { value, done } = await reader.read();
    buffer += decoder.decode(value ?? new Uint8Array(), { stream: !done });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.trim()) continue;
      const event = JSON.parse(line) as RetrievalPreviewEvent;
      onEvent(event);
      if (event.type === "complete") return event;
      if (event.type === "error") throw new Error(formatStreamError(event.detail));
    }
    if (done) break;
  }
  throw new Error("Retrieval stream ended before returning sources");
}

function formatStreamError(detail: unknown, status?: number): string {
  if (typeof detail === "string") return detail;
  if (detail && typeof detail === "object") {
    const value = detail as {
      message?: string;
      stage?: string;
      error_type?: string;
      error?: string;
    };
    return [
      value.message ?? `Request failed${status ? `: ${status}` : ""}`,
      value.stage ? `stage=${value.stage}` : null,
      value.error_type ? `type=${value.error_type}` : null,
      value.error ? `error=${value.error}` : null,
    ].filter(Boolean).join(" | ");
  }
  return `Request failed${status ? `: ${status}` : ""}`;
}

/**
 * POST /api/workflows/{id}/decisions
 * Commits a decision and triggers downstream recompilation.
 */
export async function commitDecision(
  workflowId: string,
  stepId: string,
  selectedOptionId: string,
  scientistNote?: string,
  customBranch?: {
    label: string;
    summary: string;
    tradeoffs?: string[];
    costImpact?: "Low" | "Medium" | "High";
    timelineImpact?: string;
    risks?: string[];
  }
): Promise<{ workflow: Workflow }> {
  return apiFetch<{ workflow: Workflow }>(`/api/workflows/${workflowId}/decisions`, {
    method: "POST",
    body: JSON.stringify({
      step_id: stepId,
      selected_option_id: selectedOptionId,
      scientist_note: scientistNote ?? null,
      custom_branch: customBranch
        ? {
            label: customBranch.label,
            summary: customBranch.summary,
            tradeoffs: customBranch.tradeoffs ?? [],
            cost_impact: customBranch.costImpact ?? "Medium",
            timeline_impact: customBranch.timelineImpact ?? null,
            risks: customBranch.risks ?? [],
          }
        : null,
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

export async function updateWorkflowPlan(
  workflowId: string,
  plan: Workflow["plan"],
  scientistNote?: string
): Promise<{ workflow: Workflow }> {
  return apiFetch<{ workflow: Workflow }>(`/api/workflows/${workflowId}/plan`, {
    method: "POST",
    body: JSON.stringify({
      plan,
      scientist_note: scientistNote ?? null,
    }),
  });
}

export async function updateWorkflowRunPreparation(
  workflowId: string,
  runPreparation: Workflow["run_preparation"],
  scientistNote?: string
): Promise<{ workflow: Workflow }> {
  return apiFetch<{ workflow: Workflow }>(`/api/workflows/${workflowId}/run-preparation`, {
    method: "POST",
    body: JSON.stringify({
      run_preparation: runPreparation,
      scientist_note: scientistNote ?? null,
    }),
  });
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

export async function createExecutionRun(workflowId: string): Promise<ExecutionRun> {
  const result = await apiFetch<{ run: ExecutionRun }>(`/api/workflows/${workflowId}/runs`, {
    method: "POST",
  });
  return result.run;
}

export async function startRunStep(runId: string, stepId: string): Promise<ExecutionRun> {
  const result = await apiFetch<{ run: ExecutionRun }>(`/api/runs/${runId}/steps/${stepId}/start`, {
    method: "POST",
    body: JSON.stringify({}),
  });
  return result.run;
}

export async function completeRunStep(
  runId: string,
  stepId: string,
  payload: { operatorNote?: string; deviationNote?: string; actuals?: Record<string, unknown> }
): Promise<ExecutionRun> {
  const result = await apiFetch<{ run: ExecutionRun }>(`/api/runs/${runId}/steps/${stepId}/complete`, {
    method: "POST",
    body: JSON.stringify({
      operator_note: payload.operatorNote ?? null,
      deviation_note: payload.deviationNote ?? null,
      actuals: payload.actuals ?? {},
    }),
  });
  return result.run;
}

export async function saveRunStepNotes(
  runId: string,
  stepId: string,
  payload: { operatorNote?: string; deviationNote?: string; actuals?: Record<string, unknown> }
): Promise<ExecutionRun> {
  const result = await apiFetch<{ run: ExecutionRun }>(`/api/runs/${runId}/steps/${stepId}/notes`, {
    method: "POST",
    body: JSON.stringify({
      operator_note: payload.operatorNote ?? null,
      deviation_note: payload.deviationNote ?? null,
      actuals: payload.actuals ?? {},
    }),
  });
  return result.run;
}

export async function completeExecutionRun(runId: string): Promise<ExecutionRun> {
  const result = await apiFetch<{ run: ExecutionRun }>(`/api/runs/${runId}/complete`, {
    method: "POST",
  });
  return result.run;
}

export async function addRunStepAttachment(
  runId: string,
  stepId: string,
  payload: { filename: string; note?: string; contentType?: string }
): Promise<ExecutionRun> {
  const result = await apiFetch<{ run: ExecutionRun }>(`/api/runs/${runId}/steps/${stepId}/attachments`, {
    method: "POST",
    body: JSON.stringify({
      filename: payload.filename,
      note: payload.note ?? null,
      content_type: payload.contentType ?? null,
    }),
  });
  return result.run;
}

export async function saveRunFindings(
  runId: string,
  payload: { conclusion?: string; findings?: string; nextSteps?: string }
): Promise<ExecutionRun> {
  const result = await apiFetch<{ run: ExecutionRun }>(`/api/runs/${runId}/findings`, {
    method: "POST",
    body: JSON.stringify({
      conclusion: payload.conclusion ?? "",
      findings: payload.findings ?? "",
      next_steps: payload.nextSteps ?? "",
    }),
  });
  return result.run;
}

export async function getMemoryInsights(): Promise<MemoryInsights> {
  return apiFetch<MemoryInsights>("/api/memory/insights");
}

export async function deleteAllMemory(): Promise<{ ok: boolean; cleared: Record<string, number>; insights: MemoryInsights }> {
  return apiFetch<{ ok: boolean; cleared: Record<string, number>; insights: MemoryInsights }>("/api/memory", {
    method: "DELETE",
  });
}
