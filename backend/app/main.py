"""FastAPI entrypoint."""
import time

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sse_starlette.sse import EventSourceResponse

from app.config import settings
from app.llm import complete, stream

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
    return {"status": "ok", "provider": settings.llm_provider}


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
