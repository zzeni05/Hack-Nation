"""Tiny JSON stores for workflows and feedback."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from app.config import settings


def _read_json(path_value: str, default: Any) -> Any:
    path = Path(path_value)
    path.parent.mkdir(parents=True, exist_ok=True)
    if not path.exists():
        return default
    return json.loads(path.read_text())


def _write_json(path_value: str, value: Any) -> None:
    path = Path(path_value)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2))


def save_workflow(workflow: dict[str, Any]) -> None:
    workflows = _read_json(settings.workflow_store_path, {})
    workflows[workflow["workflow_id"]] = workflow
    _write_json(settings.workflow_store_path, workflows)


def get_workflow(workflow_id: str) -> dict[str, Any] | None:
    workflows = _read_json(settings.workflow_store_path, {})
    return workflows.get(workflow_id)


def append_feedback(feedback: dict[str, Any]) -> None:
    entries = _read_json(settings.feedback_store_path, [])
    entries.append(feedback)
    _write_json(settings.feedback_store_path, entries)


def list_feedback() -> list[dict[str, Any]]:
    return _read_json(settings.feedback_store_path, [])


def relevant_feedback(experiment_type: str, hypothesis: str, *, limit: int = 4) -> list[dict[str, Any]]:
    entries = list_feedback()
    hypothesis_terms = {
        token.lower().strip(".,;:()")
        for token in hypothesis.split()
        if len(token.strip(".,;:()")) > 4
    }

    scored: list[tuple[float, dict[str, Any]]] = []
    for entry in entries:
        score = 0.0
        if entry.get("experiment_type") == experiment_type:
            score += 2.0
        feedback_text = " ".join(
            str(entry.get(key, ""))
            for key in ["section", "correction", "reason", "step_id"]
        ).lower()
        overlap = sum(1 for token in hypothesis_terms if token in feedback_text)
        score += min(overlap * 0.3, 1.5)
        if score > 0:
            scored.append((score, entry))

    scored.sort(key=lambda item: item[0], reverse=True)
    return [entry for _, entry in scored[:limit]]
