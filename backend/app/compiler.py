"""Workflow compiler for the demo lab operations engine."""

from __future__ import annotations

from copy import deepcopy
from datetime import UTC, datetime
from typing import Any
from uuid import uuid4


def now_iso() -> str:
    return datetime.now(UTC).isoformat()


def extract_structured_intent(hypothesis: str) -> dict[str, Any]:
    lower = hypothesis.lower()
    if "hela" in lower and "trehalose" in lower:
        experiment_type = "cell_cryopreservation"
        model_system = "HeLa cells"
        intervention = "Trehalose-based cryoprotectant formulation"
        comparator = "Standard DMSO cryopreservation protocol"
        outcome = "Post-thaw viability"
        success_threshold = "At least 15 percentage point increase"
        mechanism = "Trehalose membrane stabilization at low temperatures"
        assays = ["CellTiter-Glo", "Trypan blue exclusion", "Resazurin viability assay"]
        controls = ["Standard DMSO control", "Untreated fresh cells", "Vehicle-only freezing medium"]
        keywords = ["HeLa", "trehalose", "cryopreservation", "DMSO", "post-thaw viability"]
    else:
        experiment_type = "general_experiment"
        model_system = first_match(hypothesis, ["HeLa", "C57BL/6", "Sporomusa ovata", "whole blood"]) or "unspecified model system"
        intervention = "Intervention extracted from hypothesis"
        comparator = "Comparator/control extracted from hypothesis"
        outcome = "Primary measurable outcome"
        success_threshold = "Threshold specified in hypothesis or missing context"
        mechanism = "Proposed mechanism from hypothesis"
        assays = ["Primary assay from retrieved SOP", "Secondary validation assay"]
        controls = ["Positive control", "Negative control", "Comparator condition"]
        keywords = [word.strip(".,;:()") for word in hypothesis.split()[:12]]

    return {
        "hypothesis": hypothesis,
        "experiment_type": experiment_type,
        "model_system": model_system,
        "intervention": intervention,
        "comparator": comparator,
        "outcome": outcome,
        "success_threshold": success_threshold,
        "mechanism": mechanism,
        "likely_assays": assays,
        "controls": controls,
        "keywords": keywords,
    }


def first_match(text: str, candidates: list[str]) -> str | None:
    lower = text.lower()
    for candidate in candidates:
        if candidate.lower() in lower:
            return candidate
    return None


def compile_workflow(hypothesis: str, context: dict[str, Any]) -> dict[str, Any]:
    intent = extract_structured_intent(hypothesis)
    workflow = deepcopy(DEMO_WORKFLOW)
    timestamp = now_iso()
    workflow["workflow_id"] = f"wf_{uuid4().hex[:10]}"
    workflow["hypothesis"] = hypothesis
    workflow["structured_intent"] = intent
    workflow["created_at"] = timestamp
    workflow["updated_at"] = timestamp
    workflow["sop_match"] = build_sop_match(context)
    workflow["trace"] = build_trace(context, timestamp)

    if context["stats"]["chunks"] == 0:
        workflow["sop_match"]["match_confidence"] = 0.0
        workflow["sop_match"]["best_match_name"] = "No internal SOP indexed"
        workflow["sop_match"]["reason"] = (
            "No internal lab context has been ingested yet. Upload SOPs, runbooks, "
            "facility notes, or prior run records before compiling production workflows."
        )

    return workflow


