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

