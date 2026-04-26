"""FastAPI entrypoint."""
import asyncio
import json
import logging
import time
from datetime import UTC, datetime
from pathlib import Path
from uuid import uuid4

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sse_starlette.sse import EventSourceResponse

from app.config import settings
from app.compiler_v2 import commit_decision_source_grounded, compile_from_protocol_candidates
from app.intent import extract_structured_intent
from app.knowledge import ingest_external_sources, ingest_uploaded_documents, retrieve_context
from app.llm import complete, stream
from app.protocol_cache import find_protocol_step_by_chunk_id
from app.run_store import add_step_attachment, complete_run, create_run, get_run, update_run_findings, update_step_notes, update_step_status
from app.sop_improvement import generate_sop_recommendations
from app.store import _read_json, _write_json, append_feedback, get_workflow, list_feedback, relevant_feedback, save_workflow
from app.tavily_search import RetrievalConfig, discover_external_sources, generate_tavily_queries, source_to_dict
from app.vector_store import get_chunk, load_index, save_index, stats as vector_stats, upsert_document

app = FastAPI(title="Hackathon Backend", version="0.1.0")
logger = logging.getLogger("uvicorn.error")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_origin_regex=settings.cors_origin_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def log_runtime_config():
    logger.info("CORS allowed origins: %s", settings.cors_origins_list)
    logger.info("CORS allowed origin regex: %s", settings.cors_origin_regex)
    logger.info(
        "Configured services: llm_provider=%s openai=%s anthropic=%s tavily=%s",
        settings.llm_provider,
        bool(settings.openai_api_key),
        bool(settings.anthropic_api_key),
        bool(settings.tavily_api_key),
    )


@app.get("/health")
async def health():
    return {"status": "ok", "provider": settings.llm_provider, "vector_stats": vector_stats()}


@app.get("/api/debug/runtime")
async def debug_runtime():
    return {
        "cors": {
            "origins": settings.cors_origins_list,
            "origin_regex": settings.cors_origin_regex,
        },
        "services": {
            "llm_provider": settings.llm_provider,
            "openai_configured": bool(settings.openai_api_key),
            "anthropic_configured": bool(settings.anthropic_api_key),
            "tavily_configured": bool(settings.tavily_api_key),
        },
        "vector_stats": vector_stats(),
    }


@app.get("/api/memory/insights")
async def memory_insights():
    workflows = _read_json(settings.workflow_store_path, {})
    runs = _read_json(settings.run_store_path, {})
    feedback = list_feedback()
    vector_items = load_index()

    workflow_values = [workflow for workflow in workflows.values() if isinstance(workflow, dict)]
    run_values = [run for run in runs.values() if isinstance(run, dict)]
    completed_runs = [run for run in run_values if run.get("status") == "completed"]

    workflow_summaries = [summarize_workflow_for_memory(workflow, run_values) for workflow in workflow_values]
    workflow_summaries.sort(key=lambda item: item.get("updated_at") or item.get("created_at") or "", reverse=True)

    run_summaries = [summarize_run_for_memory(run) for run in run_values]
    run_summaries.sort(key=lambda item: item.get("completed_at") or item.get("created_at") or "", reverse=True)

    feedback_summaries = [
        {
            "feedback_id": item.get("feedback_id"),
            "workflow_id": item.get("workflow_id"),
            "experiment_type": item.get("experiment_type", "unknown"),
            "section": item.get("section", "unknown"),
            "step_id": item.get("step_id"),
            "correction": item.get("correction", ""),
            "reason": item.get("reason", ""),
            "created_at": item.get("created_at"),
        }
        for item in feedback
    ]

    learning_events = build_learning_events(workflow_values, run_values, feedback, vector_items)
    insights = build_memory_metrics(workflow_values, run_values, feedback, vector_items)
    return {
        "workflows": workflow_summaries[:25],
        "runs": run_summaries[:25],
        "feedback": feedback_summaries[-25:],
        "vector_stats": vector_stats(),
        "learning_events": learning_events[:50],
        "insights": insights,
        "improvement_opportunities": build_improvement_opportunities(workflow_values, run_values, feedback, vector_items),
    }


@app.delete("/api/memory")
async def clear_memory():
    """Clear local hackathon memory stores.

    This intentionally affects only generated local state, not source files,
    environment variables, or bundled code.
    """
    workflow_count = len(_read_json(settings.workflow_store_path, {}))
    run_count = len(_read_json(settings.run_store_path, {}))
    feedback_count = len(_read_json(settings.feedback_store_path, []))
    protocol_count = len(_read_json(settings.protocol_cache_path, {}))
    vector_count = len(load_index())
    upload_count = clear_upload_directory(settings.upload_store_path)

    _write_json(settings.workflow_store_path, {})
    _write_json(settings.run_store_path, {})
    _write_json(settings.feedback_store_path, [])
    _write_json(settings.trace_store_path, [])
    _write_json(settings.protocol_cache_path, {})
    save_index([])

    return {
        "ok": True,
        "cleared": {
            "workflows": workflow_count,
            "runs": run_count,
            "feedback": feedback_count,
            "protocol_candidates": protocol_count,
            "vector_chunks": vector_count,
            "uploaded_files": upload_count,
        },
        "insights": {
            "workflows": [],
            "runs": [],
            "feedback": [],
            "vector_stats": vector_stats(),
            "learning_events": [],
            "insights": build_memory_metrics([], [], [], []),
            "improvement_opportunities": build_improvement_opportunities([], [], [], []),
        },
    }


