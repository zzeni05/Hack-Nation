"""Operational plan compiler.

This module turns source-backed workflow steps into materials, budget, timeline,
validation, and risk sections. It does not pretend estimates are exact; every
inferred or estimated item carries a provenance mode and assumptions.
"""

from __future__ import annotations

import re
from typing import Any


MATERIAL_PATTERNS = [
    ("DMEM", r"\bDMEM\b"),
    ("Fetal bovine serum", r"\bFBS\b|fetal bovine serum"),
    ("Penicillin-streptomycin", r"penicillin[- ]streptomycin|pen[- ]strep"),
    ("PBS", r"\bPBS\b|phosphate buffered saline"),
    ("Trypsin-EDTA", r"trypsin[- ]EDTA|trypsin"),
    ("DMSO", r"\bDMSO\b|dimethyl sulfoxide"),
    ("Trehalose", r"\btrehalose\b"),
    ("Cryovials", r"cryovial|cryo vial"),
    ("CellTiter-Glo", r"celltiter[- ]glo|cell titer glo"),
    ("Trypan blue", r"trypan blue"),
    ("LIVE/DEAD viability kit", r"live/dead|live dead"),
    ("96-well plate", r"96[- ]well|microplate"),
    ("Centrifuge tubes", r"falcon tube|centrifuge tube|conical tube"),
    ("Pipette tips", r"pipette tip"),
    ("Complete medium", r"complete medium"),
]

EQUIPMENT_PATTERNS = [
    ("Biosafety cabinet", r"biosafety cabinet|BSC"),
    ("CO2 incubator", r"CO2 incubator|CO₂ incubator|37 ?°?C"),
    ("Centrifuge", r"centrifuge"),
    ("Controlled-rate freezer", r"controlled[- ]rate freezer|-1 ?°?C/min|-1C/min"),
    ("Liquid nitrogen storage", r"liquid nitrogen|LN2|LN₂"),
    ("Plate reader", r"plate reader|luminescence"),
]

MATERIAL_ESTIMATES = {
    "DMEM": (45, "500 mL bottle"),
    "Fetal bovine serum": (120, "50 mL aliquot"),
    "Penicillin-streptomycin": (25, "100x aliquot"),
    "PBS": (25, "500 mL bottle"),
    "Trypsin-EDTA": (35, "100 mL bottle"),
    "DMSO": (45, "100 mL bottle"),
    "Trehalose": (55, "25 g bottle"),
    "Cryovials": (35, "pack of 50"),
    "CellTiter-Glo": (420, "assay kit"),
    "Trypan blue": (20, "100 mL bottle"),
    "LIVE/DEAD viability kit": (380, "assay kit"),
    "96-well plate": (25, "pack or sleeve"),
    "Centrifuge tubes": (18, "pack"),
    "Pipette tips": (35, "box"),
    "Complete medium": (60, "prepared batch"),
}

DURATION_RE = re.compile(
    r"(\d+(?:\.\d+)?\s*(?:min|minutes|h|hr|hrs|hour|hours|day|days|week|weeks)|overnight)",
    flags=re.IGNORECASE,
)


def compile_plan(workflow: dict[str, Any]) -> dict[str, Any]:
    steps = workflow.get("steps", [])
    intent = workflow.get("structured_intent", {})
    materials = compile_materials(steps, intent)
    budget = compile_budget(materials)
    timeline = compile_timeline(steps, intent)
    validation = compile_validation(steps, intent)
    risks = compile_risks(steps)
    return {
        "materials": materials,
        "budget": budget,
        "timeline": timeline,
        "validation": validation,
        "risks": risks,
    }


def compile_materials(steps: list[dict[str, Any]], intent: dict[str, Any]) -> list[dict[str, Any]]:
    found: dict[str, dict[str, Any]] = {}
    combined_text = " ".join(step_text(step) for step in steps)

    for step in steps:
        source_ref = first_source_ref(step)
        for material in step.get("materials", []) or []:
            add_material(found, material, f"Explicitly extracted from {step['title']}", source_ref, "source_exact", "medium")
        for name, pattern in MATERIAL_PATTERNS:
            if re.search(pattern, step_text(step), flags=re.IGNORECASE):
                add_material(found, name, f"Inferred from step text in {step['title']}", source_ref, "source_inferred", "medium")
        for name, pattern in EQUIPMENT_PATTERNS:
            if re.search(pattern, step_text(step), flags=re.IGNORECASE):
                add_material(found, name, f"Equipment inferred from {step['title']}", source_ref, "source_inferred", "medium", category="Equipment")

    if "trehalose" in (intent.get("intervention", "") + " " + combined_text).lower():
        add_material(found, "Trehalose", "Required by intervention hypothesis", None, "hypothesis_inferred", "medium")
    if "dmso" in (intent.get("comparator", "") + " " + combined_text).lower():
        add_material(found, "DMSO", "Required by comparator/control", None, "hypothesis_inferred", "medium")
    if "viability" in (intent.get("outcome", "") + " " + combined_text).lower():
        add_material(found, "CellTiter-Glo", "Estimated likely viability readout reagent; confirm assay choice", None, "historical_or_assay_estimated", "low")
        add_material(found, "96-well plate", "Estimated consumable for plate-reader viability assay", None, "assay_estimated", "low")

    if not found:
        return [unresolved_material_gap()]
    return list(found.values())


