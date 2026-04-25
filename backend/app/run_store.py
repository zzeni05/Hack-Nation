"""Local execution-run store."""

from __future__ import annotations

from copy import deepcopy
from datetime import UTC, datetime
from typing import Any
from uuid import uuid4

from app.config import settings
from app.intent import now_iso
from app.store import _read_json, _write_json, get_workflow, save_workflow


def create_run(workflow_id: str) -> dict[str, Any] | None:
    workflow = get_workflow(workflow_id)
    if workflow is None:
        return None

    timestamp = now_iso()
    executable_steps = [
        step for step in workflow.get("steps", [])
        if step.get("classification") != "decision_required"
    ]
    run = {
        "run_id": f"run_{uuid4().hex[:10]}",
        "workflow_id": workflow_id,
        "status": "not_started",
        "current_step_id": executable_steps[0]["step_id"] if executable_steps else None,
        "created_at": timestamp,
        "started_at": None,
        "completed_at": None,
        "steps": [
            {
                "step_id": step["step_id"],
                "order": step["order"],
                "title": step["title"],
                "classification": step["classification"],
                "status": "not_started" if step.get("status") != "blocked" else "blocked",
                "started_at": None,
                "completed_at": None,
                "operator_note": "",
                "deviation_note": "",
                "actuals": {},
                "attachments": [],
                "source_refs": step.get("source_refs", []),
            }
            for step in executable_steps
        ],
        "events": [
            build_run_event("run_created", f"Execution run created from workflow {workflow_id}.")
        ],
    }
    runs = _read_json(settings.run_store_path, {})
    runs[run["run_id"]] = run
    _write_json(settings.run_store_path, runs)
    append_workflow_trace(workflow, "run_created", f"Execution run {run['run_id']} created.")
    return run


def get_run(run_id: str) -> dict[str, Any] | None:
    return _read_json(settings.run_store_path, {}).get(run_id)


def save_run(run: dict[str, Any]) -> None:
    runs = _read_json(settings.run_store_path, {})
    runs[run["run_id"]] = run
    _write_json(settings.run_store_path, runs)


def update_step_status(
    run_id: str,
    step_id: str,
    status: str,
    *,
    operator_note: str | None = None,
    deviation_note: str | None = None,
    actuals: dict[str, Any] | None = None,
) -> dict[str, Any] | None:
    run = get_run(run_id)
    if run is None:
        return None
    timestamp = now_iso()
    step = find_run_step(run, step_id)
    if step is None:
        return None

    if status == "active":
        run["status"] = "in_progress"
        run["started_at"] = run.get("started_at") or timestamp
        step["started_at"] = step.get("started_at") or timestamp
        run["current_step_id"] = step_id
    elif status in {"completed", "skipped", "blocked"}:
        if status in {"completed", "skipped"} and run.get("status") == "not_started":
            run["status"] = "in_progress"
            run["started_at"] = run.get("started_at") or timestamp
            step["started_at"] = step.get("started_at") or timestamp
        step["completed_at"] = timestamp if status in {"completed", "skipped"} else step.get("completed_at")
        if status == "completed":
            run["current_step_id"] = next_unfinished_step_id(run, after_order=step["order"])

    step["status"] = status
    if operator_note is not None:
        step["operator_note"] = operator_note
    if deviation_note is not None:
        step["deviation_note"] = deviation_note
    if actuals is not None:
        step["actuals"] = actuals

    run["events"].append(
        build_run_event(
            f"step_{status}",
            f"Step {step_id} marked {status}.",
            step_id=step_id,
            operator_note=operator_note,
            deviation_note=deviation_note,
            actuals=actuals,
        )
    )
    save_run(run)
    append_workflow_trace_for_run(run, f"run_step_{status}", f"Run step {step_id} marked {status}.", operator_note)
    return run


def update_step_notes(
    run_id: str,
    step_id: str,
    *,
    operator_note: str | None = None,
    deviation_note: str | None = None,
    actuals: dict[str, Any] | None = None,
) -> dict[str, Any] | None:
    run = get_run(run_id)
    if run is None:
        return None
    step = find_run_step(run, step_id)
    if step is None:
        return None
    if operator_note is not None:
        step["operator_note"] = operator_note
    if deviation_note is not None:
        step["deviation_note"] = deviation_note
    if actuals is not None:
        step["actuals"] = actuals
    run["events"].append(
        build_run_event(
            "step_notes_updated",
            f"Execution notes updated for step {step_id}.",
            step_id=step_id,
            operator_note=operator_note,
            deviation_note=deviation_note,
            actuals=actuals,
        )
    )
    save_run(run)
    append_workflow_trace_for_run(run, "run_step_notes_updated", f"Execution notes updated for step {step_id}.", operator_note)
    return run


def complete_run(run_id: str) -> dict[str, Any] | None:
    run = get_run(run_id)
    if run is None:
        return None
    timestamp = now_iso()
    run["status"] = "completed"
    run["completed_at"] = timestamp
    run["current_step_id"] = None
    run["events"].append(build_run_event("run_completed", "Execution run completed."))
    save_run(run)
    append_workflow_trace_for_run(run, "run_completed", f"Execution run {run_id} completed.", None)
    return run


def find_run_step(run: dict[str, Any], step_id: str) -> dict[str, Any] | None:
    for step in run.get("steps", []):
        if step.get("step_id") == step_id:
            return step
    return None


def next_unfinished_step_id(run: dict[str, Any], *, after_order: int) -> str | None:
    later = [
        step for step in run.get("steps", [])
        if step.get("order", 0) > after_order and step.get("status") not in {"completed", "skipped", "blocked"}
    ]
    return later[0]["step_id"] if later else None


def build_run_event(event_type: str, summary: str, **payload: Any) -> dict[str, Any]:
    return {
        "event_id": f"evt_{uuid4().hex[:8]}",
        "event_type": event_type,
        "summary": summary,
        "timestamp": datetime.now(UTC).isoformat(),
        **{key: value for key, value in payload.items() if value is not None},
    }


def append_workflow_trace_for_run(
    run: dict[str, Any],
    event_type: str,
    summary: str,
    scientist_note: str | None,
) -> None:
    workflow = get_workflow(run["workflow_id"])
    if workflow is None:
        return
    append_workflow_trace(workflow, event_type, summary, scientist_note)


def append_workflow_trace(
    workflow: dict[str, Any],
    event_type: str,
    summary: str,
    scientist_note: str | None = None,
) -> None:
    updated = deepcopy(workflow)
    timestamp = now_iso()
    updated["updated_at"] = timestamp
    updated.setdefault("trace", []).append(
        {
            "event_id": f"trace_{uuid4().hex[:8]}",
            "event_type": event_type,
            "summary": summary,
            "scientist_note": scientist_note,
            "affected_sections": ["execution", "provenance", "memory"],
            "timestamp": timestamp,
        }
    )
    save_workflow(updated)