def build_sop_match(context: dict[str, Any]) -> dict[str, Any]:
    internal = context["internal"]
    best_source = "Mammalian Cell Freezing SOP"
    operational_matches = [
        item
        for item in internal
        if item["metadata"].get("source_type") in {"internal_sop", "internal_runbook"}
    ]
    freezing_matches = [
        item
        for item in operational_matches
        if "freezing" in item["metadata"].get("source_name", "").lower()
        or "cryopreservation" in item["metadata"].get("source_name", "").lower()
    ]
    if freezing_matches:
        best_source = freezing_matches[0]["metadata"].get("source_name", best_source)
    elif operational_matches:
        best_source = operational_matches[0]["metadata"].get("source_name", best_source)
    elif internal:
        best_source = internal[0]["metadata"].get("source_name", best_source)

    return {
        "best_match_name": best_source,
        "match_confidence": 0.78 if internal else 0.0,
        "reason": (
            "The strongest internal match covers mammalian cell handling, freezing, "
            "controlled-rate cooling, and post-thaw viability measurement. Trehalose "
            "delivery is not fully specified, so those parts are compiled as decision nodes."
        ),
        "exact_reuse_candidates": [
            "Cell culture and expansion",
            "Cell harvest and counting",
            "Controlled-rate freezing",
            "Liquid nitrogen storage and rapid thaw",
        ],
        "adaptation_candidates": [
            "Cryoprotectant formulation",
            "Trehalose loading/equilibration",
            "Comparative viability validation",
        ],
        "missing_context": [
            "Trehalose intracellular loading verification",
            "Final statistical framework for threshold claim",
        ],
    }


def build_trace(context: dict[str, Any], timestamp: str) -> list[dict[str, Any]]:
    stats = context["stats"]
    return [
        {
            "event_id": f"trace_{uuid4().hex[:8]}",
            "event_type": "internal_sources_retrieved",
            "summary": (
                f"Retrieved {len(context['internal'])} internal chunks from "
                f"{stats['sources']} indexed lab knowledge sources."
            ),
            "timestamp": timestamp,
        },
        {
            "event_id": f"trace_{uuid4().hex[:8]}",
            "event_type": "sop_match_scored",
            "summary": "Scored closest SOP/runbook match and separated exact reuse from adaptation gaps.",
            "timestamp": timestamp,
        },
        {
            "event_id": f"trace_{uuid4().hex[:8]}",
            "event_type": "decision_node_created",
            "summary": "Created decision nodes for trehalose delivery method and statistical analysis plan.",
            "timestamp": timestamp,
        },
        {
            "event_id": f"trace_{uuid4().hex[:8]}",
            "event_type": "sop_improvement_recommended",
            "summary": "Detected repeated prior-run modification of viability assay step.",
            "affected_sections": ["validation", "sop_recommendations"],
            "timestamp": timestamp,
        },
        {
            "event_id": f"trace_{uuid4().hex[:8]}",
            "event_type": "workflow_compiled",
            "summary": "Compiled source-grounded executable workflow with exact reuse, adaptations, decisions, and historical SOP signal.",
            "timestamp": timestamp,
        },
    ]


def commit_decision(workflow: dict[str, Any], step_id: str, selected_option_id: str, scientist_note: str | None) -> dict[str, Any]:
    updated = deepcopy(workflow)
    selected_label = selected_option_id
    for step in updated["steps"]:
        if step["step_id"] == step_id:
            step["selected_option_id"] = selected_option_id
            step["scientist_note"] = scientist_note
            step["status"] = "complete"
            for option in step.get("options", []):
                if option["option_id"] == selected_option_id:
                    selected_label = option["label"]
            break

    if selected_option_id == "intracellular_loading":
        apply_intracellular_loading_updates(updated)
    elif selected_option_id == "ttest_onesided":
        updated["plan"]["timeline"][-1]["notes"] = "One-sided threshold test selected; no additional thaw batches required."
    elif selected_option_id == "tost_equivalence":
        updated["plan"]["timeline"][-1]["duration"] = "2 weeks"
        updated["plan"]["timeline"][-1]["end_week"] = 8
        updated["plan"]["budget"].append(
            {
                "item": "Additional replicate thaw batch",
                "category": "Consumables",
                "quantity": "n=10 design",
                "total": 620,
                "basis": "Branch-selected statistical framework",
                "confidence": "medium",
            }
        )

    updated["open_decision_count"] = len(
        [step for step in updated["steps"] if step["status"] == "needs_user_choice"]
    )
    updated["updated_at"] = now_iso()
    updated["trace"].append(
        {
            "event_id": f"trace_{uuid4().hex[:8]}",
            "event_type": "decision_committed",
            "summary": f"Scientist selected branch: {selected_label}.",
            "scientist_note": scientist_note,
            "affected_sections": ["protocol", "materials", "budget", "timeline", "validation", "risks"],
            "timestamp": updated["updated_at"],
        }
    )
    updated["trace"].append(
        {
            "event_id": f"trace_{uuid4().hex[:8]}",
            "event_type": "workflow_recompiled",
            "summary": "Downstream workflow sections recompiled while preserving prior source references and notes.",
            "affected_sections": ["protocol", "materials", "budget", "timeline", "validation", "risks"],
            "timestamp": updated["updated_at"],
        }
    )
    return updated


