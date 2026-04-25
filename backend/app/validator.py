"""Workflow provenance validator."""

from __future__ import annotations

from typing import Any


def validate_workflow(workflow: dict[str, Any]) -> dict[str, Any]:
    issues: list[dict[str, Any]] = []
    for step in workflow.get("steps", []):
        classification = step.get("classification")
        source_refs = step.get("source_refs") or []
        if classification not in {"missing_context", "decision_required"} and not source_refs:
            issues.append(
                {
                    "severity": "error",
                    "step_id": step.get("step_id"),
                    "message": "Step lacks source references.",
                }
            )
        if classification == "adapted_from_sop" and not step.get("rationale"):
            issues.append(
                {
                    "severity": "warning",
                    "step_id": step.get("step_id"),
                    "message": "Adapted step lacks adaptation rationale.",
                }
            )
        if classification == "decision_required":
            for option in step.get("options", []):
                if not option.get("supporting_refs"):
                    issues.append(
                        {
                            "severity": "warning",
                            "step_id": step.get("step_id"),
                            "message": f"Decision option '{option.get('label')}' has no supporting references.",
                        }
                    )

    for material in workflow.get("plan", {}).get("materials", []):
        if material.get("catalog") not in {None, "", "not_found", "mixed"} and not material.get("source_ref"):
            material["confidence"] = "medium"
            issues.append(
                {
                    "severity": "warning",
                    "step_id": None,
                    "message": f"Material catalog '{material.get('catalog')}' is not source-linked; confidence downgraded.",
                }
            )

    return {
        "ok": not any(issue["severity"] == "error" for issue in issues),
        "issues": issues,
    }