def clear_upload_directory(path_value: str) -> int:
    path = Path(path_value)
    if not path.exists():
        path.mkdir(parents=True, exist_ok=True)
        return 0
    cleared = 0
    for child in path.iterdir():
        if child.is_file() or child.is_symlink():
            child.unlink()
            cleared += 1
        elif child.is_dir():
            for nested in child.rglob("*"):
                if nested.is_file() or nested.is_symlink():
                    cleared += 1
            for nested in sorted(child.rglob("*"), key=lambda item: len(item.parts), reverse=True):
                if nested.is_file() or nested.is_symlink():
                    nested.unlink()
                elif nested.is_dir():
                    nested.rmdir()
            child.rmdir()
    return cleared


def summarize_workflow_for_memory(workflow: dict, runs: list[dict]) -> dict:
    workflow_id = workflow.get("workflow_id")
    linked_runs = [run for run in runs if run.get("workflow_id") == workflow_id]
    return {
        "workflow_id": workflow_id,
        "hypothesis": workflow.get("hypothesis", ""),
        "experiment_type": workflow.get("structured_intent", {}).get("experiment_type", "unknown"),
        "created_at": workflow.get("created_at"),
        "updated_at": workflow.get("updated_at"),
        "protocol_basis": workflow.get("protocol_basis", {}).get("base_protocol_name", "No protocol basis"),
        "readiness": workflow.get("protocol_basis", {}).get("base_protocol_score"),
        "open_decisions": workflow.get("open_decision_count", 0),
        "run_count": len(linked_runs),
        "latest_run_status": linked_runs[-1].get("status") if linked_runs else None,
        "memory_used_count": len(workflow.get("memory_used", []) or []),
    }


def summarize_run_for_memory(run: dict) -> dict:
    steps = run.get("steps", [])
    findings = run.get("findings") or {}
    return {
        "run_id": run.get("run_id"),
        "workflow_id": run.get("workflow_id"),
        "status": run.get("status"),
        "created_at": run.get("created_at"),
        "completed_at": run.get("completed_at"),
        "completed_steps": len([step for step in steps if step.get("status") == "completed"]),
        "total_steps": len(steps),
        "deviation_count": len([step for step in steps if step.get("deviation_note")]),
        "attachment_count": sum(len(step.get("attachments", []) or []) for step in steps),
        "conclusion": findings.get("conclusion", ""),
        "findings_preview": (findings.get("findings", "") or "")[:240],
    }


def build_memory_metrics(workflows: list[dict], runs: list[dict], feedback: list[dict], vector_items: list[dict]) -> dict:
    experiment_counts: dict[str, int] = {}
    feedback_sections: dict[str, int] = {}
    memory_sources: dict[str, int] = {}
    for workflow in workflows:
        key = workflow.get("structured_intent", {}).get("experiment_type", "unknown")
        experiment_counts[key] = experiment_counts.get(key, 0) + 1
    for item in feedback:
        key = item.get("section", "unknown")
        feedback_sections[key] = feedback_sections.get(key, 0) + 1
    for item in vector_items:
        metadata = item.get("metadata", {})
        key = metadata.get("memory_kind") or metadata.get("source_type") or "unknown"
        memory_sources[key] = memory_sources.get(key, 0) + 1
    return {
        "workflow_count": len(workflows),
        "run_count": len(runs),
        "completed_run_count": len([run for run in runs if run.get("status") == "completed"]),
        "feedback_count": len(feedback),
        "custom_branch_count": count_trace_events(workflows, "decision_committed", "custom branch"),
        "manual_gap_resolution_count": count_vector_memory_kind(vector_items, "manual_missing_context_resolution"),
        "run_prep_count": len([workflow for workflow in workflows if workflow.get("run_preparation")]),
        "deviation_count": sum(len([step for step in run.get("steps", []) if step.get("deviation_note")]) for run in runs),
        "top_experiment_types": top_counts(experiment_counts),
        "top_feedback_sections": top_counts(feedback_sections),
        "memory_sources": top_counts(memory_sources),
    }


