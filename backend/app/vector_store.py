"""Local lightweight vector store for hackathon RAG.

This intentionally keeps the same responsibilities Chroma would own in a
production version: chunk persistence, metadata, embeddings, and similarity
search. The embedding implementation is a deterministic hashing vector so the
demo runs without extra model downloads; swap `embed_text` for
sentence-transformers/all-MiniLM-L6-v2 and the rest of the app can stay intact.
"""

from __future__ import annotations

import hashlib
import json
import math
import re
from pathlib import Path
from typing import Any

from app.config import settings

VECTOR_SIZE = 384
INDEX_FILE = "lab_knowledge.json"
TOKEN_RE = re.compile(r"[a-zA-Z0-9µμ%+.-]+")


def _index_path() -> Path:
    path = Path(settings.chroma_path)
    path.mkdir(parents=True, exist_ok=True)
    return path / INDEX_FILE


def tokenize(text: str) -> list[str]:
    return [token.lower() for token in TOKEN_RE.findall(text)]


def embed_text(text: str) -> list[float]:
    vector = [0.0] * VECTOR_SIZE
    for token in tokenize(text):
        digest = hashlib.sha256(token.encode("utf-8")).digest()
        idx = int.from_bytes(digest[:4], "big") % VECTOR_SIZE
        sign = 1.0 if digest[4] % 2 == 0 else -1.0
        vector[idx] += sign

    norm = math.sqrt(sum(value * value for value in vector))
    if norm == 0:
        return vector
    return [value / norm for value in vector]


def cosine(a: list[float], b: list[float]) -> float:
    return sum(x * y for x, y in zip(a, b, strict=False))


def load_index() -> list[dict[str, Any]]:
    path = _index_path()
    if not path.exists():
        return []
    return json.loads(path.read_text())


def save_index(items: list[dict[str, Any]]) -> None:
    _index_path().write_text(json.dumps(items, indent=2))


def chunk_text(text: str, chunk_size: int = 900, overlap: int = 140) -> list[str]:
    cleaned = re.sub(r"\n{3,}", "\n\n", text.strip())
    if len(cleaned) <= chunk_size:
        return [cleaned] if cleaned else []

    chunks: list[str] = []
    start = 0
    while start < len(cleaned):
        end = min(start + chunk_size, len(cleaned))
        chunk = cleaned[start:end].strip()
        if chunk:
            chunks.append(chunk)
        if end == len(cleaned):
            break
        start = max(0, end - overlap)
    return chunks


def upsert_document(
    source_name: str,
    text: str,
    metadata: dict[str, Any],
    *,
    reset_existing_source: bool = True,
) -> int:
    items = load_index()
    if reset_existing_source:
        items = [item for item in items if item["metadata"].get("source_name") != source_name]

    chunks = chunk_text(text)
    for idx, chunk in enumerate(chunks, start=1):
        chunk_id = f"{metadata.get('source_type', 'source')}_{slugify(source_name)}_{idx:03d}"
        items.append(
            {
                "id": chunk_id,
                "document": chunk,
                "embedding": embed_text(chunk),
                "metadata": {
                    **metadata,
                    "source_name": source_name,
                    "chunk_index": idx,
                    "chunk_id": chunk_id,
                },
            }
        )
    save_index(items)
    return len(chunks)


def search(query: str, *, n_results: int = 12, source_priority: str | None = None) -> list[dict[str, Any]]:
    query_embedding = embed_text(query)
    scored = []
    query_tokens = set(tokenize(query))
    for item in load_index():
        score = cosine(query_embedding, item["embedding"])
        doc_tokens = set(tokenize(item["document"]))
        keyword_overlap = len(query_tokens & doc_tokens) / max(len(query_tokens), 1)
        score += keyword_overlap * 0.2
        if source_priority and item["metadata"].get("priority") == source_priority:
            score += 0.08
        scored.append({**item, "score": score})

    scored.sort(key=lambda item: item["score"], reverse=True)
    return scored[:n_results]


def stats() -> dict[str, Any]:
    items = load_index()
    sources = {item["metadata"].get("source_name") for item in items}
    internal = [item for item in items if item["metadata"].get("priority") == "internal"]
    external = [item for item in items if item["metadata"].get("priority") == "external"]
    return {
        "chunks": len(items),
        "sources": len(sources),
        "internal_chunks": len(internal),
        "external_chunks": len(external),
    }


def get_chunk(chunk_id: str) -> dict[str, Any] | None:
    for item in load_index():
        metadata = item.get("metadata", {})
        if item.get("id") == chunk_id or metadata.get("chunk_id") == chunk_id:
            return item
    return None


def slugify(value: str) -> str:
    slug = re.sub(r"[^a-zA-Z0-9]+", "_", value.lower()).strip("_")
    return slug[:80] or "document"
