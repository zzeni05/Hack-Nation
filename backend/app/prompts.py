"""LLM prompts for the source-grounded protocol compiler."""

PROTOCOL_STEP_EXTRACTION_SYSTEM = """You are a scientific protocol parser.
Extract executable protocol steps from SOP/runbook/protocol text.
Do not invent steps, parameters, reagents, equipment, or constraints.
Only use information present in the supplied text.
Return strict JSON with no markdown."""


PROTOCOL_STEP_EXTRACTION_USER = """Source metadata:
{metadata_json}

Section title:
{section_title}

Section text:
{section_text}

Return a JSON object:
{{
  "source_class": "step_source_capable" | "evidence_only" | "supplier_material_source" | "facility_constraint_source" | "historical_run_source",
  "steps": [
    {{
      "title": "short operational title",
      "operation": "snake_case operation label",
      "inputs": ["input materials/samples"],
      "outputs": ["output state"],
      "parameters": {{"name": "value"}},
      "materials": ["specific materials explicitly mentioned"],
      "equipment": ["specific equipment explicitly mentioned"],
      "constraints": ["must/do not/avoid/preferred constraints explicitly mentioned"],
      "safety_notes": ["explicit safety notes"],
      "success_checks": ["explicit checks or thresholds"],
      "text": "verbatim-or-near-verbatim supporting text from the section"
    }}
  ],
  "evidence_claims": [
    {{
      "claim": "non-executable evidence claim explicitly supported by text",
      "applies_to": ["context"]
    }}
  ]
}}

Rules:
- If text is procedural, classify as step_source_capable and extract ordered steps.
- If text only supports rationale but not executable procedure, classify as evidence_only.
- If it is mostly reagent/catalog/material handling, classify as supplier_material_source.
- If it constrains equipment/facility availability, classify as facility_constraint_source.
- Empty arrays are allowed.
- Do not add any unsupported detail."""


STEP_MAPPING_SYSTEM = """You are a lab operations compiler.
Map a scientific hypothesis onto extracted protocol steps.
Classify each protocol step as exact reuse, adapted, decision required, missing context, facility constraint, or historically modified.
Do not invent unsupported workflow steps.
Return strict JSON with no markdown."""


STEP_MAPPING_USER = """Structured hypothesis intent:
{intent_json}

Protocol candidate:
{protocol_json}

Prior scientist feedback:
{feedback_json}

Return a JSON object:
{{
  "fit_score": 0.0,
  "fit_reason": "why this protocol is or is not a good base",
  "covered_intent": ["requirements covered by this protocol"],
  "missing_intent": ["requirements not covered by this protocol"],
  "step_mappings": [
    {{
      "protocol_step_id": "id from protocol",
      "classification": "exact_reuse" | "adapted_from_sop" | "external_literature_supported" | "decision_required" | "missing_context" | "facility_constraint" | "historically_modified",
      "hypothesis_requirement": "requirement this step maps to",
      "reason": "short reason",
      "needed_evidence": ["missing evidence needed if adapted or decision-required"]
    }}
  ],
  "decision_gaps": [
    {{
      "title": "decision title",
      "reason": "why scientist input is required",
      "needed_evidence": ["what evidence would resolve it"]
    }}
  ]
}}

Rules:
- Prefer exact_reuse for internal SOP steps that apply unchanged.
- Use adapted_from_sop when the step is reusable but material/parameter/intervention changes.
- Use decision_required when multiple valid approaches could be selected or the protocol lacks a key method.
- Use facility_constraint for equipment/facility availability constraints.
- Use historically_modified when prior feedback or run history suggests repeated modifications.
- Missing intent should be explicit and actionable."""