def build_learning_events(workflows: list[dict], runs: list[dict], feedback: list[dict], vector_items: list[dict]) -> list[dict]:
    events: list[dict] = []
    for run in runs:
        if run.get("status") == "completed":
            events.append({
                "event_type": "completed_run_indexed",
                "label": f"Completed run {run.get('run_id')}",
                "description": "Completed run notes, deviations, actuals, and attachments metadata are indexed as prior-run memory.",
                "workflow_id": run.get("workflow_id"),
                "run_id": run.get("run_id"),
                "timestamp": run.get("completed_at") or run.get("created_at"),
            })
    for workflow in workflows:
        for event in workflow.get("trace", []):
            summary = event.get("summary", "")
            if "custom branch" in summary.lower():
                events.append({
                    "event_type": "custom_branch_indexed",
                    "label": "Custom decision branch",
                    "description": "Scientist-authored branch is indexed as internal memory for similar future decisions.",
                    "workflow_id": workflow.get("workflow_id"),
                    "timestamp": event.get("timestamp"),
                })
        if workflow.get("run_preparation"):
            events.append({
                "event_type": "run_preparation_indexed",
                "label": f"Run preparation saved for {workflow.get('workflow_id')}",
                "description": "Approval, procurement, schedule, validation, and risk readiness are indexed for future run planning.",
                "workflow_id": workflow.get("workflow_id"),
                "timestamp": workflow.get("run_preparation", {}).get("updated_at") or workflow.get("updated_at"),
            })
    for item in feedback:
        events.append({
            "event_type": "feedback_stored",
            "label": f"Feedback on {item.get('section', 'unknown')}",
            "description": (item.get("correction") or "Scientist correction stored for retrieval.")[:240],
            "workflow_id": item.get("workflow_id"),
            "timestamp": item.get("created_at"),
        })
    for item in vector_items:
        metadata = item.get("metadata", {})
        if metadata.get("memory_kind") == "manual_missing_context_resolution":
            events.append({
                "event_type": "manual_gap_resolution_indexed",
                "label": metadata.get("source_name", "Manual gap resolution"),
                "description": "Manual missing-context procedure is available as retrievable scientist memory.",
                "workflow_id": metadata.get("workflow_id"),
                "timestamp": None,
            })
    events.sort(key=lambda item: item.get("timestamp") or "", reverse=True)
    return events


def build_improvement_opportunities(workflows: list[dict], runs: list[dict], feedback: list[dict], vector_items: list[dict]) -> list[str]:
    opportunities = []
    deviations = sum(len([step for step in run.get("steps", []) if step.get("deviation_note")]) for run in runs)
    manual_gaps = count_vector_memory_kind(vector_items, "manual_missing_context_resolution")
    estimate_materials = sum(
        len([item for item in workflow.get("plan", {}).get("materials", []) if item.get("price_source") == "internal_estimate_table"])
        for workflow in workflows
    )
    no_internal = len([
        workflow for workflow in workflows
        if workflow.get("sop_match", {}).get("source_origin") != "uploaded_internal"
    ])
    if deviations:
        opportunities.append(f"{deviations} run deviations are available for future SOP improvement analysis.")
    if manual_gaps:
        opportunities.append(f"{manual_gaps} manually authored missing-context resolutions could be promoted into a runbook.")
    if estimate_materials:
        opportunities.append(f"{estimate_materials} material entries still use estimate-table pricing rather than source-backed supplier quotes.")
    if no_internal:
        opportunities.append(f"{no_internal} workflows compiled without an uploaded internal SOP as the best basis.")
    if not runs:
        opportunities.append("No execution runs have been created yet, so execution memory is limited.")
    if not feedback:
        opportunities.append("No explicit scientist feedback has been stored yet.")
    return opportunities


def count_trace_events(workflows: list[dict], event_type: str, contains: str | None = None) -> int:
    count = 0
    for workflow in workflows:
        for event in workflow.get("trace", []):
            if event.get("event_type") != event_type:
                continue
            if contains and contains not in event.get("summary", "").lower():
                continue
            count += 1
    return count


def count_vector_memory_kind(vector_items: list[dict], memory_kind: str) -> int:
    return len([item for item in vector_items if item.get("metadata", {}).get("memory_kind") == memory_kind])


def top_counts(counts: dict[str, int], *, limit: int = 6) -> list[dict]:
    return [
        {"label": label, "count": count}
        for label, count in sorted(counts.items(), key=lambda item: item[1], reverse=True)[:limit]
    ]


def index_scientist_memory(
    workflow: dict,
    title: str,
    text: str,
    *,
    memory_kind: str,
) -> None:
    experiment_type = workflow.get("structured_intent", {}).get("experiment_type", "unknown")
    workflow_id = workflow.get("workflow_id", "unknown_workflow")
    upsert_document(
        f"{memory_kind} {workflow_id} {title}",
        text,
        {
            "source_type": "scientist_note",
            "source_origin": "prior_run",
            "is_user_provided": True,
            "priority": "internal",
            "path": f"workflow://{workflow_id}/{memory_kind}",
            "experiment_type": experiment_type,
            "workflow_id": workflow_id,
            "memory_kind": memory_kind,
        },
    )


class ChatRequest(BaseModel):
    prompt: str
    system: str = "You are a helpful assistant."
    provider: str | None = None


