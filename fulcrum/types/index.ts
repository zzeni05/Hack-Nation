// Core data model types — designed to mirror the backend schemas in the
// implementation plan and FastAPI response schemas.

export type StepClassification =
  | "exact_reuse"
  | "adapted_from_sop"
  | "external_literature_supported"
  | "decision_required"
  | "missing_context"
  | "facility_constraint"
  | "historically_modified"
  | "scientist_authored";

export type NoveltySignal = "not_found" | "similar_work_exists" | "exact_match_found";

export interface SourceRef {
  chunk_id: string;
  source_name: string;
  source_type:
    | "internal_sop"
    | "internal_runbook"
    | "equipment_manual"
    | "facility_constraint"
    | "prior_run"
    | "scientist_note"
    | "external_protocol"
    | "external_paper"
    | "supplier_doc";
  source_url?: string;
  source_origin?: "uploaded_internal" | "seeded_demo" | "external_tavily" | "prior_run" | "generated_gap";
  is_user_provided?: boolean;
  section?: string;
}

export interface StructuredIntent {
  hypothesis: string;
  experiment_type: string;
  model_system: string;
  intervention: string;
  comparator: string;
  outcome: string;
  success_threshold: string;
  mechanism: string;
  likely_assays: string[];
  controls: string[];
  keywords: string[];
}

export interface SopMatch {
  best_match_name: string;
  basis_label?: string;
  source_origin?: string;
  source_type?: string;
  match_confidence: number;
  semantic_fit_score?: number;
  confidence_breakdown?: {
    semantic_fit?: number;
    intent_coverage?: number;
    step_reuse?: number;
    source_trust?: number;
    plan_completeness?: number;
    validation_support?: number;
    penalties?: string[];
    source_origin?: string;
    source_type?: string;
    score_meaning?: string;
  };
  reason: string;
  exact_reuse_candidates: string[];
  adaptation_candidates: string[];
  missing_context: string[];
}

export interface LiteratureQC {
  signal: NoveltySignal;
  summary: string;
  stats?: {
    external_sources: number;
    protocol_candidates: number;
    evidence_sources: number;
    queries: number;
  };
  references: {
    title: string;
    authors: string;
    venue: string;
    year: number;
    url: string;
    relevance: string;
  }[];
}

export interface DecisionOption {
  option_id: string;
  label: string;
  summary: string;
  tradeoffs: string[];
  cost_impact: "Low" | "Medium" | "High";
  timeline_impact: string;
  risks: string[];
  supporting_refs: SourceRef[];
  recommended: boolean;
  custom?: boolean;
  scientist_note?: string | null;
}

export interface WorkflowStep {
  step_id: string;
  order: number;
  title: string;
  classification: StepClassification;
  status: "ready" | "needs_user_choice" | "blocked" | "complete";
  source_refs: SourceRef[];
  rationale: string;
  instructions: string[];
  depends_on: string[];
  // Optional — only present for decision_required steps
  reason?: string;
  options?: DecisionOption[];
  selected_option_id?: string | null;
  scientist_note?: string | null;
  protocol_step_id?: string;
  operation?: string;
  hypothesis_requirement?: string | null;
  needed_evidence?: string[];
  derivation?: {
    kind: string;
    basis: string;
    message: string;
    resolved_by?: string;
  };
  // Only present for historically_modified
  modification_signal?: string;
}

export interface MaterialItem {
  name: string;
  purpose: string;
  supplier: string;
  catalog: string;
  quantity: string;
  unit_cost: number;
  total: number;
  confidence: "high" | "medium" | "low";
  estimate_type?: string;
  category?: string;
  basis?: string;
  needs_user_confirmation?: boolean;
  confirmed?: boolean;
  catalog_url?: string | null;
  supplier_search_url?: string | null;
  quote_date?: string;
  price_source?: string;
  procurement_status?: string;
  procurement_notes?: string;
  gap?: PlanGap;
  source_ref?: SourceRef;
}

export interface BudgetLine {
  item: string;
  category: "Reagents" | "Consumables" | "Equipment" | "Personnel" | "Overhead";
  quantity: string;
  total: number;
  basis: string;
  confidence: "high" | "medium" | "low";
  estimate_type?: string;
  needs_user_confirmation?: boolean;
  confirmed?: boolean;
  quote_date?: string;
  price_source?: string;
  gap?: PlanGap;
}

export interface TimelinePhase {
  phase: string;
  duration: string;
  estimate_type?: string;
  basis?: string;
  needs_user_confirmation?: boolean;
  confirmed?: boolean;
  gap?: PlanGap;
  start_week: number;
  end_week: number;
  dependencies: string[];
  critical_path: boolean;
  notes?: string;
}

export interface PlanGap {
  gap_type: string;
  reason: string;
  resolution_options: string[];
}

export interface ValidationItem {
  endpoint: string;
  type: "primary" | "secondary";
  assay: string;
  controls: string[];
  threshold: string;
  source_ref?: SourceRef;
  needs_user_confirmation?: boolean;
  confirmed?: boolean;
}

export interface RiskItem {
  category: "operational" | "scientific" | "safety";
  risk: string;
  mitigation: string;
  severity: "low" | "medium" | "high";
  needs_user_confirmation?: boolean;
  confirmed?: boolean;
}

export type PrepStatus =
  | "not_started"
  | "in_progress"
  | "confirmed"
  | "not_required"
  | "blocked"
  | "needs_review";