def add_material(
    found: dict[str, dict[str, Any]],
    name: str,
    purpose: str,
    source_ref: dict[str, Any] | None,
    estimate_type: str,
    confidence: str,
    *,
    category: str = "Reagents",
) -> None:
    key = name.lower()
    unit_cost, quantity = MATERIAL_ESTIMATES.get(name, (0, "Needs run-specific quantity"))
    existing = found.get(key)
    if existing:
        if source_ref and not existing.get("source_ref"):
            existing["source_ref"] = source_ref
        existing["purpose"] = existing["purpose"] if purpose in existing["purpose"] else f"{existing['purpose']}; {purpose}"
        return
    gap = None
    if unit_cost == 0:
        gap = {
            "gap_type": "material_cost_unknown",
            "reason": "Material/equipment was inferred but no estimate table or source-backed cost was available.",
            "resolution_options": ["Upload ordering list", "Retrieve supplier source", "Enter local cost"],
        }
    found[key] = {
        "name": name,
        "purpose": purpose,
        "supplier": infer_supplier(name),
        "catalog": "Estimate - confirm catalog",
        "quantity": quantity,
        "unit_cost": unit_cost,
        "total": unit_cost,
        "confidence": confidence,
        "estimate_type": estimate_type,
        "category": category,
        "basis": estimate_basis(estimate_type),
        "needs_user_confirmation": estimate_type not in {"source_exact"},
        "gap": gap,
        "source_ref": source_ref,
    }


def compile_budget(materials: list[dict[str, Any]]) -> list[dict[str, Any]]:
    budget = []
    for item in materials:
        budget.append(
            {
                "item": item["name"],
                "category": item.get("category", "Reagents") if item.get("category") != "Equipment" else "Equipment",
                "quantity": item.get("quantity", "Needs run-specific quantity"),
                "total": item.get("total", 0),
                "basis": item.get("basis", "Estimate requires confirmation."),
                "confidence": item.get("confidence", "low"),
                "estimate_type": item.get("estimate_type", "unresolved_gap"),
                "needs_user_confirmation": item.get("needs_user_confirmation", True),
                "gap": item.get("gap"),
                "source_ref": item.get("source_ref"),
            }
        )
    return budget


def compile_timeline(steps: list[dict[str, Any]], intent: dict[str, Any]) -> list[dict[str, Any]]:
    setup_duration = "0.5-1 day"
    execute_durations = extract_durations(steps)
    execution_duration = summarize_execution_duration(execute_durations, steps)
    validation_duration = infer_validation_duration(steps, intent)
    return [
        timeline_phase(
            "Protocol setup and procurement",
            setup_duration,
            "operational_estimated",
            "Estimate based on setup/reagent preparation before execution; confirm with local procurement status.",
            1,
            1,
            [],
        ),
        timeline_phase(
            "Execute protocol-derived workflow",
            execution_duration,
            "source_inferred" if execute_durations else "operational_estimated",
            (
                f"Detected source durations: {', '.join(execute_durations[:6])}."
                if execute_durations
                else f"No explicit durations found; estimated from {len(steps)} executable steps."
            ),
            1,
            1,
            ["Protocol setup and procurement"],
        ),
        timeline_phase(
            "Validation and analysis",
            validation_duration,
            "assay_estimated",
            "Estimated from likely post-thaw viability assay and analysis workflow; confirm assay protocol.",
            1,
            1,
            ["Execute protocol-derived workflow"],
        ),
    ]


def timeline_phase(
    phase: str,
    duration: str,
    estimate_type: str,
    basis: str,
    start_week: int,
    end_week: int,
    dependencies: list[str],
) -> dict[str, Any]:
    return {
        "phase": phase,
        "duration": duration,
        "estimate_type": estimate_type,
        "basis": basis,
        "start_week": start_week,
        "end_week": end_week,
        "dependencies": dependencies,
        "critical_path": True,
        "notes": basis,
        "needs_user_confirmation": estimate_type != "source_exact",
    }