class ChatResponse(BaseModel):
    response: str
    latency_ms: int
    provider: str


@app.post("/api/chat", response_model=ChatResponse)
async def chat(req: ChatRequest):
    """Non-streaming chat endpoint."""
    start = time.perf_counter()
    text = await complete(req.prompt, system=req.system, provider=req.provider)
    latency_ms = int((time.perf_counter() - start) * 1000)
    return ChatResponse(
        response=text,
        latency_ms=latency_ms,
        provider=req.provider or settings.llm_provider,
    )


@app.post("/api/stream")
async def chat_stream(req: ChatRequest):
    """Streaming chat endpoint. SSE events."""

    async def event_gen():
        async for chunk in stream(req.prompt, system=req.system, provider=req.provider):
            yield {"data": chunk}
        yield {"event": "done", "data": ""}

    return EventSourceResponse(event_gen())


# ---- STUB: domain-specific endpoint ----
# Rename this to whatever the challenge demands. Example:
# /api/analyze-document, /api/detect-anomaly, /api/generate-design


class DomainRequest(BaseModel):
    input: str
    # add fields as needed for your challenge


class DomainResponse(BaseModel):
    result: str
    # add metric fields: confidence, score, latency, accuracy, etc.
    metric_value: float = 0.0
    metric_name: str = "placeholder"


@app.post("/api/domain", response_model=DomainResponse)
async def domain_endpoint(req: DomainRequest):
    """Replace with your challenge-specific logic Saturday."""
    result = await complete(f"Process this input: {req.input}")
    return DomainResponse(result=result, metric_value=0.95, metric_name="accuracy")


class KnowledgeUploadDocument(BaseModel):
    filename: str
    text: str
    source_type: str | None = None


class KnowledgeUploadRequest(BaseModel):
    documents: list[KnowledgeUploadDocument]


@app.post("/api/knowledge/upload")
async def knowledge_upload(req: KnowledgeUploadRequest):
    docs = [doc.model_dump() for doc in req.documents if doc.text.strip()]
    if not docs:
        raise HTTPException(status_code=400, detail="No readable documents uploaded")
    return ingest_uploaded_documents(docs)


class IntentRequest(BaseModel):
    hypothesis: str


@app.post("/api/intent")
async def intent(req: IntentRequest):
    return {"structured_intent": extract_structured_intent(req.hypothesis)}


class CompileWorkflowRequest(BaseModel):
    hypothesis: str
    use_external_retrieval: bool = True
    tavily_max_results_per_query: int = 2
    tavily_max_sources: int = 12
    tavily_max_queries: int = 10
    tavily_search_depth: str = "advanced"
    tavily_include_domains: list[str] | None = None
    min_external_quality_score: float = 0.25
    selected_external_urls: list[str] | None = None


@app.post("/api/workflows/compile")
async def workflows_compile(req: CompileWorkflowRequest):
    return await compile_workflow_core(req)


async def compile_workflow_core(req: CompileWorkflowRequest, progress=None):
    if not req.hypothesis.strip():
        raise HTTPException(status_code=400, detail="Hypothesis is required")
    stage = "start"
    try:
        stage = "extract_structured_intent"
        await emit_progress(progress, stage, "Extracting model system, intervention, comparator, outcome, and constraints")
        structured_intent = extract_structured_intent(req.hypothesis)
        external_ingest_result = None
        external_source_count = 0
        external_sources = []
        if req.use_external_retrieval:
            stage = "discover_external_sources_tavily"
            await emit_progress(progress, stage, "Running targeted Tavily searches across protocol and supplier sources")
            retrieval_config = RetrievalConfig(
                max_results_per_query=max(1, min(req.tavily_max_results_per_query, 8)),
                max_sources=max(1, min(req.tavily_max_sources, 40)),
                max_queries=max(1, min(req.tavily_max_queries, 10)),
                search_depth=req.tavily_search_depth if req.tavily_search_depth in {"basic", "advanced"} else "advanced",
                include_domains=req.tavily_include_domains,
                min_quality_score=max(0.0, min(req.min_external_quality_score, 1.0)),
            )
            external_sources = await discover_external_sources(structured_intent, config=retrieval_config, progress=progress)
            external_sources = [
                source for source in external_sources
                if source.quality_score >= retrieval_config.min_quality_score
            ]
            if req.selected_external_urls:
                selected = set(req.selected_external_urls)
                external_sources = [source for source in external_sources if source.url in selected]
            external_source_count = len(external_sources)
            stage = "ingest_external_sources"
            await emit_progress(progress, stage, f"Embedding {external_source_count} retrieved external references locally")
            external_ingest_result = ingest_external_sources(
                external_sources,
                structured_intent.get("experiment_type", "unknown"),
            )
        stage = "retrieve_context"
        await emit_progress(progress, stage, "Retrieving nearest internal and external chunks from local vector memory")
        context = retrieve_context(req.hypothesis)
        stage = "retrieve_prior_feedback"
        await emit_progress(progress, stage, "Retrieving prior scientist corrections for this experiment type")
        feedback = relevant_feedback(
            structured_intent.get("experiment_type", "unknown"),
            req.hypothesis,
        )
        stage = "compile_from_protocol_candidates"
        await emit_progress(progress, stage, "Compiling source-grounded executable workflow")
        workflow = await compile_from_protocol_candidates(
            req.hypothesis,
            context,
            prior_feedback=feedback,
            sop_recommendations=generate_sop_recommendations(),
            external_sources=external_sources,
            progress=progress,
        )
        if external_ingest_result is not None:
            workflow["trace"].insert(
                2,
                {
                    "event_id": f"trace_{uuid4().hex[:8]}",
                    "event_type": "external_sources_retrieved",
                    "summary": (
                        f"Discovered {external_source_count} external references and embedded "
                        f"{external_ingest_result['chunks_created']} chunks into local RAG memory."
                    ),
                    "affected_sections": ["literature_qc", "decision_nodes", "materials", "validation"],
                    "timestamp": datetime.now(UTC).isoformat(),
                },
            )
        stage = "save_workflow"
        await emit_progress(progress, stage, "Persisting workflow, trace, and provenance metadata")
        save_workflow(workflow)
        return {"workflow": workflow}
    except Exception as exc:
        logger.exception("Workflow compile failed at stage=%s", stage)
        raise HTTPException(
            status_code=502,
            detail={
                "message": "Workflow compile failed",
                "stage": stage,
                "error_type": exc.__class__.__name__,
                "error": str(exc),
            },
        ) from exc


