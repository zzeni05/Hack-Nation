// Core data model types — designed to mirror the backend schemas in the
// implementation plan so wiring up the API later is a matter of swapping
// the mock data layer for real fetch calls.

export type StepClassification =
  | "exact_reuse"
  | "adapted_from_sop"
  | "external_literature_supported"
  | "decision_required"
  | "missing_context"
  | "facility_constraint"
  | "historically_modified";

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
  match_confidence: number;
  reason: string;
  exact_reuse_candidates: string[];
  adaptation_candidates: string[];
  missing_context: string[];
}

export interface LiteratureQC {
  signal: NoveltySignal;
  summary: string;
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
  source_ref?: SourceRef;
}

export interface BudgetLine {
  item: string;
  category: "Reagents" | "Consumables" | "Equipment" | "Personnel" | "Overhead";
  quantity: string;
  total: number;
  basis: string;
  confidence: "high" | "medium" | "low";
}

export interface TimelinePhase {
  phase: string;
  duration: string;
  start_week: number;
  end_week: number;
  dependencies: string[];
  critical_path: boolean;
  notes?: string;
}

export interface ValidationItem {
  endpoint: string;
  type: "primary" | "secondary";
  assay: string;
  controls: string[];
  threshold: string;
  source_ref?: SourceRef;
}

export interface RiskItem {
  category: "operational" | "scientific" | "safety";
  risk: string;
  mitigation: string;
  severity: "low" | "medium" | "high";
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
    | "sop_improvement_recommended";
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
  trace: TraceEvent[];
  sop_recommendations: SopRecommendation[];
  memory_used?: string[];
  protocol_basis?: {
    base_protocol_name: string;
    base_protocol_score: number;
    candidate_count: number;
    imported_steps: number;
    adapted_steps: number;
    gap_filled_steps: number;
  };
  open_decision_count: number;
  created_at: string;
  updated_at: string;
}

export interface SampleHypothesis {
  id: string;
  domain: string;
  short: string;
  full: string;
  plain: string;
}
