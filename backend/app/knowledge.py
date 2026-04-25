"""Internal and external knowledge ingestion utilities."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from app.config import settings
from app.tavily_search import ExternalSource
from app.vector_store import search, stats, upsert_document


def infer_source_type(path: Path) -> str:
    name = path.name.lower()
    if "prior_run" in name:
        return "prior_run"
    if "constraint" in name:
        return "facility_constraint"
    if "manual" in name or "freezer" in name:
        return "equipment_manual"
    if "runbook" in name:
        return "internal_runbook"
    return "internal_sop"


def display_name(path: Path) -> str:
    return path.stem.replace("_", " ").replace("-", " ").title()


def ingest_internal_knowledge() -> dict[str, Any]:
    root = Path(settings.knowledge_path)
    root.mkdir(parents=True, exist_ok=True)
    documents = [path for path in root.iterdir() if path.suffix.lower() in {".md", ".txt", ".json"}]
    chunks_created = 0

    for path in documents:
        text = path.read_text()
        if path.suffix.lower() == ".json":
            try:
                parsed = json.loads(text)
                text = json.dumps(parsed, indent=2)
            except json.JSONDecodeError:
                pass
        chunks_created += upsert_document(
            display_name(path),
            text,
            {
                "source_type": infer_source_type(path),
                "source_origin": "seeded_demo",
                "is_user_provided": False,
                "priority": "internal",
                "path": str(path),
                "experiment_type": "cell_cryopreservation",
            },
        )

    return {
        "documents_ingested": len(documents),
        "chunks_created": chunks_created,
        "collection": "lab_knowledge",
        "stats": stats(),
    }


def ingest_uploaded_documents(docs: list[dict[str, str]]) -> dict[str, Any]:
    chunks_created = 0
    for doc in docs:
        filename = doc["filename"]
        text = doc["text"]
        source_type = doc.get("source_type") or infer_uploaded_source_type(filename)
        chunks_created += upsert_document(
            filename,
            text,
            {
                "source_type": source_type,
                "source_origin": "uploaded_internal",
                "is_user_provided": True,
                "priority": "internal",
                "path": f"uploaded://{filename}",
                "experiment_type": "uploaded_lab_context",
            },
        )

    return {
        "documents_ingested": len(docs),
        "chunks_created": chunks_created,
        "collection": "lab_knowledge",
        "stats": stats(),
    }


def ingest_external_sources(sources: list[ExternalSource], experiment_type: str) -> dict[str, Any]:
    chunks_created = 0
    for source in sources:
        chunks_created += upsert_document(
            source.title,
            source.content,
            {
                "source_type": source.source_type,
                "source_origin": "external_tavily",
                "is_user_provided": False,
                "priority": "external",
                "source_url": source.url,
                "domain": source.domain,
                "source_name": source.source_name,
                "experiment_type": experiment_type,
                "retrieved_for": experiment_type,
                "query": source.query,
                "content_quality": source.content_quality,
            },
            reset_existing_source=True,
        )

    return {
        "documents_ingested": len(sources),
        "chunks_created": chunks_created,
        "collection": "lab_knowledge",
        "stats": stats(),
    }


def infer_uploaded_source_type(filename: str) -> str:
    name = filename.lower()
    if "run" in name and name.endswith(".json"):
        return "prior_run"
    if "constraint" in name or "facility" in name:
        return "facility_constraint"
    if "manual" in name or "equipment" in name:
        return "equipment_manual"
    if "runbook" in name:
        return "internal_runbook"
    return "internal_sop"


def retrieve_context(query: str) -> dict[str, Any]:
    results = search(query, n_results=16, source_priority="internal")
    internal = [item for item in results if item["metadata"].get("priority") == "internal"][:10]
    external = [item for item in results if item["metadata"].get("priority") == "external"][:6]
    return {"internal": internal, "external": external, "stats": stats()}