async def emit_progress(progress, stage: str, message: str, **data):
    if progress is None:
        return
    await progress(
        {
            "stage": stage,
            "message": message,
            "timestamp": datetime.now(UTC).isoformat(),
            **data,
        }
    )


@app.post("/api/workflows/compile-stream")
async def workflows_compile_stream(req: CompileWorkflowRequest):
    if not req.hypothesis.strip():
        raise HTTPException(status_code=400, detail="Hypothesis is required")

    async def event_gen():
        queue: asyncio.Queue[dict] = asyncio.Queue()

        async def progress(event: dict):
            await queue.put({"type": "progress", **event})

        task = asyncio.create_task(compile_workflow_core(req, progress=progress))
        started_at = time.perf_counter()

        while not task.done():
            try:
                event = await asyncio.wait_for(queue.get(), timeout=1)
                yield json.dumps(event) + "\n"
            except TimeoutError:
                elapsed_ms = int((time.perf_counter() - started_at) * 1000)
                yield json.dumps({"type": "heartbeat", "elapsed_ms": elapsed_ms}) + "\n"

        while not queue.empty():
            yield json.dumps(await queue.get()) + "\n"

        try:
            result = task.result()
        except HTTPException as exc:
            yield json.dumps({"type": "error", "detail": exc.detail, "status_code": exc.status_code}) + "\n"
        except Exception as exc:
            logger.exception("Streaming workflow compile failed")
            yield json.dumps(
                {
                    "type": "error",
                    "detail": {
                        "message": "Workflow compile failed",
                        "error_type": exc.__class__.__name__,
                        "error": str(exc),
                    },
                    "status_code": 500,
                }
            ) + "\n"
        else:
            elapsed_ms = int((time.perf_counter() - started_at) * 1000)
            yield json.dumps({"type": "complete", "elapsed_ms": elapsed_ms, **result}) + "\n"

    return StreamingResponse(event_gen(), media_type="application/x-ndjson")


@app.post("/api/retrieval/queries")
async def retrieval_queries(req: IntentRequest):
    structured_intent = extract_structured_intent(req.hypothesis)
    return {
        "structured_intent": structured_intent,
        "queries": generate_tavily_queries(structured_intent),
    }


class RetrievalPreviewRequest(BaseModel):
    hypothesis: str
    tavily_max_results_per_query: int = 2
    tavily_max_sources: int = 12
    tavily_max_queries: int = 10
    tavily_search_depth: str = "advanced"
    tavily_include_domains: list[str] | None = None
    min_external_quality_score: float = 0.25


@app.post("/api/retrieval/preview")
async def retrieval_preview(req: RetrievalPreviewRequest):
    structured_intent = extract_structured_intent(req.hypothesis)
    config = RetrievalConfig(
        max_results_per_query=max(1, min(req.tavily_max_results_per_query, 8)),
        max_sources=max(1, min(req.tavily_max_sources, 40)),
        max_queries=max(1, min(req.tavily_max_queries, 10)),
        search_depth=req.tavily_search_depth if req.tavily_search_depth in {"basic", "advanced"} else "advanced",
        include_domains=req.tavily_include_domains,
        min_quality_score=max(0.0, min(req.min_external_quality_score, 1.0)),
    )
    sources = await discover_external_sources(structured_intent, config=config)
    kept = [source for source in sources if source.quality_score >= config.min_quality_score]
    return {
        "structured_intent": structured_intent,
        "queries": generate_tavily_queries(structured_intent)[: config.max_queries],
        "sources": [source_to_dict(source) for source in kept],
        "rejected_sources": [source_to_dict(source) for source in sources if source.quality_score < config.min_quality_score],
        "config": config.__dict__,
    }


