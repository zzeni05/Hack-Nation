"""Persistent cache for parsed protocol candidates."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from app.config import settings


def _cache_path() -> Path:
    path = Path(settings.protocol_cache_path)
    path.parent.mkdir(parents=True, exist_ok=True)
    return path


def _load_cache() -> dict[str, Any]:
    path = _cache_path()
    if not path.exists():
        return {}
    return json.loads(path.read_text())


def _save_cache(cache: dict[str, Any]) -> None:
    _cache_path().write_text(json.dumps(cache, indent=2))


def file_cache_key(path: Path, parser_mode: str) -> str:
    stat = path.stat()
    return f"file:{path.resolve()}:{stat.st_mtime_ns}:{parser_mode}"


def external_cache_key(url: str, parser_mode: str, content_hash: str) -> str:
    return f"external:{url}:{content_hash}:{parser_mode}"


def get_cached_protocol(key: str) -> dict[str, Any] | None:
    return _load_cache().get(key)


def set_cached_protocol(key: str, protocol: dict[str, Any]) -> None:
    cache = _load_cache()
    cache[key] = protocol
    _save_cache(cache)


def find_protocol_step_by_chunk_id(chunk_id: str) -> dict[str, Any] | None:
    for protocol in _load_cache().values():
        for step in protocol.get("steps", []):
            for ref in step.get("source_refs", []):
                if ref.get("chunk_id") == chunk_id:
                    return {
                        "chunk_id": chunk_id,
                        "text": step.get("text", ""),
                        "metadata": {
                            **ref,
                            "protocol_id": protocol.get("protocol_id"),
                            "parser_mode": protocol.get("parser_mode"),
                            "cache_hit": protocol.get("cache_hit"),
                            "operation": step.get("operation"),
                            "parameters": step.get("parameters", {}),
                            "materials": step.get("materials", []),
                            "constraints": step.get("constraints", []),
                        },
                    }
    return None
