"""Generate SOP improvement recommendations from prior runs and feedback."""

from __future__ import annotations

import json
from collections import defaultdict
from pathlib import Path
from typing import Any

from app.config import settings
from app.store import list_feedback


def generate_sop_recommendations() -> list[dict[str, Any]]:
    grouped: dict[tuple[str, str], list[dict[str, Any]]] = defaultdict(list)

    for run in load_prior_runs():
        sop = run.get("sop") or "Unknown SOP"
        step = run.get("modified_step") or run.get("step_id") or "Unknown step"
        grouped[(sop, step)].append(run)

    for feedback in list_feedback():
        sop = feedback.get("section") or "Scientist feedback"
        step = feedback.get("step_id") or "Unspecified step"
        grouped[(sop, step)].append(
            {
                "sop": sop,
                "modified_step": step,
                "modification": feedback.get("correction", ""),
                "reason": feedback.get("reason", ""),
            }
        )

    recommendations: list[dict[str, Any]] = []
    for (sop, step), entries in grouped.items():
        if len(entries) < 2:
            continue
        modifications = [entry.get("modification") or entry.get("correction") or "" for entry in entries]
        reasons = [entry.get("reason") or "" for entry in entries if entry.get("reason")]
        common_modification = most_descriptive(modifications)
        reason = most_descriptive(reasons)
        recommendations.append(
            {
                "recommendation_id": f"sop_rec_{len(recommendations) + 1:03d}",
                "sop_name": sop,
                "step_reference": step,
                "signal": f"{len(entries)} prior runs or scientist corrections modified this SOP step.",
                "common_modification": common_modification or "Repeated scientist edits detected for this step.",
                "recommendation": build_recommendation(sop, step, common_modification, reason),
            }
        )

    return recommendations


def load_prior_runs() -> list[dict[str, Any]]:
    root = Path(settings.knowledge_path)
    if not root.exists():
        return []
    runs: list[dict[str, Any]] = []
    for path in root.glob("prior_run*.json"):
        try:
            runs.append(json.loads(path.read_text()))
        except json.JSONDecodeError:
            continue
    return runs


def most_descriptive(values: list[str]) -> str:
    cleaned = [value.strip() for value in values if value and value.strip()]
    if not cleaned:
        return ""
    return max(cleaned, key=len)


def build_recommendation(sop: str, step: str, modification: str, reason: str) -> str:
    if modification:
        recommendation = f"Review {sop} {step} and consider incorporating the repeated modification: {modification}."
    else:
        recommendation = f"Review {sop} {step}; repeated run history suggests the current instruction is unstable."
    if reason:
        recommendation += f" Common rationale: {reason}."
    return recommendation

