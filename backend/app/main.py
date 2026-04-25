"""FastAPI entrypoint."""
import asyncio
import json
import logging
import time
from datetime import UTC, datetime
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
from app.run_store import complete_run, create_run, get_run, update_step_notes, update_step_status
from app.sop_improvement import generate_sop_recommendations
from app.store import append_feedback, get_workflow, relevant_feedback, save_workflow
from app.tavily_search import discover_external_sources, generate_tavily_queries
from app.vector_store import get_chunk, stats as vector_stats

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
            external_sources = await discover_external_sources(structured_intent, progress=progress)
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


class CommitDecisionRequest(BaseModel):
    step_id: str
    selected_option_id: str
    scientist_note: str | None = None


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
    )
    save_workflow(updated)
    return {"workflow": updated}


class StepModifyRequest(BaseModel):
    modified_instructions: list[str]
    scientist_note: str | None = None


@app.post("/api/workflows/{workflow_id}/steps/{step_id}/modify")
async def workflows_modify_step(workflow_id: str, step_id: str, req: StepModifyRequest):
    workflow = get_workflow(workflow_id)
    if workflow is None:
        raise HTTPException(status_code=404, detail="Workflow not found")
    for step in workflow["steps"]:
        if step["step_id"] == step_id:
            step["instructions"] = req.modified_instructions
            step["scientist_note"] = req.scientist_note
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


@app.post("/api/runs/{run_id}/complete")
async def run_complete(run_id: str):
    run = complete_run(run_id)
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
