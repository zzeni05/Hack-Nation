"""External protocol and literature discovery.

Tavily is the discovery layer. Retrieved pages/snippets are normalized and then
embedded into the local vector index by the compile pipeline.
"""

from __future__ import annotations

from dataclasses import dataclass
from collections.abc import Awaitable, Callable
from typing import Any

import httpx

from app.config import settings


@dataclass
class ExternalSource:
    title: str
    url: str
    content: str
    source_name: str
    source_type: str
    domain: str
    query: str
    content_quality: str
    quality_score: float = 0.0
    quality_reasons: list[str] | None = None
    candidate_role: str = "evidence"


@dataclass
class RetrievalConfig:
    max_results_per_query: int = 2
    max_sources: int = 12
    max_queries: int = 10
    search_depth: str = "advanced"
    include_domains: list[str] | None = None
    min_quality_score: float = 0.25


def generate_tavily_queries(intent: dict[str, Any]) -> list[str]:
    model = intent.get("model_system") or ""
    intervention = intent.get("intervention") or ""
    comparator = intent.get("comparator") or ""
    outcome = intent.get("outcome") or ""
    experiment_type = intent.get("experiment_type") or ""

    terms = " ".join(
        part
        for part in [model, intervention, comparator, outcome]
        if part and not part.startswith("Intervention extracted")
    )
    if not terms.strip():
        terms = " ".join(intent.get("keywords", [])) or experiment_type or "scientific protocol"

    return [
        f"site:protocols.io {terms} protocol",
        f"site:bio-protocol.org {terms}",
        f"site:openwetware.org {terms} protocol",
        f"site:jove.com {terms}",
        f"site:nature.com/nprot {terms}",
        f"site:thermofisher.com {outcome} assay protocol {model}",
        f"site:sigmaaldrich.com {intervention} technical document protocol",
        f"site:promega.com {outcome} assay protocol",
        f"site:atcc.org {model} culture freezing thawing protocol",
        f"site:addgene.org/protocols {terms}",
    ]


async def discover_external_sources(
    intent: dict[str, Any],
    *,
    config: RetrievalConfig | None = None,
    progress: Callable[[dict[str, Any]], Awaitable[None]] | None = None,
) -> list[ExternalSource]:
    if not settings.tavily_api_key:
        return []

    config = config or RetrievalConfig()
    sources: list[ExternalSource] = []
    queries = generate_tavily_queries(intent)
    if config.include_domains:
        allowed = tuple(config.include_domains)
        queries = [query for query in queries if any(domain in query for domain in allowed)]
    queries = queries[: max(1, config.max_queries)]
    async with httpx.AsyncClient(timeout=20) as client:
        for index, query in enumerate(queries, start=1):
            await report_progress(
                progress,
                "tavily_query",
                f"Tavily query {index}/{len(queries)}: {query}",
                current=index,
                total=len(queries),
                query=query,
                sources_found=len(dedupe_sources(sources)),
            )
            response = await client.post(
                "https://api.tavily.com/search",
                json={
                    "api_key": settings.tavily_api_key,
                    "query": query,
                    "search_depth": config.search_depth,
                    "max_results": max(1, config.max_results_per_query),
                    "include_raw_content": True,
                },
            )
            response.raise_for_status()
            payload = response.json()
            for result in payload.get("results", []):
                source = normalize_tavily_result(result, query)
                if source and len(source.content.strip()) > 120:
                    score_external_source(source)
                    sources.append(source)
            await report_progress(
                progress,
                "tavily_query_complete",
                f"Completed Tavily query {index}/{len(queries)}; {len(dedupe_sources(sources))} unique sources found",
                current=index,
                total=len(queries),
                query=query,
                sources_found=len(dedupe_sources(sources)),
            )

    unique = dedupe_sources(sources)
    unique.sort(key=lambda source: source.quality_score, reverse=True)
    return unique[: max(1, config.max_sources)]


async def report_progress(
    progress: Callable[[dict[str, Any]], Awaitable[None]] | None,
    stage: str,
    message: str,
    **data: Any,
) -> None:
    if progress is None:
        return
    await progress({"stage": stage, "message": message, **data})


