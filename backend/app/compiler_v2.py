"""Retrieved-protocol-based compiler.

This is the first real compiler slice: workflow shape is derived from parsed
SOP/runbook protocol candidates instead of a fixed universal skeleton.
"""

from __future__ import annotations

from copy import deepcopy
from typing import Any
from uuid import uuid4

from app.compiler import DEMO_WORKFLOW, build_trace, extract_structured_intent, now_iso
from app.llm_protocol_parser import map_protocol_to_intent_llm, parse_protocol_file_llm
from app.protocol_parser import internal_protocol_files, protocol_search_text, token_overlap_score


async def compile_from_protocol_candidates(
    hypothesis: str,
    context: dict[str, Any],
    *,
    prior_feedback: list[dict[str, Any]] | None = None,
    sop_recommendations: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    intent = extract_structured_intent(hypothesis)
    protocols = []
    for path, source_type in internal_protocol_files():
        protocols.append(await parse_protocol_file_llm(path, source_type))
    scored = await score_protocols(protocols, intent, hypothesis, prior_feedback or [])
    base = scored[0]["protocol"] if scored else None
    timestamp = now_iso()

    workflow = deepcopy(DEMO_WORKFLOW)
    workflow["workflow_id"] = f"wf_{uuid4().hex[:10]}"
    workflow["hypothesis"] = hypothesis
    workflow["structured_intent"] = intent
    workflow["created_at"] = timestamp
    workflow["updated_at"] = timestamp
    workflow["trace"] = build_trace(context, timestamp)
    workflow["memory_used"] = summarize_feedback(prior_feedback or [])
    workflow["sop_recommendations"] = sop_recommendations or workflow["sop_recommendations"]
    workflow["protocol_basis"] = build_protocol_basis(scored)

    if base:
        assembled_steps = assemble_steps_from_base_protocol(base, intent, scored[0].get("mapping"))
        workflow["steps"] = inject_gap_and_decision_steps(assembled_steps, workflow)
        workflow["sop_match"] = build_protocol_sop_match(scored[0])
    else:
        workflow["sop_match"] = {
            "best_match_name": "No protocol candidate found",
            "match_confidence": 0.0,
            "reason": "No internal SOP/runbook could be parsed into protocol candidates.",
            "exact_reuse_candidates": [],
            "adaptation_candidates": [],
            "missing_context": ["Upload SOPs or runbooks with procedural steps."],
        }

    workflow["open_decision_count"] = len(
        [step for step in workflow["steps"] if step["status"] == "needs_user_choice"]
    )
    workflow["trace"].insert(
        2,
        {
            "event_id": f"trace_{uuid4().hex[:8]}",
            "event_type": "protocol_candidates_parsed",
            "summary": (
                f"Parsed {len(protocols)} internal SOP/runbook protocol candidates "
                f"using {protocols[0].get('parser_mode', 'unknown') if protocols else 'none'} mode and selected the best base protocol."
            ),
            "affected_sections": ["workflow_steps", "sop_match"],
            "timestamp": timestamp,
        },
    )

    if prior_feedback:
        workflow["trace"].insert(
            3,
            {
                "event_id": f"trace_{uuid4().hex[:8]}",
                "event_type": "memory_retrieved",
                "summary": f"Retrieved {len(prior_feedback)} prior scientist corrections for this experiment type.",
                "affected_sections": ["protocol", "validation", "decision_nodes"],
                "timestamp": timestamp,
            },
        )

    return workflow


async def score_protocols(
    protocols: list[dict[str, Any]],
    intent: dict[str, Any],
    hypothesis: str,
    prior_feedback: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    query = " ".join(
        [
            hypothesis,
            intent.get("experiment_type", ""),
            intent.get("model_system", ""),
            intent.get("intervention", ""),
            intent.get("outcome", ""),
            " ".join(intent.get("keywords", [])),
        ]
    )
    scored = []
    for protocol in protocols:
        llm_mapping = await map_protocol_to_intent_llm(intent, protocol, prior_feedback)
        text = protocol_search_text(protocol)
        score = token_overlap_score(query, text)
        if protocol["source_type"] in {"internal_sop", "internal_runbook"}:
            score += 0.12
        if protocol["domain"] == intent.get("experiment_type"):
            score += 0.25
        if "freezing" in protocol["source_name"].lower() and "cryopreservation" in intent.get("experiment_type", ""):
            score += 0.25
        if "viability" in protocol["source_name"].lower() and "viability" in intent.get("outcome", "").lower():
            score += 0.12

        covered = infer_covered_intent(protocol, intent)
        missing = infer_missing_intent(protocol, intent, covered)
        if llm_mapping:
            score = max(score, float(llm_mapping.get("fit_score", 0.0)))
            covered = llm_mapping.get("covered_intent") or covered
            missing = llm_mapping.get("missing_intent") or missing
        scored.append(
            {
                "protocol": protocol,
                "fit_score": min(score, 1.0),
                "fit_reason": llm_mapping.get("fit_reason") if llm_mapping else build_fit_reason(protocol, covered, missing),
                "covered_intent": covered,
                "missing_intent": missing,
                "mapping": llm_mapping,
            }
        )
    scored.sort(key=lambda item: item["fit_score"], reverse=True)
    return scored


def infer_covered_intent(protocol: dict[str, Any], intent: dict[str, Any]) -> list[str]:
    operations = {step["operation"] for step in protocol["steps"]}
    covered = []
    if "cell_culture" in operations or "cell_harvest_counting" in operations:
        covered.append("model handling")
    if "controlled_rate_freezing" in operations or "cryoprotectant_preparation" in operations:
        covered.append("freezing workflow")
    if "storage_thaw" in operations:
        covered.append("storage and thaw")
    if "viability_assay" in operations:
        covered.append("post-thaw viability")
    if intent.get("model_system", "").lower().split()[0] in protocol.get("raw_text", "").lower():
        covered.append("model-specific context")
    return covered


def infer_missing_intent(protocol: dict[str, Any], intent: dict[str, Any], covered: list[str]) -> list[str]:
    missing = []
    raw = protocol.get("raw_text", "").lower()
    if "trehalose" in intent.get("intervention", "").lower() and "trehalose" not in raw:
        missing.append("intervention-specific trehalose delivery")
    if "post-thaw viability" in intent.get("outcome", "").lower() and "post-thaw viability" not in " ".join(covered):
        missing.append("post-thaw viability readout")
    if intent.get("success_threshold") and "statistical" not in raw and "p<" not in raw:
        missing.append("statistical test for success threshold")
    return missing


def build_fit_reason(protocol: dict[str, Any], covered: list[str], missing: list[str]) -> str:
    covered_text = ", ".join(covered) if covered else "limited hypothesis coverage"
    if missing:
        return f"{protocol['source_name']} covers {covered_text}, but is missing {', '.join(missing)}."
    return f"{protocol['source_name']} strongly covers {covered_text}."


def build_protocol_basis(scored: list[dict[str, Any]]) -> dict[str, Any]:
    if not scored:
        return {
            "base_protocol_name": "None",
            "base_protocol_score": 0,
            "candidate_count": 0,
            "imported_steps": 0,
            "adapted_steps": 0,
            "gap_filled_steps": 0,
        }
    base = scored[0]
    return {
        "base_protocol_name": base["protocol"]["source_name"],
        "base_protocol_score": round(base["fit_score"], 2),
        "candidate_count": len(scored),
        "imported_steps": len(base["protocol"]["steps"]),
        "adapted_steps": len(base["missing_intent"]),
        "gap_filled_steps": 2,
    }


def build_protocol_sop_match(best: dict[str, Any]) -> dict[str, Any]:
    protocol = best["protocol"]
    exact = [
        step["title"]
        for step in protocol["steps"]
        if classify_protocol_step(step) in {"exact_reuse", "facility_constraint", "historically_modified"}
    ]
    adapted = [
        step["title"]
        for step in protocol["steps"]
        if classify_protocol_step(step) == "adapted_from_sop"
    ]
    return {
        "best_match_name": protocol["source_name"],
        "match_confidence": round(best["fit_score"], 2),
        "reason": best["fit_reason"],
        "exact_reuse_candidates": exact[:5],
        "adaptation_candidates": adapted[:5] + best["missing_intent"],
        "missing_context": best["missing_intent"],
    }


def assemble_steps_from_base_protocol(
    protocol: dict[str, Any],
    intent: dict[str, Any],
    mapping: dict[str, Any] | None = None,
) -> list[dict[str, Any]]:
    mappings_by_step = {
        item.get("protocol_step_id"): item
        for item in (mapping or {}).get("step_mappings", [])
    }
    steps = []
    for idx, protocol_step in enumerate(protocol["steps"], start=1):
        step_mapping = mappings_by_step.get(protocol_step["step_id"])
        classification = (
            step_mapping.get("classification")
            if step_mapping and step_mapping.get("classification")
            else classify_protocol_step(protocol_step)
        )
        steps.append(
            {
                "step_id": f"step_{idx:03d}",
                "order": idx,
                "title": protocol_step["title"],
                "classification": classification,
                "status": "ready",
                "source_refs": protocol_step["source_refs"],
                "rationale": (
                    step_mapping.get("reason")
                    if step_mapping and step_mapping.get("reason")
                    else build_step_rationale(protocol_step, classification)
                ),
                "instructions": protocol_text_to_instructions(protocol_step["text"]),
                "depends_on": [f"step_{idx - 1:03d}"] if idx > 1 else [],
                "protocol_step_id": protocol_step["step_id"],
                "operation": protocol_step["operation"],
                "hypothesis_requirement": step_mapping.get("hypothesis_requirement") if step_mapping else None,
                "needed_evidence": step_mapping.get("needed_evidence", []) if step_mapping else [],
            }
        )
    return steps


def classify_protocol_step(step: dict[str, Any]) -> str:
    operation = step["operation"]
    if operation == "facility_constraint":
        return "facility_constraint"
    if operation == "viability_assay":
        return "historically_modified"
    if operation in {"cryoprotectant_preparation", "equilibration_vialing"}:
        return "adapted_from_sop"
    return "exact_reuse"


def build_step_rationale(step: dict[str, Any], classification: str) -> str:
    if classification == "exact_reuse":
        return f"Imported directly from {step['source_refs'][0]['source_name']} because the operation is reusable for this hypothesis."
    if classification == "adapted_from_sop":
        return f"Imported from {step['source_refs'][0]['source_name']} but marked for adaptation because the hypothesis changes intervention or parameters."
    if classification == "facility_constraint":
        return "Imported from facility/equipment context because this constrains how the experiment can be run."
    if classification == "historically_modified":
        return "Imported from runbook context and flagged because prior runs or feedback commonly modify this step."
    return "Compiled from retrieved protocol evidence."


def protocol_text_to_instructions(text: str) -> list[str]:
    sentences = [s.strip() for s in text.replace("\n", " ").split(".") if s.strip()]
    if len(sentences) <= 1:
        return [text.strip()]
    return [f"{sentence}." for sentence in sentences[:5]]


def inject_gap_and_decision_steps(base_steps: list[dict[str, Any]], template_workflow: dict[str, Any]) -> list[dict[str, Any]]:
    steps = deepcopy(base_steps)
    next_order = len(steps) + 1

    decision_001 = deepcopy(next(step for step in template_workflow["steps"] if step["step_id"] == "decision_001"))
    decision_001["order"] = next_order
    decision_001["depends_on"] = [steps[-1]["step_id"]] if steps else []
    steps.append(decision_001)
    next_order += 1

    viability_template = deepcopy(next(step for step in template_workflow["steps"] if step["step_id"] == "step_008"))
    if not any(step.get("operation") == "viability_assay" for step in steps):
        viability_template["order"] = next_order
        viability_template["depends_on"] = [steps[-1]["step_id"]]
        steps.append(viability_template)
        next_order += 1

    decision_002 = deepcopy(next(step for step in template_workflow["steps"] if step["step_id"] == "decision_002"))
    decision_002["order"] = next_order
    decision_002["depends_on"] = [steps[-1]["step_id"]] if steps else []
    steps.append(decision_002)

    for idx, step in enumerate(steps, start=1):
        step["order"] = idx
    return steps


def summarize_feedback(feedback: list[dict[str, Any]]) -> list[str]:
    summaries = []
    for entry in feedback:
        correction = entry.get("correction", "").strip()
        reason = entry.get("reason", "").strip()
        if correction and reason:
            summaries.append(f"{correction} Reason: {reason}")
        elif correction:
            summaries.append(correction)
    return summaries
