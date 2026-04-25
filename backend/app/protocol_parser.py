"""Parse SOPs/runbooks into structured protocol candidates."""

from __future__ import annotations

import re
from pathlib import Path
from typing import Any

from app.config import settings
from app.knowledge import display_name, infer_source_type
from app.vector_store import slugify, tokenize

HEADING_RE = re.compile(r"^(#{1,4})\s+(.+)$")
LIST_RE = re.compile(r"^\s*(?:[-*]|\d+[.)])\s+(.+)$")


def parse_internal_protocols() -> list[dict[str, Any]]:
    root = Path(settings.knowledge_path)
    if not root.exists():
        return []

    candidates = []
    for path in sorted(root.iterdir()):
        if path.suffix.lower() not in {".md", ".txt"}:
            continue
        source_type = infer_source_type(path)
        if source_type not in {"internal_sop", "internal_runbook", "equipment_manual", "facility_constraint"}:
            continue
        candidates.append(parse_protocol_file(path, source_type))
    return candidates


def internal_protocol_files() -> list[tuple[Path, str]]:
    root = Path(settings.knowledge_path)
    if not root.exists():
        return []
    files = []
    for path in sorted(root.iterdir()):
        if path.suffix.lower() not in {".md", ".txt"}:
            continue
        source_type = infer_source_type(path)
        if source_type not in {"internal_sop", "internal_runbook", "equipment_manual", "facility_constraint"}:
            continue
        files.append((path, source_type))
    return files


def parse_protocol_file(path: Path, source_type: str) -> dict[str, Any]:
    text = path.read_text()
    source_name = display_name(path)
    sections = split_sections(text)
    steps = []
    order = 1
    for section in sections:
        for block in section_to_step_blocks(section):
            steps.append(
                {
                    "step_id": f"{slugify(source_name)}_s{order:03d}",
                    "order": order,
                    "title": infer_step_title(section["title"], block),
                    "section": section["title"],
                    "operation": infer_operation(section["title"], block),
                    "text": block,
                    "parameters": infer_parameters(block),
                    "materials": infer_materials(block),
                    "constraints": infer_constraints(block),
                    "source_refs": [
                        {
                            "chunk_id": f"protocol_{slugify(source_name)}_s{order:03d}",
                            "source_name": source_name,
                            "source_type": source_type,
                            "section": section["title"],
                        }
                    ],
                }
            )
            order += 1

    return {
        "protocol_id": f"protocol_{slugify(source_name)}",
        "source_name": source_name,
        "source_type": source_type,
        "domain": infer_domain(source_name, text),
        "steps": steps,
        "raw_text": text,
        "step_source_capable": source_type in {"internal_sop", "internal_runbook", "equipment_manual"},
    }


def split_sections(text: str) -> list[dict[str, str]]:
    sections: list[dict[str, str]] = []
    current_title = "Overview"
    current_lines: list[str] = []

    for line in text.splitlines():
        match = HEADING_RE.match(line)
        if match:
            if current_lines:
                sections.append({"title": current_title, "text": "\n".join(current_lines).strip()})
            current_title = match.group(2).strip()
            current_lines = []
        else:
            current_lines.append(line)

    if current_lines:
        sections.append({"title": current_title, "text": "\n".join(current_lines).strip()})
    return [section for section in sections if section["text"]]


def section_to_step_blocks(section: dict[str, str]) -> list[str]:
    text = section["text"].strip()
    list_items = [match.group(1).strip() for line in text.splitlines() if (match := LIST_RE.match(line))]
    if len(list_items) >= 2:
        return list_items

    paragraphs = [p.strip() for p in re.split(r"\n\s*\n", text) if p.strip()]
    if len(paragraphs) > 1:
        return paragraphs
    return [text] if text else []


def infer_step_title(section_title: str, text: str) -> str:
    first_sentence = re.split(r"[.!?]\s+", text.strip())[0]
    if 8 <= len(first_sentence) <= 80:
        return first_sentence
    return section_title


def infer_operation(section_title: str, text: str) -> str:
    blob = f"{section_title} {text}".lower()
    operation_terms = [
        ("cell_culture", ["culture", "maintain", "passage", "confluence"]),
        ("cell_harvest_counting", ["harvest", "trypsin", "count", "pellet"]),
        ("cryoprotectant_preparation", ["cryoprotectant", "freezing medium", "dmso", "trehalose"]),
        ("equilibration_vialing", ["equilibrate", "cryovial", "vial"]),
        ("controlled_rate_freezing", ["controlled-rate", "-1c", "freeze", "-80c", "cryomed"]),
        ("storage_thaw", ["liquid nitrogen", "thaw", "storage", "ln2"]),
        ("viability_assay", ["viability", "trypan", "celltiter", "plate-reader", "luminescence"]),
        ("facility_constraint", ["reserve", "available", "constraint", "calendar", "bench"]),
    ]
    for operation, terms in operation_terms:
        if any(term in blob for term in terms):
            return operation
    return slugify(section_title)


def infer_parameters(text: str) -> dict[str, str]:
    parameters: dict[str, str] = {}
    patterns = {
        "temperature": r"(-?\d+\s?C|37C|4C|-80C)",
        "co2": r"(\d+%\s?CO2|\d+%\s?CO₂)",
        "centrifugation": r"(\d+\s?x\s?g\s+for\s+\d+\s+min(?:utes)?)",
        "confluence": r"(\d+[-–]\d+%\s+confluence|\d+%\s+confluence)",
        "cooling_rate": r"(-1C per minute|-1°C/min|-1C/min)",
        "viability_minimum": r"(\d+%\s+viability)",
    }
    for key, pattern in patterns.items():
        match = re.search(pattern, text, flags=re.IGNORECASE)
        if match:
            parameters[key] = match.group(1)
    return parameters


def infer_materials(text: str) -> list[str]:
    known = [
        "DMEM",
        "fetal bovine serum",
        "penicillin-streptomycin",
        "PBS",
        "trypsin-EDTA",
        "DMSO",
        "complete medium",
        "trypan blue",
        "CellTiter-Glo",
        "cryovials",
    ]
    lower = text.lower()
    return [item for item in known if item.lower() in lower]


def infer_constraints(text: str) -> list[str]:
    constraints = []
    for sentence in re.split(r"(?<=[.!?])\s+", text.strip()):
        lower = sentence.lower()
        if any(term in lower for term in ["must", "do not", "avoid", "requires", "preferred", "backup"]):
            constraints.append(sentence.strip())
    return constraints


def infer_domain(source_name: str, text: str) -> str:
    blob = f"{source_name} {text}".lower()
    if any(term in blob for term in ["freezing", "cryopreservation", "cryovial", "dmso"]):
        return "cell_cryopreservation"
    if any(term in blob for term in ["hela", "cell culture", "passage"]):
        return "cell_culture"
    if any(term in blob for term in ["viability", "celltiter", "trypan"]):
        return "cell_viability"
    return "general_lab_operations"


def protocol_search_text(protocol: dict[str, Any]) -> str:
    return " ".join(
        [
            protocol["source_name"],
            protocol["domain"],
            " ".join(step["title"] for step in protocol["steps"]),
            " ".join(step["operation"] for step in protocol["steps"]),
            protocol.get("raw_text", ""),
        ]
    )


def token_overlap_score(query: str, document: str) -> float:
    query_tokens = set(tokenize(query))
    doc_tokens = set(tokenize(document))
    if not query_tokens:
        return 0.0
    return len(query_tokens & doc_tokens) / len(query_tokens)
