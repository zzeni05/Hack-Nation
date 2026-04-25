"""Retrieved-protocol-based compiler.

This is the first real compiler slice: workflow shape is derived from parsed
SOP/runbook protocol candidates instead of a fixed universal skeleton.
"""

from __future__ import annotations

from copy import deepcopy
from datetime import UTC, datetime
from collections.abc import Awaitable, Callable
from typing import Any
from uuid import uuid4

from app.intent import extract_structured_intent, now_iso
from app.llm_protocol_parser import (
    content_hash,
    llm_available,
    map_protocol_to_intent_llm,
    parse_external_source_llm,
    parse_protocol_file_llm,
)
from app.protocol_cache import (
    external_cache_key,
    file_cache_key,
    get_cached_protocol,
    set_cached_protocol,
)
from app.protocol_parser import internal_protocol_files, protocol_search_text, token_overlap_score
from app.validator import validate_workflow


async def compile_from_protocol_candidates(
    hypothesis: str,
    context: dict[str, Any],
    *,
    prior_feedback: list[dict[str, Any]] | None = None,
    sop_recommendations: list[dict[str, Any]] | None = None,
    external_sources: list[Any] | None = None,
    progress: Callable[[dict[str, Any]], Awaitable[None]] | None = None,
) -> dict[str, Any]:
    intent = extract_structured_intent(hypothesis)
    parser_mode = "llm" if llm_available() else "heuristic_fallback_no_llm_key"
    protocols = []
    internal_files = list(internal_protocol_files())
    for index, (path, source_type) in enumerate(internal_files, start=1):
        await report_progress(
            progress,
            "parsing_internal_protocol",
            f"Parsing uploaded internal {source_type}: {path.name}",
            current=index,
            total=len(internal_files),
        )
        key = file_cache_key(path, parser_mode)
        cached = get_cached_protocol(key)
        if cached:
            normalize_protocol_origin(cached, "uploaded_internal")
            cached["cache_hit"] = True
            protocols.append(cached)
            continue
        protocol = await parse_protocol_file_llm(
            path,
            source_type,
            source_origin="uploaded_internal",
            is_user_provided=True,
        )
        protocol["cache_hit"] = False
        set_cached_protocol(key, protocol)
        protocols.append(protocol)

    external_protocols = []
    external_source_list = external_sources or []
    candidate_external_sources = [
        source for source in external_source_list
        if getattr(source, "candidate_role", "evidence") == "protocol_candidate"
    ]
    for index, source in enumerate(candidate_external_sources, start=1):
        await report_progress(
            progress,
            "parsing_external_protocol",
            f"Parsing external source: {getattr(source, 'title', 'external source')}",
            current=index,
            total=len(candidate_external_sources),
        )
        key = external_cache_key(
            getattr(source, "url", getattr(source, "title", "external")),
            parser_mode,
            content_hash(getattr(source, "content", "")),
        )
        cached = get_cached_protocol(key)
        if cached:
            normalize_protocol_origin(cached, "external_tavily")
            cached["cache_hit"] = True
            external_protocols.append(cached)
            continue
        protocol = await parse_external_source_llm(source, intent.get("experiment_type", "unknown"))
        protocol["cache_hit"] = False
        set_cached_protocol(key, protocol)
        external_protocols.append(protocol)

    protocols.extend(external_protocols)
    await report_progress(
        progress,
        "scoring_protocol_candidates",
        f"Scoring {len(protocols)} protocol candidates against the hypothesis",
        current=0,
        total=len(protocols),
    )
    scored = await score_protocols(protocols, intent, hypothesis, prior_feedback or [], progress=progress)
    base = scored[0]["protocol"] if scored and scored[0]["fit_score"] >= 0.6 else None
    timestamp = now_iso()

    workflow = {
        "workflow_id": f"wf_{uuid4().hex[:10]}",
        "hypothesis": hypothesis,
        "structured_intent": intent,
        "created_at": timestamp,
        "updated_at": timestamp,
        "trace": build_source_trace(context, timestamp),
        "memory_used": summarize_feedback(prior_feedback or []),
        "sop_recommendations": sop_recommendations or [],
        "protocol_basis": build_protocol_basis(scored),
        "qc": build_qc_from_sources(external_sources or []),
        "steps": [],
        "plan": empty_plan(),
        "open_decision_count": 0,
    }

    if base:
        await report_progress(
            progress,
            "assembling_workflow_steps",
            f"Assembling workflow from base protocol: {base['source_name']}",
        )
        assembled_steps = assemble_steps_from_base_protocol(base, intent, scored[0].get("mapping"))
        await report_progress(
            progress,
            "generating_decision_nodes",
            "Converting protocol gaps and ambiguous adaptations into decision nodes",
        )
        workflow["steps"] = inject_gap_and_decision_steps(assembled_steps, scored[0], scored[1:], intent)
        workflow["sop_match"] = build_protocol_sop_match(scored[0])
    else:
        best_reason = (
            f"Best candidate was {scored[0]['protocol']['source_name']} at {round(scored[0]['fit_score'] * 100)}% readiness, below the 60% threshold for executable workflow assembly."
            if scored else
            "No uploaded internal SOP/runbook or external protocol source could be parsed into protocol candidates."
        )
        workflow["sop_match"] = {
            "best_match_name": "No protocol candidate found",
            "match_confidence": 0.0,
            "reason": best_reason,
            "exact_reuse_candidates": [],
            "adaptation_candidates": [],
            "missing_context": ["Upload SOPs/runbooks or enable external retrieval with protocol-like sources."],
        }

    workflow["open_decision_count"] = len(
        [step for step in workflow["steps"] if step["status"] == "needs_user_choice"]
    )
    await report_progress(progress, "drafting_plan_sections", "Deriving materials, budget, timeline, validation, and risk sections")
    workflow["plan"] = derive_plan_from_workflow(workflow)
    await report_progress(progress, "validating_workflow", "Validating provenance and missing-context flags")
    workflow["validation_report"] = validate_workflow(workflow)
    workflow["trace"].insert(
        2,
        {
            "event_id": f"trace_{uuid4().hex[:8]}",
            "event_type": "protocol_candidates_parsed",
            "summary": (
                f"Parsed {len(protocols)} protocol candidates "
                f"({len(external_protocols)} external protocol-like candidates; {len(external_source_list)} external sources total) using {parser_mode} mode and selected the best base protocol."
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


def normalize_protocol_origin(protocol: dict[str, Any], default_origin: str) -> None:
    protocol.setdefault("source_origin", default_origin)
    protocol.setdefault("is_user_provided", default_origin == "uploaded_internal")
    for step in protocol.get("steps", []):
        for ref in step.get("source_refs", []):
            ref.setdefault("source_origin", protocol["source_origin"])
            ref.setdefault("is_user_provided", protocol["is_user_provided"])


async def report_progress(
    progress: Callable[[dict[str, Any]], Awaitable[None]] | None,
    stage: str,
    message: str,
    **data: Any,
) -> None:
    if progress is None:
        return
    await progress(
        {
            "stage": stage,
            "message": message,
            "timestamp": datetime.now(UTC).isoformat(),
            **data,
        }
    )


def build_source_trace(context: dict[str, Any], timestamp: str) -> list[dict[str, Any]]:
    stats = context.get("stats", {})
    return [
        {
            "event_id": f"trace_{uuid4().hex[:8]}",
            "event_type": "internal_sources_retrieved",
            "summary": (
                f"Retrieved {len(context.get('internal', []))} internal chunks from "
                f"{stats.get('sources', 0)} indexed knowledge sources."
            ),
            "timestamp": timestamp,
        },
        {
            "event_id": f"trace_{uuid4().hex[:8]}",
            "event_type": "sop_match_scored",
            "summary": "Scored parsed protocol candidates against the structured hypothesis.",
            "timestamp": timestamp,
        },
    ]


def build_qc_from_sources(external_sources: list[Any]) -> dict[str, Any]:
    if not external_sources:
        return {
            "signal": "not_found",
            "summary": "No live external references were retrieved. Add TAVILY_API_KEY to run external protocol and literature discovery.",
            "references": [],
        }
    refs = []
    for source in external_sources[:3]:
        refs.append(
            {
                "title": getattr(source, "title", "External source"),
                "authors": getattr(source, "source_name", "Retrieved source"),
                "venue": getattr(source, "domain", "external"),
                "year": datetime.now(UTC).year,
                "url": getattr(source, "url", ""),
                "relevance": f"Retrieved by query: {getattr(source, 'query', '')}",
            }
        )
    return {
        "signal": "similar_work_exists",
        "summary": f"Retrieved {len(external_sources)} live external sources for literature/protocol QC.",
        "references": refs,
    }


def empty_plan() -> dict[str, list[Any]]:
    return {
        "materials": [],
        "budget": [],
        "timeline": [],
        "validation": [],
        "risks": [],
    }


def derive_plan_from_workflow(workflow: dict[str, Any]) -> dict[str, Any]:
    materials_by_name: dict[str, dict[str, Any]] = {}
    risks: list[dict[str, Any]] = []
    validation: list[dict[str, Any]] = []

    for step in workflow["steps"]:
        text = " ".join(step.get("instructions", []))
        for material in step.get("materials", []) or []:
            materials_by_name.setdefault(
                material,
                {
                    "name": material,
                    "purpose": f"Used in {step['title']}",
                    "supplier": "Needs source-backed supplier",
                    "catalog": "Needs catalog/source",
                    "quantity": "Needs run-specific quantity",
                    "unit_cost": 0,
                    "total": 0,
                    "confidence": "low",
                    "gap": {
                        "gap_type": "material_enrichment_needed",
                        "reason": "Material was extracted from a source-backed step, but supplier, catalog, quantity, or price was not found in retrieved sources.",
                        "resolution_options": [
                            "Upload an internal materials list or ordering SOP",
                            "Retrieve supplier documentation for this reagent",
                            "Enter quantity and supplier during workflow setup",
                        ],
                    },
                    "source_ref": (step.get("source_refs") or [None])[0],
                },
            )
        for source_ref in step.get("source_refs", []):
            if step.get("classification") in {"external_literature_supported", "adapted_from_sop"} and source_ref.get("source_type") == "supplier_doc":
                materials_by_name.setdefault(
                    source_ref.get("source_name", "Supplier documented material"),
                    {
                        "name": source_ref.get("source_name", "Supplier documented material"),
                        "purpose": f"Referenced by {step['title']}",
                        "supplier": source_ref.get("source_name", "Needs supplier"),
                        "catalog": "Needs catalog/source",
                        "quantity": "Needs run-specific quantity",
                        "unit_cost": 0,
                        "total": 0,
                        "confidence": "low",
                        "gap": {
                            "gap_type": "supplier_catalog_needed",
                            "reason": "Supplier source was retrieved, but catalog/quantity/price were not extracted from the available content.",
                            "resolution_options": [
                                "Open the supplier source and confirm catalog item",
                                "Upload a lab purchasing list",
                                "Enter catalog details during setup",
                            ],
                        },
                        "source_ref": source_ref,
                    },
                )
        if step.get("classification") == "facility_constraint":
            risks.append(
                {
                    "category": "operational",
                    "risk": f"Facility constraint affects: {step['title']}",
                    "mitigation": "Reserve equipment and document deviations in execution trace.",
                    "severity": "medium",
                }
            )
        if step.get("operation") == "viability_assay" or "viability" in text.lower():
            validation.append(
                {
                    "endpoint": step["title"],
                    "type": "primary",
                    "assay": step["title"],
                    "controls": workflow["structured_intent"].get("controls", []),
                    "threshold": workflow["structured_intent"].get("success_threshold", "not specified"),
                    "source_ref": (step.get("source_refs") or [None])[0],
                }
            )
        if step.get("classification") == "missing_context":
            risks.append(
                {
                    "category": "scientific",
                    "risk": f"Missing context: {step['title']}",
                    "mitigation": "Scientist must provide the missing method or retrieve an additional protocol source.",
                    "severity": "high",
                }
            )

    materials = list(materials_by_name.values())
    if not materials:
        materials.append(
            {
                "name": "Materials list unresolved",
                "purpose": "Required before execution",
                "supplier": "Needs source-backed supplier",
                "catalog": "Needs catalog/source",
                "quantity": "Needs run-specific quantity",
                "unit_cost": 0,
                "total": 0,
                "confidence": "low",
                "gap": {
                    "gap_type": "materials_missing",
                    "reason": "No materials were extracted from the selected source-backed protocol steps.",
                    "resolution_options": [
                        "Upload an internal SOP with materials/reagents section",
                        "Include supplier docs in retrieval review",
                        "Enter required materials before starting the run",
                    ],
                },
                "source_ref": None,
            }
        )
    budget = [
        {
            "item": item["name"],
            "category": "Reagents",
            "quantity": item.get("quantity", "not_found"),
            "total": item.get("total", 0),
            "basis": "Price not found in retrieved sources; explicit cost gap remains.",
            "confidence": item.get("confidence", "low"),
            "gap": item.get("gap"),
        }
        for item in materials
    ]

    timeline = derive_timeline(workflow)
    return {
        "materials": materials,
        "budget": budget,
        "timeline": timeline,
        "validation": validation,
        "risks": risks,
    }


def derive_timeline(workflow: dict[str, Any]) -> list[dict[str, Any]]:
    step_count = len(workflow["steps"])
    source_refs = [
        ref
        for step in workflow["steps"]
        for ref in step.get("source_refs", [])
    ]
    return [
        {
            "phase": "Protocol setup and procurement",
            "duration": "Needs source-backed estimate",
            "gap": duration_gap("No retrieved source specified procurement or setup duration."),
            "start_week": 1,
            "end_week": 1,
            "dependencies": [],
            "critical_path": True,
            "notes": "Timeline duration was not source-backed in retrieved protocols.",
        },
        {
            "phase": "Execute protocol-derived workflow",
            "duration": "Needs source-backed estimate",
            "gap": duration_gap("Retrieved protocol steps did not specify total hands-on or elapsed execution time."),
            "start_week": 2,
            "end_week": 2,
            "dependencies": ["Protocol setup and procurement"],
            "critical_path": True,
            "notes": f"Covers {step_count} assembled workflow steps from {len(source_refs)} source references; duration needs source-backed estimate.",
        },
        {
            "phase": "Validation and analysis",
            "duration": "Needs source-backed estimate",
            "gap": duration_gap("Validation duration requires assay-specific source timing or scientist input."),
            "start_week": 3,
            "end_week": 3,
            "dependencies": ["Execute protocol-derived workflow"],
            "critical_path": True,
            "notes": "Validation duration requires assay-specific retrieved source or scientist input.",
        },
    ]


def duration_gap(reason: str) -> dict[str, Any]:
    return {
        "gap_type": "missing_duration",
        "reason": reason,
        "resolution_options": [
            "Upload an internal runbook with expected timing",
            "Retrieve assay/equipment protocol timing",
            "Scientist enters an estimate during workflow setup",
        ],
    }


async def score_protocols(
    protocols: list[dict[str, Any]],
    intent: dict[str, Any],
    hypothesis: str,
    prior_feedback: list[dict[str, Any]],
    progress: Callable[[dict[str, Any]], Awaitable[None]] | None = None,
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
    for index, protocol in enumerate(protocols, start=1):
        await report_progress(
            progress,
            "scoring_protocol_candidate",
            f"Scoring candidate {index}/{len(protocols)}: {protocol['source_name']}",
            current=index,
            total=len(protocols),
            source_name=protocol["source_name"],
            source_type=protocol["source_type"],
        )
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
        adjusted_score, confidence_breakdown = operational_confidence(
            min(score, 1.0),
            protocol,
            covered,
            missing,
            intent,
        )
        scored.append(
            {
                "protocol": protocol,
                "fit_score": adjusted_score,
                "semantic_fit_score": min(score, 1.0),
                "confidence_breakdown": confidence_breakdown,
                "fit_reason": llm_mapping.get("fit_reason") if llm_mapping else build_fit_reason(protocol, covered, missing),
                "covered_intent": covered,
                "missing_intent": missing,
                "mapping": llm_mapping,
            }
        )
    scored.sort(key=lambda item: item["fit_score"], reverse=True)
    return scored


def operational_confidence(
    semantic_score: float,
    protocol: dict[str, Any],
    covered: list[str],
    missing: list[str],
    intent: dict[str, Any],
) -> tuple[float, dict[str, Any]]:
    raw = protocol.get("raw_text", "").lower()
    source_origin = protocol.get("source_origin", "unknown")
    source_type = protocol.get("source_type", "unknown")

    source_trust = {
        "uploaded_internal": 0.10,
        "external_tavily": 0.07,
        "seeded_demo": 0.04,
    }.get(source_origin, 0.03)
    intent_coverage = min(len(set(covered)) / 5, 1.0) * 0.25
    step_reuse = min(len(protocol.get("steps", [])) / 10, 1.0) * 0.15
    base_semantic = min(semantic_score, 1.0) * 0.35
    validation_support = 0.05 if "viability" in raw or "assay" in raw else 0.0
    plan_completeness = 0.03 if any(step.get("materials") for step in protocol.get("steps", [])) else 0.0
    if any(step.get("parameters") for step in protocol.get("steps", [])):
        plan_completeness += 0.03
    if any("min" in step.get("text", "").lower() or "hour" in step.get("text", "").lower() for step in protocol.get("steps", [])):
        plan_completeness += 0.04

    score = base_semantic + intent_coverage + step_reuse + source_trust + validation_support + plan_completeness
    penalties = []

    intervention = intent.get("intervention", "").lower()
    if intervention and "trehalose" in intervention and "trehalose" not in raw:
        score = min(score, 0.75)
        penalties.append("Intervention-specific trehalose handling is not directly supported by this base protocol.")
    if "post-thaw viability" in intent.get("outcome", "").lower() and validation_support == 0:
        score = min(score, 0.80)
        penalties.append("Validation assay support is incomplete.")
    if source_origin == "seeded_demo":
        score = min(score, 0.85)
        penalties.append("Base protocol is bundled demo context, not a user-uploaded internal SOP.")
    if missing:
        score = min(score, 0.90)
        penalties.append(f"{len(missing)} hypothesis requirements remain missing or need adaptation.")

    breakdown = {
        "semantic_fit": round(base_semantic, 3),
        "intent_coverage": round(intent_coverage, 3),
        "step_reuse": round(step_reuse, 3),
        "source_trust": round(source_trust, 3),
        "plan_completeness": round(plan_completeness, 3),
        "validation_support": round(validation_support, 3),
        "penalties": penalties,
        "source_origin": source_origin,
        "source_type": source_type,
        "score_meaning": "Operational readiness, not just semantic similarity.",
    }
    return max(0.0, min(score, 1.0)), breakdown


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
        "semantic_fit_score": round(base.get("semantic_fit_score", base["fit_score"]), 2),
        "basis_label": protocol_basis_label(base["protocol"]),
        "source_origin": base["protocol"].get("source_origin", "unknown"),
        "source_type": base["protocol"].get("source_type", "unknown"),
        "confidence_breakdown": base.get("confidence_breakdown", {}),
        "candidate_count": len(scored),
        "imported_steps": len(base["protocol"]["steps"]),
        "adapted_steps": len(base["missing_intent"]),
        "gap_filled_steps": len(base["missing_intent"]),
        "parser_mode": base["protocol"].get("parser_mode", "unknown"),
        "cache_hit": bool(base["protocol"].get("cache_hit")),
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
        "basis_label": protocol_basis_label(protocol),
        "source_origin": protocol.get("source_origin", "unknown"),
        "source_type": protocol.get("source_type", "unknown"),
        "match_confidence": round(best["fit_score"], 2),
        "semantic_fit_score": round(best.get("semantic_fit_score", best["fit_score"]), 2),
        "confidence_breakdown": best.get("confidence_breakdown", {}),
        "reason": best["fit_reason"],
        "exact_reuse_candidates": exact[:5],
        "adaptation_candidates": adapted[:5] + best["missing_intent"],
        "missing_context": best["missing_intent"],
    }


def protocol_basis_label(protocol: dict[str, Any]) -> str:
    origin = protocol.get("source_origin")
    source_type = protocol.get("source_type")
    if origin == "uploaded_internal":
        return "Best matched internal SOP"
    if origin == "seeded_demo":
        return "Demo protocol basis"
    if origin == "external_tavily":
        if source_type == "supplier_doc":
            return "Best supplier protocol basis"
        return "Best external protocol basis"
    return "Operational protocol basis"


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
                "status": "blocked" if classification == "missing_context" else "ready",
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


def inject_gap_and_decision_steps(
    base_steps: list[dict[str, Any]],
    best: dict[str, Any],
    alternatives: list[dict[str, Any]],
    intent: dict[str, Any],
) -> list[dict[str, Any]]:
    steps = deepcopy(base_steps)
    next_order = len(steps) + 1

    for gap in best.get("missing_intent", []):
        options = options_from_alternatives(gap, alternatives)
        if options:
            steps.append(
                {
                    "step_id": f"decision_{next_order:03d}",
                    "order": next_order,
                    "title": f"Resolve: {gap}",
                    "classification": "decision_required",
                    "status": "needs_user_choice",
                    "source_refs": [],
                    "rationale": "Generated from an explicit gap in the selected base protocol and supported alternative protocol candidates.",
                    "instructions": [],
                    "depends_on": [steps[-1]["step_id"]] if steps else [],
                    "reason": f"The selected base protocol does not cover {gap}. Choose a source-supported branch.",
                    "selected_option_id": None,
                    "scientist_note": None,
                    "options": options,
                }
            )
        else:
            steps.append(
                {
                    "step_id": f"missing_{next_order:03d}",
                    "order": next_order,
                    "title": f"Missing context: {gap}",
                    "classification": "missing_context",
                    "status": "blocked",
                    "source_refs": [],
                    "rationale": "No retrieved protocol source supports this requirement yet.",
                    "instructions": [
                        f"Retrieve or upload a protocol/source that specifies: {gap}."
                    ],
                    "depends_on": [steps[-1]["step_id"]] if steps else [],
                    "needed_evidence": [gap],
                }
            )
        next_order += 1

    for idx, step in enumerate(steps, start=1):
        step["order"] = idx
    return steps


def options_from_alternatives(gap: str, alternatives: list[dict[str, Any]]) -> list[dict[str, Any]]:
    gap_terms = {term for term in gap.lower().replace("-", " ").split() if len(term) > 4}
    options = []
    for alt in alternatives:
        protocol = alt["protocol"]
        for step in protocol.get("steps", []):
            haystack = " ".join([step.get("title", ""), step.get("operation", ""), step.get("text", "")]).lower()
            if gap_terms and not any(term in haystack for term in gap_terms):
                continue
            refs = step.get("source_refs", [])
            options.append(
                {
                    "option_id": f"option_{len(options) + 1:03d}",
                    "label": step.get("title", "Source-supported option")[:90],
                    "summary": step.get("text", "")[:240],
                    "tradeoffs": ["Source-supported alternative; scientist must verify fit to local lab context."],
                    "cost_impact": "Medium",
                    "timeline_impact": "not_found",
                    "risks": ["Applicability to this lab context must be confirmed."],
                    "supporting_refs": refs,
                    "recommended": len(options) == 0,
                }
            )
            if len(options) >= 4:
                return options
    return options


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


def commit_decision_source_grounded(
    workflow: dict[str, Any],
    step_id: str,
    selected_option_id: str,
    scientist_note: str | None,
) -> dict[str, Any]:
    updated = deepcopy(workflow)
    selected_option = None
    for step in updated.get("steps", []):
        if step.get("step_id") != step_id:
            continue
        for option in step.get("options", []):
            if option.get("option_id") == selected_option_id:
                selected_option = option
                break
        step["selected_option_id"] = selected_option_id
        step["scientist_note"] = scientist_note
        step["status"] = "complete"
        break

    if selected_option:
        insert_selected_option_step(updated, step_id, selected_option)

    updated["open_decision_count"] = len(
        [step for step in updated.get("steps", []) if step.get("status") == "needs_user_choice"]
    )
    updated["updated_at"] = now_iso()
    updated["plan"] = derive_plan_from_workflow(updated)
    updated["validation_report"] = validate_workflow(updated)
    updated["trace"].append(
        {
            "event_id": f"trace_{uuid4().hex[:8]}",
            "event_type": "decision_committed",
            "summary": f"Scientist selected source-supported branch: {selected_option.get('label') if selected_option else selected_option_id}.",
            "scientist_note": scientist_note,
            "affected_sections": ["protocol", "materials", "timeline", "validation", "risks"],
            "timestamp": updated["updated_at"],
        }
    )
    updated["trace"].append(
        {
            "event_id": f"trace_{uuid4().hex[:8]}",
            "event_type": "workflow_recompiled",
            "summary": "Workflow recompiled from selected source-supported decision option.",
            "affected_sections": ["protocol", "materials", "timeline", "validation", "risks"],
            "timestamp": updated["updated_at"],
        }
    )
    return updated


def insert_selected_option_step(workflow: dict[str, Any], decision_step_id: str, option: dict[str, Any]) -> None:
    steps = workflow.get("steps", [])
    insert_at = next(
        (idx + 1 for idx, step in enumerate(steps) if step.get("step_id") == decision_step_id),
        len(steps),
    )
    source_step = {
        "step_id": f"selected_{uuid4().hex[:8]}",
        "order": insert_at + 1,
        "title": option.get("label", "Selected source-supported branch"),
        "classification": "external_literature_supported",
        "status": "ready",
        "source_refs": option.get("supporting_refs", []),
        "rationale": "Inserted from scientist-selected decision branch supported by retrieved source references.",
        "instructions": [option.get("summary", "Follow the selected source-supported branch.")],
        "depends_on": [decision_step_id],
    }
    steps.insert(insert_at, source_step)
    for idx, step in enumerate(steps, start=1):
        step["order"] = idx
