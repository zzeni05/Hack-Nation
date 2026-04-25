"""Structured hypothesis intent extraction."""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any


def now_iso() -> str:
    return datetime.now(UTC).isoformat()


def extract_structured_intent(hypothesis: str) -> dict[str, Any]:
    lower = hypothesis.lower()
    model_system = first_match(hypothesis, ["HeLa cells", "HeLa", "C57BL/6 mice", "Sporomusa ovata", "whole blood"]) or "unspecified model system"
    experiment_type = infer_experiment_type(lower)
    outcome = infer_outcome(hypothesis)
    comparator = infer_comparator(hypothesis)
    intervention = infer_intervention(hypothesis)
    threshold = infer_threshold(hypothesis)

    return {
        "hypothesis": hypothesis,
        "experiment_type": experiment_type,
        "model_system": model_system,
        "intervention": intervention,
        "comparator": comparator,
        "outcome": outcome,
        "success_threshold": threshold,
        "mechanism": infer_mechanism(hypothesis),
        "likely_assays": infer_assays(lower),
        "controls": infer_controls(comparator),
        "keywords": [
            token.strip(".,;:()")
            for token in hypothesis.split()
            if len(token.strip(".,;:()")) > 3
        ][:16],
    }


def first_match(text: str, candidates: list[str]) -> str | None:
    lower = text.lower()
    for candidate in candidates:
        if candidate.lower() in lower:
            return candidate
    return None


def infer_experiment_type(lower: str) -> str:
    if any(term in lower for term in ["cryoprotect", "post-thaw", "freezing medium", "dmso"]):
        return "cell_cryopreservation"
    if any(term in lower for term in ["biosensor", "electrochemical", "whole blood"]):
        return "diagnostics"
    if any(term in lower for term in ["mice", "intestinal permeability", "fitc-dextran"]):
        return "animal_gut_permeability"
    if any(term in lower for term in ["bioelectrochemical", "co2", "acetate", "cathode"]):
        return "bioelectrochemical_carbon_fixation"
    return "general_experiment"


def infer_outcome(hypothesis: str) -> str:
    lower = hypothesis.lower()
    if "post-thaw viability" in lower:
        return "post-thaw viability"
    if "detect" in lower:
        return "detection performance"
    if "intestinal permeability" in lower:
        return "intestinal permeability"
    if "acetate" in lower:
        return "acetate production rate"
    return "primary measurable outcome"


def infer_comparator(hypothesis: str) -> str:
    lower = hypothesis.lower()
    if "compared to" in lower:
        return hypothesis[lower.index("compared to") :].split(",", 1)[0].strip()
    if "control" in lower:
        return "control condition"
    return "not specified"


def infer_intervention(hypothesis: str) -> str:
    lower = hypothesis.lower()
    if "trehalose" in lower:
        return "trehalose cryoprotectant intervention"
    if "lactobacillus" in lower:
        return "Lactobacillus supplementation"
    if "sporomusa" in lower:
        return "Sporomusa ovata introduction"
    if "biosensor" in lower:
        return "paper-based electrochemical biosensor"
    return "intervention described in hypothesis"


def infer_threshold(hypothesis: str) -> str:
    for marker in ["at least", "below", "within", "greater than", "less than"]:
        lower = hypothesis.lower()
        if marker in lower:
            return hypothesis[lower.index(marker) :].split(",", 1)[0].strip()
    return "not specified"


def infer_mechanism(hypothesis: str) -> str:
    lower = hypothesis.lower()
    if "due to" in lower:
        return hypothesis[lower.index("due to") + len("due to") :].strip().rstrip(".")
    return "not specified"


def infer_assays(lower: str) -> list[str]:
    assays = []
    if "celltiter" in lower:
        assays.append("CellTiter-Glo")
    if "trypan" in lower or "viability" in lower:
        assays.append("viability assay")
    if "fitc" in lower:
        assays.append("FITC-dextran assay")
    if "elisa" in lower:
        assays.append("ELISA")
    return assays or ["assay not specified"]


def infer_controls(comparator: str) -> list[str]:
    if comparator != "not specified":
        return [comparator]
    return ["control condition not specified"]