def normalize_tavily_result(result: dict[str, Any], query: str) -> ExternalSource | None:
    url = result.get("url") or ""
    if not url:
        return None
    content = result.get("raw_content") or result.get("content") or ""
    title = result.get("title") or url
    domain = domain_from_url(url)
    return ExternalSource(
        title=title,
        url=url,
        content=f"{title}\n\n{content}",
        source_name=source_name_from_domain(domain),
        source_type=source_type_from_domain(domain),
        domain=domain,
        query=query,
        content_quality="raw_content" if result.get("raw_content") else "snippet_only",
    )


def score_external_source(source: ExternalSource) -> None:
    text = source.content.lower()
    reasons: list[str] = []
    score = 0.0
    if source.domain.endswith(("protocols.io", "bio-protocol.org", "openwetware.org", "jove.com")):
        score += 0.25
        reasons.append("known protocol domain")
    if source.source_type == "supplier_doc":
        score += 0.18
        reasons.append("supplier/manufacturer documentation")
    procedural_terms = ["protocol", "procedure", "materials", "reagents", "step", "incubat", "centrifug", "wash", "assay", "thaw", "freeze"]
    hits = [term for term in procedural_terms if term in text]
    score += min(len(hits) * 0.06, 0.36)
    if hits:
        reasons.append(f"procedural terms: {', '.join(hits[:4])}")
    if any(marker in text for marker in ["1.", "2.", "step 1", "day 1", "materials and reagents"]):
        score += 0.16
        reasons.append("step-like structure detected")
    if source.content_quality == "raw_content":
        score += 0.08
        reasons.append("raw page content available")
    if len(source.content) > 1500:
        score += 0.08
        reasons.append("substantial content")
    source.quality_score = round(min(score, 1.0), 3)
    source.quality_reasons = reasons
    source.candidate_role = "protocol_candidate" if source.quality_score >= 0.35 and (
        source.source_type in {"external_protocol", "supplier_doc"} or "protocol" in text
    ) else "evidence"


def source_to_dict(source: ExternalSource) -> dict[str, Any]:
    return {
        "title": source.title,
        "url": source.url,
        "source_name": source.source_name,
        "source_type": source.source_type,
        "domain": source.domain,
        "query": source.query,
        "content_quality": source.content_quality,
        "quality_score": source.quality_score,
        "quality_reasons": source.quality_reasons or [],
        "candidate_role": source.candidate_role,
        "content_preview": source.content[:700],
    }


def dedupe_sources(sources: list[ExternalSource]) -> list[ExternalSource]:
    seen: set[str] = set()
    unique: list[ExternalSource] = []
    for source in sources:
        if source.url in seen:
            continue
        seen.add(source.url)
        unique.append(source)
    return unique


def domain_from_url(url: str) -> str:
    without_scheme = url.split("://", 1)[-1]
    return without_scheme.split("/", 1)[0].lower().removeprefix("www.")


def source_name_from_domain(domain: str) -> str:
    mapping = {
        "protocols.io": "protocols.io",
        "bio-protocol.org": "Bio-protocol",
        "openwetware.org": "OpenWetWare",
        "jove.com": "JoVE",
        "nature.com": "Nature Protocols",
        "thermofisher.com": "Thermo Fisher",
        "sigmaaldrich.com": "Sigma-Aldrich",
        "promega.com": "Promega",
        "qiagen.com": "Qiagen",
        "idtdna.com": "IDT",
        "atcc.org": "ATCC",
        "addgene.org": "Addgene",
        "ncbi.nlm.nih.gov": "NCBI",
    }
    for key, value in mapping.items():
        if domain.endswith(key):
            return value
    return domain


def source_type_from_domain(domain: str) -> str:
    if any(domain.endswith(d) for d in ["thermofisher.com", "sigmaaldrich.com", "promega.com", "qiagen.com", "idtdna.com", "atcc.org"]):
        return "supplier_doc"
    if any(domain.endswith(d) for d in ["nature.com", "ncbi.nlm.nih.gov"]):
        return "external_paper"
    return "external_protocol"
