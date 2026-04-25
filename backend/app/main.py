"""FastAPI entrypoint."""
import time
from datetime import UTC, datetime
from uuid import uuid4

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sse_starlette.sse import EventSourceResponse

from app.config import settings
from app.compiler import commit_decision as compile_committed_decision
from app.compiler import compile_workflow, extract_structured_intent
from app.knowledge import (
    ingest_external_sources,
    ingest_internal_knowledge,
    ingest_uploaded_documents,
    retrieve_context,
)
from app.llm import complete, stream
from app.sop_improvement import generate_sop_recommendations
from app.store import append_feedback, get_workflow, relevant_feedback, save_workflow
from app.tavily_search import discover_external_sources, generate_tavily_queries
from app.vector_store import stats as vector_stats

app = FastAPI(title="Hackathon Backend", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    return {"status": "ok", "provider": settings.llm_provider, "vector_stats": vector_stats()}


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


@app.post("/api/knowledge/ingest-internal")
async def knowledge_ingest_internal():
    return ingest_internal_knowledge()


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
    if not req.hypothesis.strip():
        raise HTTPException(status_code=400, detail="Hypothesis is required")
    ingest_internal_knowledge()
    structured_intent = extract_structured_intent(req.hypothesis)
    external_ingest_result = None
    external_source_count = 0
    if req.use_external_retrieval:
        external_sources = await discover_external_sources(structured_intent)
        external_source_count = len(external_sources)
        external_ingest_result = ingest_external_sources(
            external_sources,
            structured_intent.get("experiment_type", "unknown"),
        )
    context = retrieve_context(req.hypothesis)
    feedback = relevant_feedback(
        structured_intent.get("experiment_type", "unknown"),
        req.hypothesis,
    )
    workflow = compile_workflow(
        req.hypothesis,
        context,
        prior_feedback=feedback,
        sop_recommendations=generate_sop_recommendations(),
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
    save_workflow(workflow)
    return {"workflow": workflow}


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
    updated = compile_committed_decision(
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


@app.get("/api/workflows/{workflow_id}/trace")
async def workflows_trace(workflow_id: str):
    workflow = get_workflow(workflow_id)
    if workflow is None:
        raise HTTPException(status_code=404, detail="Workflow not found")
    return {"trace": workflow["trace"]}


@app.get("/api/sop-improvements")
async def sop_improvements():
    return {"recommendations": generate_sop_recommendations()}
