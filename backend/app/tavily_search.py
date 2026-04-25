"""External protocol and literature discovery.

Tavily is the discovery layer. Retrieved pages/snippets are normalized and then
embedded into the local vector index by the compile pipeline.
"""

from __future__ import annotations

from dataclasses import dataclass
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


async def discover_external_sources(intent: dict[str, Any], *, max_results_per_query: int = 2) -> list[ExternalSource]:
    if not settings.tavily_api_key:
        return curated_external_sources(intent)

    sources: list[ExternalSource] = []
    async with httpx.AsyncClient(timeout=20) as client:
        for query in generate_tavily_queries(intent):
            response = await client.post(
                "https://api.tavily.com/search",
                json={
                    "api_key": settings.tavily_api_key,
                    "query": query,
                    "search_depth": "advanced",
                    "max_results": max_results_per_query,
                    "include_raw_content": True,
                },
            )
            response.raise_for_status()
            payload = response.json()
            for result in payload.get("results", []):
                source = normalize_tavily_result(result, query)
                if source and len(source.content.strip()) > 120:
                    sources.append(source)

    return dedupe_sources(sources)[:12]


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


def curated_external_sources(intent: dict[str, Any]) -> list[ExternalSource]:
    """Fallback references keep the demo deterministic without a Tavily key."""
    query = "curated fallback for " + (intent.get("experiment_type") or "scientific workflow")
    return [
        ExternalSource(
            title="Intracellular trehalose improves the survival of cryopreserved mammalian cells",
            url="https://www.nature.com/articles/nbt0200_163",
            content=(
                "Intracellular trehalose improves the survival of cryopreserved mammalian cells. "
                "The work supports trehalose loading as a cryoprotection strategy and motivates "
                "decision points around extracellular supplementation versus intracellular loading."
            ),
            source_name="Nature Biotechnology",
            source_type="external_paper",
            domain="nature.com",
            query=query,
            content_quality="curated_fallback",
        ),
        ExternalSource(
            title="CellTiter-Glo Luminescent Cell Viability Assay Protocol",
            url="https://www.promega.com/resources/protocols/technical-bulletins/0/celltiter-glo-luminescent-cell-viability-assay-protocol/",
            content=(
                "Promega CellTiter-Glo Luminescent Cell Viability Assay Protocol. The assay is "
                "used for quantifying viable cells in multiwell formats and supports plate-reader "
                "comparative viability workflows."
            ),
            source_name="Promega",
            source_type="supplier_doc",
            domain="promega.com",
            query=query,
            content_quality="curated_fallback",
        ),
        ExternalSource(
            title="ATCC animal cell culture guide",
            url="https://www.atcc.org/resources/culture-guides/animal-cell-culture-guide",
            content=(
                "ATCC animal cell culture guidance covers mammalian cell maintenance, subculture, "
                "freezing, thawing, and recovery practices relevant to HeLa culture workflows."
            ),
            source_name="ATCC",
            source_type="supplier_doc",
            domain="atcc.org",
            query=query,
            content_quality="curated_fallback",
        ),
    ]