@app.post("/api/retrieval/preview-stream")
async def retrieval_preview_stream(req: RetrievalPreviewRequest):
    if not req.hypothesis.strip():
        raise HTTPException(status_code=400, detail="Hypothesis is required")

    async def event_gen():
        queue: asyncio.Queue[dict] = asyncio.Queue()

        async def progress(event: dict):
            await queue.put({"type": "progress", **event})

        async def run_preview():
            structured_intent = extract_structured_intent(req.hypothesis)
            config = RetrievalConfig(
                max_results_per_query=max(1, min(req.tavily_max_results_per_query, 8)),
                max_sources=max(1, min(req.tavily_max_sources, 40)),
                max_queries=max(1, min(req.tavily_max_queries, 10)),
                search_depth=req.tavily_search_depth if req.tavily_search_depth in {"basic", "advanced"} else "advanced",
                include_domains=req.tavily_include_domains,
                min_quality_score=max(0.0, min(req.min_external_quality_score, 1.0)),
            )
            await progress(
                {
                    "stage": "intent_extracted",
                    "message": "Structured intent extracted; generating targeted Tavily queries.",
                    "structured_intent": structured_intent,
                }
            )
            sources = await discover_external_sources(structured_intent, config=config, progress=progress)
            kept = [source for source in sources if source.quality_score >= config.min_quality_score]
            rejected = [source for source in sources if source.quality_score < config.min_quality_score]
            return {
                "structured_intent": structured_intent,
                "queries": generate_tavily_queries(structured_intent)[: config.max_queries],
                "sources": [source_to_dict(source) for source in kept],
                "rejected_sources": [source_to_dict(source) for source in rejected],
                "config": config.__dict__,
            }

        task = asyncio.create_task(run_preview())
        started_at = time.perf_counter()
        while not task.done():
            try:
                event = await asyncio.wait_for(queue.get(), timeout=1)
                yield json.dumps(event) + "\n"
            except TimeoutError:
                yield json.dumps({"type": "heartbeat", "elapsed_ms": int((time.perf_counter() - started_at) * 1000)}) + "\n"

        while not queue.empty():
            yield json.dumps(await queue.get()) + "\n"

        try:
            result = task.result()
        except Exception as exc:
            logger.exception("Retrieval preview failed")
            yield json.dumps({"type": "error", "detail": {"message": "Retrieval preview failed", "error_type": exc.__class__.__name__, "error": str(exc)}}) + "\n"
        else:
            yield json.dumps({"type": "complete", **result}) + "\n"

    return StreamingResponse(event_gen(), media_type="application/x-ndjson")


class CommitDecisionRequest(BaseModel):
    step_id: str
    selected_option_id: str
    scientist_note: str | None = None
    custom_branch: dict | None = None


@app.post("/api/workflows/{workflow_id}/decisions")
async def workflows_commit_decision(workflow_id: str, req: CommitDecisionRequest):
    workflow = get_workflow(workflow_id)
    if workflow is None:
        raise HTTPException(status_code=404, detail="Workflow not found")
    updated = commit_decision_source_grounded(
        workflow,
        req.step_id,
        req.selected_option_id,
        req.scientist_note,
        req.custom_branch,
    )
    save_workflow(updated)
    if req.selected_option_id == "custom_branch" and req.custom_branch:
        index_scientist_memory(
            updated,
            f"Custom decision branch {req.step_id}",
            "\n".join(
                [
                    f"Scientist authored a custom decision branch for workflow {workflow_id}.",
                    f"Decision step: {req.step_id}",
                    f"Branch label: {req.custom_branch.get('label', '')}",
                    f"Instructions: {req.custom_branch.get('summary', '')}",
                    f"Tradeoffs: {req.custom_branch.get('tradeoffs', [])}",
                    f"Risks: {req.custom_branch.get('risks', [])}",
                    f"Scientist note: {req.scientist_note or ''}",
                ]
            ),
            memory_kind="custom_decision_branch",
        )
    return {"workflow": updated}


class StepModifyRequest(BaseModel):
    modified_instructions: list[str]
    scientist_note: str | None = None


class PlanUpdateRequest(BaseModel):
    plan: dict
    scientist_note: str | None = None


class RunPrepUpdateRequest(BaseModel):
    run_preparation: dict
    scientist_note: str | None = None


