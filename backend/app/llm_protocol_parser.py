"""LLM-driven protocol parsing and mapping."""

from __future__ import annotations

import json
from typing import Any

from app.config import settings
from app.json_utils import parse_json_object
from app.llm import complete
from app.prompts import (
    PROTOCOL_STEP_EXTRACTION_SYSTEM,
    PROTOCOL_STEP_EXTRACTION_USER,
    STEP_MAPPING_SYSTEM,
    STEP_MAPPING_USER,
)
from app.protocol_parser import parse_protocol_file, section_to_step_blocks, split_sections
from app.vector_store import slugify


def llm_available() -> bool:
    if settings.llm_provider == "anthropic":
        return bool(settings.anthropic_api_key)
    if settings.llm_provider == "openai":
        return bool(settings.openai_api_key)
    return False


async def parse_protocol_file_llm(path, source_type: str) -> dict[str, Any]:
    if not llm_available():
        fallback = parse_protocol_file(path, source_type)
        fallback["parser_mode"] = "heuristic_fallback_no_llm_key"
        return fallback

    source_name = path.stem.replace("_", " ").replace("-", " ").title()
    raw_text = path.read_text()
    sections = split_sections(raw_text)
    steps: list[dict[str, Any]] = []
    evidence_claims: list[dict[str, Any]] = []
    source_classes: list[str] = []
    order = 1

    for section in sections:
        # Keep calls bounded. If a section is huge, deterministic blocks preserve order.
        blocks = section_to_step_blocks(section)
        section_text = "\n\n".join(blocks)
        result = await extract_steps_from_section(
            {
                "source_name": source_name,
                "source_type": source_type,
                "path": str(path),
            },
            section["title"],
            section_text,
        )
        source_classes.append(result.get("source_class", "evidence_only"))
        evidence_claims.extend(result.get("evidence_claims", []))
        for extracted in result.get("steps", []):
            step_id = f"{slugify(source_name)}_llm_s{order:03d}"
            steps.append(
                {
                    "step_id": step_id,
                    "order": order,
                    "title": extracted.get("title") or section["title"],
                    "section": section["title"],
                    "operation": extracted.get("operation") or slugify(section["title"]),
                    "text": extracted.get("text") or section_text,
                    "parameters": extracted.get("parameters") or {},
                    "materials": extracted.get("materials") or [],
                    "equipment": extracted.get("equipment") or [],
                    "constraints": extracted.get("constraints") or [],
                    "safety_notes": extracted.get("safety_notes") or [],
                    "success_checks": extracted.get("success_checks") or [],
                    "inputs": extracted.get("inputs") or [],
                    "outputs": extracted.get("outputs") or [],
                    "source_refs": [
                        {
                            "chunk_id": f"protocol_{slugify(source_name)}_llm_s{order:03d}",
                            "source_name": source_name,
                            "source_type": source_type,
                            "section": section["title"],
                        }
                    ],
                }
            )
            order += 1

    if not steps:
        fallback = parse_protocol_file(path, source_type)
        fallback["parser_mode"] = "heuristic_fallback_empty_llm_steps"
        return fallback

    return {
        "protocol_id": f"protocol_{slugify(source_name)}",
        "source_name": source_name,
        "source_type": source_type,
        "domain": infer_domain_from_steps(steps),
        "steps": steps,
        "raw_text": raw_text,
        "evidence_claims": evidence_claims,
        "step_source_capable": "step_source_capable" in source_classes or source_type in {"internal_sop", "internal_runbook", "equipment_manual"},
        "parser_mode": "llm",
    }


async def extract_steps_from_section(
    metadata: dict[str, Any],
    section_title: str,
    section_text: str,
) -> dict[str, Any]:
    prompt = PROTOCOL_STEP_EXTRACTION_USER.format(
        metadata_json=json.dumps(metadata, indent=2),
        section_title=section_title,
        section_text=section_text[:6000],
    )
    text = await complete(
        prompt,
        system=PROTOCOL_STEP_EXTRACTION_SYSTEM,
        max_tokens=1800,
    )
    return parse_json_object(text)


async def map_protocol_to_intent_llm(
    intent: dict[str, Any],
    protocol: dict[str, Any],
    prior_feedback: list[dict[str, Any]],
) -> dict[str, Any] | None:
    if not llm_available():
        return None

    compact_protocol = {
        "protocol_id": protocol["protocol_id"],
        "source_name": protocol["source_name"],
        "source_type": protocol["source_type"],
        "domain": protocol.get("domain"),
        "parser_mode": protocol.get("parser_mode"),
        "steps": [
            {
                "step_id": step["step_id"],
                "order": step["order"],
                "title": step["title"],
                "operation": step["operation"],
                "parameters": step.get("parameters", {}),
                "materials": step.get("materials", []),
                "constraints": step.get("constraints", []),
                "text": step.get("text", "")[:700],
            }
            for step in protocol["steps"][:20]
        ],
    }
    prompt = STEP_MAPPING_USER.format(
        intent_json=json.dumps(intent, indent=2),
        protocol_json=json.dumps(compact_protocol, indent=2),
        feedback_json=json.dumps(prior_feedback[:6], indent=2),
    )
    text = await complete(
        prompt,
        system=STEP_MAPPING_SYSTEM,
        max_tokens=2200,
    )
    return parse_json_object(text)


def infer_domain_from_steps(steps: list[dict[str, Any]]) -> str:
    blob = " ".join(
        [
            " ".join(str(step.get(field, "")) for field in ["title", "operation", "text"])
            for step in steps
        ]
    ).lower()
    if any(term in blob for term in ["cryoprotect", "freezing", "cryovial", "dmso", "thaw"]):
        return "cell_cryopreservation"
    if any(term in blob for term in ["viability", "celltiter", "trypan"]):
        return "cell_viability"
    if any(term in blob for term in ["culture", "passage", "confluence"]):
        return "cell_culture"
    return "general_lab_operations"

