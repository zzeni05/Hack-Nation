"""Generate SOP improvement recommendations from prior runs and feedback."""

from __future__ import annotations

from collections import defaultdict
from typing import Any

from app.config import settings
from app.store import _read_json, list_feedback


def generate_sop_recommendations() -> list[dict[str, Any]]:
    grouped: dict[tuple[str, str], list[dict[str, Any]]] = defaultdict(list)

    for run in load_completed_runs():
        for step in run.get("steps", []):
            deviation = (step.get("deviation_note") or "").strip()
            if not deviation:
                continue
            workflow_id = run.get("workflow_id", "Unknown workflow")
            step_name = step.get("title") or step.get("step_id") or "Unknown step"
            grouped[(workflow_id, step_name)].append(
                {
                    "sop": workflow_id,
                    "modified_step": step_name,
                    "modification": deviation,
                    "reason": step.get("operator_note", ""),
                }
            )

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
                "source_basis": "actual_runs_feedback",
                "evidence_count": len(entries),
            }
        )

    return recommendations


def load_prior_runs() -> list[dict[str, Any]]:
    # Deprecated: kept as a compatibility shim, but intentionally no longer reads
    # bundled knowledge/internal demo files. SOP signals should come from actual
    # user runs or explicit scientist feedback only.
    return load_completed_runs()


def load_completed_runs() -> list[dict[str, Any]]:
    runs = _read_json(settings.run_store_path, {})
    if not isinstance(runs, dict):
        return []
    return [
        run for run in runs.values()
        if isinstance(run, dict) and run.get("status") == "completed"
    ]


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