@app.post("/api/workflows/{workflow_id}/plan")
async def workflows_update_plan(workflow_id: str, req: PlanUpdateRequest):
    workflow = get_workflow(workflow_id)
    if workflow is None:
        raise HTTPException(status_code=404, detail="Workflow not found")
    required_sections = {"materials", "budget", "timeline", "validation", "risks"}
    missing = required_sections - set(req.plan.keys())
    if missing:
        raise HTTPException(status_code=400, detail=f"Plan missing sections: {', '.join(sorted(missing))}")

    timestamp = datetime.now(UTC).isoformat()
    workflow["plan"] = {
        "materials": req.plan.get("materials") or [],
        "budget": req.plan.get("budget") or [],
        "timeline": req.plan.get("timeline") or [],
        "validation": req.plan.get("validation") or [],
        "risks": req.plan.get("risks") or [],
    }
    workflow["updated_at"] = timestamp
    workflow["trace"].append(
        {
            "event_id": f"trace_{uuid4().hex[:8]}",
            "event_type": "step_modified",
            "summary": "Scientist curated operational plan sections.",
            "scientist_note": req.scientist_note,
            "affected_sections": ["materials", "budget", "timeline", "validation", "risks"],
            "timestamp": timestamp,
        }
    )
    save_workflow(workflow)
    return {"workflow": workflow}


@app.post("/api/workflows/{workflow_id}/run-preparation")
async def workflows_update_run_preparation(workflow_id: str, req: RunPrepUpdateRequest):
    workflow = get_workflow(workflow_id)
    if workflow is None:
        raise HTTPException(status_code=404, detail="Workflow not found")

    timestamp = datetime.now(UTC).isoformat()
    workflow["run_preparation"] = {
        **req.run_preparation,
        "updated_at": timestamp,
    }
    workflow["updated_at"] = timestamp
    workflow["trace"].append(
        {
            "event_id": f"trace_{uuid4().hex[:8]}",
            "event_type": "note_added",
            "summary": "Scientist updated run preparation checklist.",
            "scientist_note": req.scientist_note,
            "affected_sections": ["materials", "budget", "timeline", "validation", "risks"],
            "timestamp": timestamp,
        }
    )
    save_workflow(workflow)
    index_scientist_memory(
        workflow,
        "Run preparation checklist",
        json.dumps(workflow["run_preparation"], indent=2),
        memory_kind="run_preparation",
    )
    return {"workflow": workflow}


@app.post("/api/workflows/{workflow_id}/steps/{step_id}/modify")
async def workflows_modify_step(workflow_id: str, step_id: str, req: StepModifyRequest):
    workflow = get_workflow(workflow_id)
    if workflow is None:
        raise HTTPException(status_code=404, detail="Workflow not found")
    for step in workflow["steps"]:
        if step["step_id"] == step_id:
            step["instructions"] = req.modified_instructions
            step["scientist_note"] = req.scientist_note
            if step.get("classification") == "missing_context":
                step["status"] = "ready"
                step["rationale"] = (
                    "Originally created as an uncovered hypothesis-derived gap. "
                    "A scientist manually authored the operational instructions for this workflow run."
                )
                step.setdefault("derivation", {})["resolved_by"] = "scientist_manual_authoring"
            break
    else:
        raise HTTPException(status_code=404, detail="Step not found")

    timestamp = datetime.now(UTC).isoformat()
    workflow["updated_at"] = timestamp
    workflow["trace"].append(
        {
            "event_id": f"trace_{uuid4().hex[:8]}",
            "event_type": "step_modified",
            "summary": f"Scientist modified step {step_id}.",
            "scientist_note": req.scientist_note,
            "affected_sections": ["protocol"],
            "timestamp": timestamp,
        }
    )
    save_workflow(workflow)
    if any(step.get("step_id") == step_id and step.get("derivation", {}).get("resolved_by") == "scientist_manual_authoring" for step in workflow.get("steps", [])):
        index_scientist_memory(
            workflow,
            f"Manual missing-context resolution {step_id}",
            "\n".join(
                [
                    f"Scientist manually authored missing-context step {step_id}.",
                    f"Instructions: {req.modified_instructions}",
                    f"Scientist note: {req.scientist_note or ''}",
                ]
            ),
            memory_kind="manual_missing_context_resolution",
        )
    return {"workflow": workflow}


class FeedbackRequest(BaseModel):
    step_id: str
    section: str
    rating: int
    correction: str
    reason: str


@app.post("/api/workflows/{workflow_id}/feedback")
async def workflows_feedback(workflow_id: str, req: FeedbackRequest):
    workflow = get_workflow(workflow_id)
    if workflow is None:
        raise HTTPException(status_code=404, detail="Workflow not found")
    timestamp = datetime.now(UTC).isoformat()
    feedback = {
        "feedback_id": f"fb_{uuid4().hex[:8]}",
        "workflow_id": workflow_id,
        "experiment_type": workflow.get("structured_intent", {}).get("experiment_type", "unknown"),
        **req.model_dump(),
        "created_at": timestamp,
    }
    append_feedback(feedback)
    workflow["trace"].append(
        {
            "event_id": f"trace_{uuid4().hex[:8]}",
            "event_type": "feedback_submitted",
            "summary": f"Scientist submitted feedback on {req.section}.",
            "scientist_note": req.reason,
            "affected_sections": [req.section],
            "timestamp": timestamp,
        }
    )
    save_workflow(workflow)
    return {"ok": True, "feedback": feedback, "workflow": workflow}