def apply_intracellular_loading_updates(workflow: dict[str, Any]) -> None:
    for step in workflow["steps"]:
        if step["step_id"] == "step_005":
            step["instructions"] = [
                "Pre-incubate HeLa aliquots in 0.2 M trehalose loading medium for 4 hours at 37°C.",
                "Rinse once with complete medium to reduce extracellular carryover.",
                "Resuspend in selected cryoprotectant formulation and equilibrate on ice for 15 min.",
                "Transfer to labeled cryovials; document loading branch and timing in trace.",
            ]
            step["rationale"] = "Recompiled after scientist selected intracellular trehalose loading."
    workflow["plan"]["materials"].append(
        {
            "name": "Osmolality check consumables",
            "purpose": "Verify loading medium remains in acceptable range",
            "supplier": "Internal core",
            "catalog": "not_found",
            "quantity": "12 measurements",
            "unit_cost": 8,
            "total": 96,
            "confidence": "medium",
        }
    )
    workflow["plan"]["risks"].append(
        {
            "category": "scientific",
            "risk": "Intracellular loading step can introduce osmotic stress before freezing",
            "mitigation": "Use 4h pilot loading window and verify pre-freeze viability remains above 90%.",
            "severity": "medium",
        }
    )


DEMO_WORKFLOW: dict[str, Any] = {
    "workflow_id": "wf_demo",
    "hypothesis": "",
    "created_at": "",
    "updated_at": "",
    "open_decision_count": 2,
    "structured_intent": {},
    "sop_match": {},
    "qc": {
        "signal": "similar_work_exists",
        "summary": "Trehalose cryoprotection has supporting mammalian-cell literature, but the exact HeLa threshold comparison is not found in the indexed references.",
        "references": [
            {
                "title": "Intracellular trehalose improves the survival of cryopreserved mammalian cells",
                "authors": "Eroglu A, Russo MJ, Bieganski R, et al.",
                "venue": "Nature Biotechnology",
                "year": 2000,
                "url": "https://www.nature.com/articles/nbt0200_163",
                "relevance": "Supports intracellular trehalose as a cryoprotectant strategy; not HeLa-specific.",
            },
            {
                "title": "Trehalose, a cryoprotectant agent for human cells: literature analysis",
                "authors": "Stewart S, He X.",
                "venue": "Cryobiology",
                "year": 2019,
                "url": "https://doi.org/10.1016/j.cryobiol.2019.05.004",
                "relevance": "Summarizes loading methods and tradeoffs across human cell systems.",
            },
            {
                "title": "CellTiter-Glo Luminescent Cell Viability Assay Protocol",
                "authors": "Promega",
                "venue": "Technical Bulletin",
                "year": 2024,
                "url": "https://www.promega.com/resources/protocols/technical-bulletins/0/celltiter-glo-luminescent-cell-viability-assay-protocol/",
                "relevance": "Supplier protocol supporting the plate-reader viability workflow.",
            },
        ],
    },
    "steps": [
        {
            "step_id": "step_001",
            "order": 1,
            "title": "Culture and expand HeLa cells to 80% confluence",
            "classification": "exact_reuse",
            "status": "ready",
            "source_refs": [{"chunk_id": "internal_hela_sop_001", "source_name": "HeLa Cell Culture SOP", "source_type": "internal_sop", "section": "Routine maintenance"}],
            "rationale": "Internal culture SOP directly applies to the model system.",
            "instructions": ["Maintain HeLa cells in complete DMEM at 37°C and 5% CO2.", "Passage at 70-80% confluence.", "Expand to enough vessels for all condition groups."],
            "depends_on": [],
        },
        {
            "step_id": "step_002",
            "order": 2,
            "title": "Harvest, count, and aliquot cells",
            "classification": "exact_reuse",
            "status": "ready",
            "source_refs": [{"chunk_id": "internal_freezing_sop_002", "source_name": "Mammalian Cell Freezing SOP", "source_type": "internal_sop", "section": "Harvest"}],
            "rationale": "Standard mammalian cell harvest workflow is reusable.",
            "instructions": ["Trypsinize cultures at target confluence.", "Pellet at 200 x g for 5 min.", "Verify pre-freeze viability exceeds 90%.", "Aliquot 1e6 cells per cryovial."],
            "depends_on": ["step_001"],
        },
        {
            "step_id": "step_003",
            "order": 3,
            "title": "Prepare cryoprotectant formulations",
            "classification": "adapted_from_sop",
            "status": "ready",
            "source_refs": [{"chunk_id": "internal_freezing_sop_003", "source_name": "Mammalian Cell Freezing SOP", "source_type": "internal_sop", "section": "Cryoprotectant prep"}, {"chunk_id": "external_eroglu_2000", "source_name": "Eroglu et al. 2000", "source_type": "external_paper"}],
            "rationale": "The DMSO control is SOP-backed; trehalose condition is adapted from external evidence.",
            "instructions": ["Prepare standard 10% DMSO control medium.", "Prepare sterile 0.2 M trehalose test medium.", "Keep formulations chilled and document osmolality where available."],
            "depends_on": ["step_002"],
        },
        {
            "step_id": "decision_001",
            "order": 4,
            "title": "Select trehalose delivery method",
            "classification": "decision_required",
            "status": "needs_user_choice",
            "source_refs": [],
            "rationale": "Internal SOP does not define trehalose delivery.",
            "instructions": [],
            "depends_on": ["step_003"],
            "reason": "Multiple viable approaches exist; selection affects materials, timeline, validation, and risk.",
            "selected_option_id": None,
            "scientist_note": None,
            "options": [
                {"option_id": "extracellular", "label": "Extracellular trehalose only", "summary": "Add trehalose to freezing medium without loading.", "tradeoffs": ["Simplest workflow", "Weakest mechanistic alignment"], "cost_impact": "Low", "timeline_impact": "+0 days", "risks": ["Limited intracellular uptake"], "supporting_refs": [{"chunk_id": "external_review", "source_name": "Trehalose cryoprotection review", "source_type": "external_paper"}], "recommended": False},
                {"option_id": "intracellular_loading", "label": "Pre-freeze intracellular loading", "summary": "Pre-incubate cells with trehalose before freezing.", "tradeoffs": ["Best mechanistic alignment", "Requires pilot optimization"], "cost_impact": "Medium", "timeline_impact": "+1 day", "risks": ["Osmotic stress", "Variable loading efficiency"], "supporting_refs": [{"chunk_id": "external_eroglu_2000", "source_name": "Eroglu et al. 2000", "source_type": "external_paper"}], "recommended": True},
                {"option_id": "combination", "label": "DMSO + trehalose combination", "summary": "Use reduced DMSO plus trehalose.", "tradeoffs": ["Operationally easy", "Does not isolate trehalose substitution"], "cost_impact": "Low", "timeline_impact": "+0 days", "risks": ["Attribution ambiguity"], "supporting_refs": [], "recommended": False},
            ],
        },
        {
            "step_id": "step_005",
            "order": 5,
            "title": "Load cells into cryoprotectant and equilibrate",
            "classification": "adapted_from_sop",
            "status": "ready",
            "source_refs": [{"chunk_id": "internal_freezing_sop_004", "source_name": "Mammalian Cell Freezing SOP", "source_type": "internal_sop", "section": "Equilibration"}],
            "rationale": "Equilibration depends on selected trehalose branch.",
            "instructions": ["Resuspend aliquots in assigned cryoprotectant.", "Equilibrate on ice for 10-15 min.", "Transfer to labeled cryovials."],
            "depends_on": ["decision_001"],
        },
        {
            "step_id": "step_006",
            "order": 6,
            "title": "Controlled-rate freeze and transfer to LN2",
            "classification": "facility_constraint",
            "status": "ready",
            "source_refs": [{"chunk_id": "internal_freezer_manual", "source_name": "Controlled-Rate Freezer Manual", "source_type": "equipment_manual"}, {"chunk_id": "internal_facility_constraints", "source_name": "Lab Facility Constraints", "source_type": "facility_constraint"}],
            "rationale": "Facility context constrains freezing profile and equipment availability.",
            "instructions": ["Reserve CryoMed unit on Bench 4.", "Run -1°C/min profile to -80°C.", "Transfer vials to LN2 vapor phase within 24h."],
            "depends_on": ["step_005"],
        },
        {
            "step_id": "step_007",
            "order": 7,
            "title": "Thaw and recover cells after storage interval",
            "classification": "exact_reuse",
            "status": "ready",
            "source_refs": [{"chunk_id": "internal_freezing_sop_005", "source_name": "Mammalian Cell Freezing SOP", "source_type": "internal_sop", "section": "Thaw"}],
            "rationale": "Internal thaw workflow directly applies.",
            "instructions": ["Store at least 7 days in LN2 vapor phase.", "Rapid thaw in 37°C bath.", "Dilute into pre-warmed complete medium.", "Pellet and resuspend for recovery."],
            "depends_on": ["step_006"],
        },
        {
            "step_id": "step_008",
            "order": 8,
            "title": "Post-thaw viability assessment",
            "classification": "historically_modified",
            "status": "ready",
            "source_refs": [{"chunk_id": "internal_viability_runbook", "source_name": "Viability Assay Runbook", "source_type": "internal_runbook"}, {"chunk_id": "external_promega_ctg", "source_name": "Promega CellTiter-Glo Technical Bulletin", "source_type": "supplier_doc"}],
            "rationale": "Prior run history shows scientists repeatedly modify the default manual counting step for comparative cryoprotection.",
            "instructions": ["Use CellTiter-Glo as primary 96-well plate readout at 0h, 24h, and 48h.", "Use trypan blue exclusion as secondary membrane integrity readout.", "Compare trehalose branch against DMSO control and fresh-cell baseline."],
            "depends_on": ["step_007"],
            "modification_signal": "87% of prior cryopreservation runs replaced manual trypan blue counting with 96-well plate reader assay.",
        },
        {
            "step_id": "decision_002",
            "order": 9,
            "title": "Select statistical analysis plan",
            "classification": "decision_required",
            "status": "needs_user_choice",
            "source_refs": [],
            "rationale": "The threshold claim can be tested with different statistical frameworks.",
            "instructions": [],
            "depends_on": ["step_008"],
            "reason": "Choice affects sample size, budget, and defensibility of the threshold claim.",
            "selected_option_id": None,
            "scientist_note": None,
            "options": [
                {"option_id": "ttest_onesided", "label": "One-sided t-test, n=6", "summary": "Simple threshold test against DMSO control.", "tradeoffs": ["Fast", "Assumes normality"], "cost_impact": "Low", "timeline_impact": "+0 days", "risks": ["Variance may be higher than expected"], "supporting_refs": [], "recommended": True},
                {"option_id": "tost_equivalence", "label": "TOST equivalence + threshold, n=10", "summary": "More rigorous design with larger replicate count.", "tradeoffs": ["More defensible", "Higher cost and longer schedule"], "cost_impact": "Medium", "timeline_impact": "+1 week", "risks": [], "supporting_refs": [], "recommended": False},
            ],
        },
    ],
    "plan": {
        "materials": [
            {"name": "D-(+)-Trehalose dihydrate", "purpose": "Test cryoprotectant", "supplier": "Sigma-Aldrich", "catalog": "T9531", "quantity": "100 g", "unit_cost": 184, "total": 184, "confidence": "high"},
            {"name": "DMSO, sterile-filtered", "purpose": "Control cryoprotectant", "supplier": "Sigma-Aldrich", "catalog": "D2650", "quantity": "100 mL", "unit_cost": 92, "total": 92, "confidence": "high"},
            {"name": "DMEM + FBS culture reagents", "purpose": "HeLa culture medium", "supplier": "Thermo Fisher", "catalog": "mixed", "quantity": "experiment set", "unit_cost": 372, "total": 372, "confidence": "medium"},
            {"name": "CellTiter-Glo viability assay", "purpose": "Primary readout", "supplier": "Promega", "catalog": "G7570", "quantity": "10 mL kit", "unit_cost": 412, "total": 412, "confidence": "high"},
            {"name": "Cryovials and 96-well plates", "purpose": "Storage and assay consumables", "supplier": "Corning", "catalog": "mixed", "quantity": "experiment set", "unit_cost": 423, "total": 423, "confidence": "medium"},
        ],
        "budget": [
            {"item": "Reagents and culture media", "category": "Reagents", "quantity": "1 set", "total": 648, "basis": "Supplier catalog estimates", "confidence": "high"},
            {"item": "Assay kit and consumables", "category": "Consumables", "quantity": "1 set", "total": 835, "basis": "Supplier catalog estimates", "confidence": "high"},
            {"item": "Liquid nitrogen and equipment usage", "category": "Equipment", "quantity": "1 run", "total": 530, "basis": "Internal facility rate", "confidence": "medium"},
            {"item": "Researcher time", "category": "Personnel", "quantity": "80 h", "total": 4800, "basis": "Loaded rate $60/h", "confidence": "medium"},
            {"item": "Indirect / overhead", "category": "Overhead", "quantity": "15%", "total": 1022, "basis": "Institutional estimate", "confidence": "medium"},
        ],
        "timeline": [
            {"phase": "Procurement and cell expansion", "duration": "2 weeks", "start_week": 1, "end_week": 2, "dependencies": [], "critical_path": True, "notes": "Order reagents and expand HeLa cultures."},
            {"phase": "Loading optimization", "duration": "1 week", "start_week": 3, "end_week": 3, "dependencies": ["Procurement and cell expansion"], "critical_path": False, "notes": "Required if intracellular loading branch is selected."},
            {"phase": "Freezing run and storage", "duration": "2 weeks", "start_week": 4, "end_week": 5, "dependencies": ["Loading optimization"], "critical_path": True},
            {"phase": "Thaw, viability assay, and analysis", "duration": "2 weeks", "start_week": 6, "end_week": 7, "dependencies": ["Freezing run and storage"], "critical_path": True},
        ],
        "validation": [
            {"endpoint": "Post-thaw viability at 24h", "type": "primary", "assay": "CellTiter-Glo luminescence", "controls": ["DMSO control", "Fresh-cell baseline", "Vehicle-only"], "threshold": "At least 15 percentage point increase vs DMSO"},
            {"endpoint": "Membrane integrity at thaw", "type": "secondary", "assay": "Trypan blue exclusion", "controls": ["DMSO control"], "threshold": "Directionally consistent improvement"},
        ],
        "risks": [
            {"category": "scientific", "risk": "Insufficient intracellular trehalose loading produces null result", "mitigation": "Run loading pilot and track pre-freeze viability.", "severity": "high"},
            {"category": "operational", "risk": "Controlled-rate freezer availability conflicts", "mitigation": "Reserve CryoMed unit before cell expansion.", "severity": "medium"},
        ],
    },
    "trace": [],
    "sop_recommendations": [
        {
            "recommendation_id": "sop_rec_001",
            "sop_name": "Viability Assay Runbook",
            "step_reference": "Step 3 · Comparative viability readout",
            "signal": "87% of prior cryopreservation runs modified this step.",
            "common_modification": "Manual trypan blue counting was replaced with CellTiter-Glo 96-well plate-reader workflow.",
            "recommendation": "Update the runbook so comparative cryoprotection studies default to plate-reader viability, with trypan blue as secondary confirmation.",
        }
    ],
}