def compile_validation(steps: list[dict[str, Any]], intent: dict[str, Any]) -> list[dict[str, Any]]:
    validation = []
    for step in steps:
        text = step_text(step).lower()
        if step.get("operation") == "viability_assay" or "viability" in text or "celltiter" in text:
            validation.append(
                {
                    "endpoint": step["title"],
                    "type": "primary",
                    "assay": step["title"],
                    "controls": intent.get("controls", []),
                    "threshold": intent.get("success_threshold", "not specified"),
                    "estimate_type": "source_inferred",
                    "source_ref": first_source_ref(step),
                }
            )
    if not validation and "viability" in intent.get("outcome", "").lower():
        validation.append(
            {
                "endpoint": "Post-thaw viability",
                "type": "primary",
                "assay": "Likely CellTiter-Glo or trypan blue viability assay",
                "controls": intent.get("controls", []),
                "threshold": intent.get("success_threshold", "not specified"),
                "estimate_type": "assay_estimated",
                "source_ref": None,
            }
        )
    return validation


def compile_risks(steps: list[dict[str, Any]]) -> list[dict[str, Any]]:
    risks = []
    for step in steps:
        if step.get("classification") == "facility_constraint":
            risks.append(
                {
                    "category": "operational",
                    "risk": f"Facility constraint affects: {step['title']}",
                    "mitigation": "Reserve equipment and document deviations in execution trace.",
                    "severity": "medium",
                }
            )
        if step.get("classification") == "missing_context":
            risks.append(
                {
                    "category": "scientific",
                    "risk": f"Missing context: {step['title']}",
                    "mitigation": "Retrieve a better protocol source or enter scientist-confirmed method before execution.",
                    "severity": "high",
                }
            )
    return risks


def extract_durations(steps: list[dict[str, Any]]) -> list[str]:
    durations = []
    for step in steps:
        durations.extend(match.group(1) for match in DURATION_RE.finditer(step_text(step)))
    return list(dict.fromkeys(durations))


def summarize_execution_duration(durations: list[str], steps: list[dict[str, Any]]) -> str:
    if any("overnight" in duration.lower() for duration in durations):
        return "1-2 days"
    if any("day" in duration.lower() for duration in durations):
        return "1-3 days"
    if durations:
        return "Same day, with timed steps"
    if len(steps) >= 8:
        return "0.5-1 day"
    if steps:
        return "2-4 hours"
    return "Needs workflow candidate"


def infer_validation_duration(steps: list[dict[str, Any]], intent: dict[str, Any]) -> str:
    text = " ".join(step_text(step) for step in steps).lower()
    if "overnight" in text:
        return "1-2 days"
    if "celltiter" in text or "luminescence" in text:
        return "2-4 hours"
    if "trypan" in text:
        return "30-60 minutes"
    if "viability" in intent.get("outcome", "").lower():
        return "2-4 hours"
    return "Needs assay selection"


def step_text(step: dict[str, Any]) -> str:
    return " ".join([step.get("title", ""), step.get("rationale", ""), " ".join(step.get("instructions", []))])


def first_source_ref(step: dict[str, Any]) -> dict[str, Any] | None:
    refs = step.get("source_refs") or []
    return refs[0] if refs else None


def infer_supplier(name: str) -> str:
    lower = name.lower()
    if "celltiter" in lower:
        return "Promega"
    if "live/dead" in lower:
        return "Thermo Fisher"
    if any(term in lower for term in ["dmso", "trehalose", "trypan"]):
        return "Sigma-Aldrich or equivalent"
    if any(term in lower for term in ["dmem", "fetal", "pbs", "trypsin", "penicillin"]):
        return "Thermo Fisher or equivalent"
    return "Local supplier"


def estimate_basis(estimate_type: str) -> str:
    mapping = {
        "source_exact": "Explicitly present in retrieved source.",
        "source_inferred": "Inferred from source-backed step text; confirm exact quantity/catalog.",
        "hypothesis_inferred": "Required by hypothesis/comparator; confirm source-specific handling.",
        "historical_or_assay_estimated": "Estimated from likely assay choice and prior run memory; confirm before execution.",
        "assay_estimated": "Estimated from likely assay workflow; confirm before execution.",
    }
    return mapping.get(estimate_type, "Estimate requires confirmation.")


def unresolved_material_gap() -> dict[str, Any]:
    return {
        "name": "Materials list unresolved",
        "purpose": "Required before execution",
        "supplier": "Needs source-backed supplier",
        "catalog": "Needs catalog/source",
        "quantity": "Needs run-specific quantity",
        "unit_cost": 0,
        "total": 0,
        "confidence": "low",
        "estimate_type": "unresolved_gap",
        "category": "Reagents",
        "basis": "No materials were extracted or inferred from source-backed steps.",
        "needs_user_confirmation": True,
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