export interface RunPreparationItem {
  id: string;
  label: string;
  category: "approval" | "material" | "finance" | "schedule" | "validation" | "risk";
  status: PrepStatus;
  rationale: string;
  owner?: string;
  note?: string;
  links?: { label: string; url: string }[];
  source_ref?: SourceRef;
}

export interface RunPreparation {
  readiness_status: "ready" | "ready_with_warnings" | "blocked";
  material_items: RunPreparationItem[];
  approval_items: RunPreparationItem[];
  finance_items: RunPreparationItem[];
  schedule_items: RunPreparationItem[];
  validation_items: RunPreparationItem[];
  risk_items: RunPreparationItem[];
  prepared_by?: string;
  preparation_note?: string;
  updated_at?: string;
}

export interface TraceEvent {
  event_id: string;
  event_type:
    | "workflow_compiled"
    | "internal_sources_retrieved"
    | "external_sources_retrieved"
    | "external_sources_embedded"
    | "memory_retrieved"
    | "protocol_candidates_parsed"
    | "sop_match_scored"
    | "decision_node_created"
    | "decision_committed"
    | "step_modified"
    | "note_added"
    | "feedback_submitted"
    | "workflow_recompiled"
    | "sop_improvement_recommended"
    | "run_created"
    | "run_step_active"
    | "run_step_completed"
    | "run_step_skipped"
    | "run_step_blocked"
    | "run_step_notes_updated"
    | "run_step_attachment_added"
    | "run_completed";
  summary: string;
  scientist_note?: string;
  affected_sections?: string[];
  timestamp: string;
}

export interface SopRecommendation {
  recommendation_id: string;
  sop_name: string;
  step_reference: string;
  signal: string;
  common_modification: string;
  recommendation: string;
  source_basis?: string;
  evidence_count?: number;
}

export interface Workflow {
  workflow_id: string;
  hypothesis: string;
  structured_intent: StructuredIntent;
  sop_match: SopMatch;
  qc: LiteratureQC;
  steps: WorkflowStep[];
  plan: {
    materials: MaterialItem[];
    budget: BudgetLine[];
    timeline: TimelinePhase[];
    validation: ValidationItem[];
    risks: RiskItem[];
  };
  run_preparation?: RunPreparation;
  trace: TraceEvent[];
  sop_recommendations: SopRecommendation[];
  memory_used?: string[];
  protocol_basis?: {
    base_protocol_name: string;
    base_protocol_score: number;
    semantic_fit_score?: number;
    basis_label?: string;
    source_origin?: string;
    source_type?: string;
    confidence_breakdown?: SopMatch["confidence_breakdown"];
    candidate_count: number;
    imported_steps: number;
    adapted_steps: number;
    gap_filled_steps: number;
    parser_mode?: string;
    cache_hit?: boolean;
  };
  validation_report?: {
    ok: boolean;
    issues: { severity: "error" | "warning"; step_id?: string | null; message: string }[];
  };
  open_decision_count: number;
  created_at: string;
  updated_at: string;
}

export interface ExecutionRunStep {
  step_id: string;
  order: number;
  title: string;
  classification: StepClassification;
  status: "not_started" | "active" | "completed" | "skipped" | "blocked";
  started_at?: string | null;
  completed_at?: string | null;
  operator_note: string;
  deviation_note: string;
  actuals: Record<string, unknown>;
  attachments: { attachment_id?: string; filename: string; name?: string; url?: string; note?: string; content_type?: string }[];
  source_refs: SourceRef[];
}

export interface ExecutionRun {
  run_id: string;
  workflow_id: string;
  status: "not_started" | "in_progress" | "paused" | "completed" | "abandoned";
  current_step_id?: string | null;
  created_at: string;
  started_at?: string | null;
  completed_at?: string | null;
  steps: ExecutionRunStep[];
  events: {
    event_id: string;
    event_type: string;
    summary: string;
    timestamp: string;
  }[];
  findings?: {
    conclusion: string;
    findings: string;
    next_steps: string;
    updated_at: string;
  };
}

export interface SampleHypothesis {
  id: string;
  domain: string;
  short: string;
  full: string;
  plain: string;
}

export interface MemoryInsights {
  workflows: {
    workflow_id: string;
    hypothesis: string;
    experiment_type: string;
    created_at?: string;
    updated_at?: string;
    protocol_basis: string;
    readiness?: number | null;
    open_decisions: number;
    run_count: number;
    latest_run_status?: string | null;
    memory_used_count: number;
  }[];
  runs: {
    run_id: string;
    workflow_id: string;
    status: string;
    created_at?: string;
    completed_at?: string | null;
    completed_steps: number;
    total_steps: number;
    deviation_count: number;
    attachment_count: number;
    conclusion: string;
    findings_preview: string;
  }[];
  feedback: {
    feedback_id: string;
    workflow_id: string;
    experiment_type: string;
    section: string;
    step_id?: string;
    correction: string;
    reason: string;
    created_at?: string;
  }[];
  vector_stats: Record<string, number>;
  learning_events: {
    event_type: string;
    label: string;
    description: string;
    workflow_id?: string;
    run_id?: string;
    timestamp?: string | null;
  }[];
  insights: {
    workflow_count: number;
    run_count: number;
    completed_run_count: number;
    feedback_count: number;
    custom_branch_count: number;
    manual_gap_resolution_count: number;
    run_prep_count: number;
    deviation_count: number;
    top_experiment_types: { label: string; count: number }[];
    top_feedback_sections: { label: string; count: number }[];
    memory_sources: { label: string; count: number }[];
  };
  improvement_opportunities: string[];
}