@app.post("/api/workflows/{workflow_id}/runs")
async def workflow_create_run(workflow_id: str):
    run = create_run(workflow_id)
    if run is None:
        raise HTTPException(status_code=404, detail="Workflow not found")
    return {"run": run}


@app.get("/api/runs/{run_id}")
async def run_get(run_id: str):
    run = get_run(run_id)
    if run is None:
        raise HTTPException(status_code=404, detail="Run not found")
    return {"run": run}


class RunStepUpdateRequest(BaseModel):
    operator_note: str | None = None
    deviation_note: str | None = None
    actuals: dict[str, object] | None = None


class RunStepAttachmentRequest(BaseModel):
    filename: str
    note: str | None = None
    content_type: str | None = None


class RunFindingsRequest(BaseModel):
    conclusion: str | None = None
    findings: str | None = None
    next_steps: str | None = None


@app.post("/api/runs/{run_id}/steps/{step_id}/start")
async def run_step_start(run_id: str, step_id: str, req: RunStepUpdateRequest | None = None):
    req = req or RunStepUpdateRequest()
    run = update_step_status(
        run_id,
        step_id,
        "active",
        operator_note=req.operator_note,
        deviation_note=req.deviation_note,
        actuals=req.actuals,
    )
    if run is None:
        raise HTTPException(status_code=404, detail="Run or step not found")
    return {"run": run}


@app.post("/api/runs/{run_id}/steps/{step_id}/complete")
async def run_step_complete(run_id: str, step_id: str, req: RunStepUpdateRequest):
    run = update_step_status(
        run_id,
        step_id,
        "completed",
        operator_note=req.operator_note,
        deviation_note=req.deviation_note,
        actuals=req.actuals,
    )
    if run is None:
        raise HTTPException(status_code=404, detail="Run or step not found")
    return {"run": run}


@app.post("/api/runs/{run_id}/steps/{step_id}/skip")
async def run_step_skip(run_id: str, step_id: str, req: RunStepUpdateRequest):
    run = update_step_status(
        run_id,
        step_id,
        "skipped",
        operator_note=req.operator_note,
        deviation_note=req.deviation_note,
        actuals=req.actuals,
    )
    if run is None:
        raise HTTPException(status_code=404, detail="Run or step not found")
    return {"run": run}


@app.post("/api/runs/{run_id}/steps/{step_id}/notes")
async def run_step_notes(run_id: str, step_id: str, req: RunStepUpdateRequest):
    run = update_step_notes(
        run_id,
        step_id,
        operator_note=req.operator_note,
        deviation_note=req.deviation_note,
        actuals=req.actuals,
    )
    if run is None:
        raise HTTPException(status_code=404, detail="Run or step not found")
    return {"run": run}


@app.post("/api/runs/{run_id}/steps/{step_id}/attachments")
async def run_step_attachment(run_id: str, step_id: str, req: RunStepAttachmentRequest):
    run = add_step_attachment(
        run_id,
        step_id,
        filename=req.filename,
        note=req.note,
        content_type=req.content_type,
    )
    if run is None:
        raise HTTPException(status_code=404, detail="Run or step not found")
    return {"run": run}


@app.post("/api/runs/{run_id}/complete")
async def run_complete(run_id: str):
    run = complete_run(run_id)
    if run is None:
        raise HTTPException(status_code=404, detail="Run not found")
    return {"run": run}


@app.post("/api/runs/{run_id}/findings")
async def run_findings(run_id: str, req: RunFindingsRequest):
    run = update_run_findings(
        run_id,
        conclusion=req.conclusion,
        findings=req.findings,
        next_steps=req.next_steps,
    )
    if run is None:
        raise HTTPException(status_code=404, detail="Run not found")
    return {"run": run}


@app.get("/api/workflows/{workflow_id}/trace")
async def workflows_trace(workflow_id: str):
    workflow = get_workflow(workflow_id)
    if workflow is None:
        raise HTTPException(status_code=404, detail="Workflow not found")
    return {"trace": workflow["trace"]}


@app.get("/api/knowledge/chunks/{chunk_id}")
async def knowledge_chunk(chunk_id: str):
    chunk = get_chunk(chunk_id)
    if chunk is None:
        protocol_step = find_protocol_step_by_chunk_id(chunk_id)
        if protocol_step is not None:
            return protocol_step
        raise HTTPException(status_code=404, detail="Chunk not found")
    return {
        "chunk_id": chunk.get("id"),
        "text": chunk.get("document"),
        "metadata": chunk.get("metadata"),
    }


@app.get("/api/sop-improvements")
async def sop_improvements():
    return {"recommendations": generate_sop_recommendations()}
