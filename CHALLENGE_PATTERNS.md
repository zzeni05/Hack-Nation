# Challenge Patterns

Four generic architectures covering ~80% of likely challenges. When challenges drop
Saturday 12:30 PM, map whichever you pick onto one of these and don't invent from scratch.

---

## Pattern A: RAG-over-domain-documents

**Fits challenges like:** financial document analysis (AkashX/HRT style), legal/compliance,
research assistant, "chat with your [X]."

**Stack:**
- Upload or scrape domain docs → chunk → embed → store
- On query: retrieve top-k chunks → stuff into prompt → LLM response
- Show sources in UI (builds trust, looks polished)

**Quantifiable metrics:**
- Retrieval precision/recall on a small eval set you build (20-30 Q&A pairs)
- Latency per query
- Number of docs ingested, token savings vs naive stuffing

**Libraries:** `openai` or `voyage` embeddings, `chromadb` or just numpy cosine sim for a
tiny corpus, `pypdf` for PDF parsing.

**Minimum viable:** 15 docs, 50-word chunks, 5-nearest retrieval, single LLM call. Ship it,
then improve.

---

## Pattern B: Voice-interactive agent

**Fits challenges like:** ElevenLabs sports coach, customer service, accessibility tools,
"talk to your [X]."

**Stack:**
- ElevenLabs TTS for output, Deepgram or ElevenLabs STT for input
- WebSocket or chunked streaming between frontend and backend
- LLM in the middle with a tight system prompt defining the persona

**Quantifiable metrics:**
- Time to first audio token (TTFT)
- Turn latency end-to-end
- WER (word error rate) on a small test set if STT quality matters

**Libraries:** `elevenlabs` SDK, `deepgram-sdk`, browser MediaRecorder API.

**Risk:** voice is harder to demo in a 2-min video than you think. Make sure audio is
captioned on screen so judges watching muted don't miss it.

---

## Pattern C: Real-time data + anomaly detection dashboard

**Fits challenges like:** thermal drone (ThermoTrace-style), IoT monitoring, financial
anomaly, operations dashboards. **This is also Vexum-adjacent** — if a challenge lets you
force-fit it, this is the pattern.

**Stack:**
- Synthetic or sample streaming data (pre-canned JSON replayed at interval)
- Backend detector: LLM-as-judge, or simple statistical baseline (z-score, rolling mean)
- Frontend dashboard with live charts + alert list

**Quantifiable metrics:**
- Precision/recall on labeled anomalies in your synthetic stream
- Detection latency (event time → alert time)
- False positive rate

**Libraries:** `pandas` for data munging, frontend charts via uPlot (tiny) or Chart.js.
`websockets` in FastAPI for live push.

**Strong for Vexum integration:** if the Databricks or World Bank challenge touches
industrial data, environmental monitoring, or utilities, you can bring the regulatory
layer story without rebuilding the whole Policy KG.

---

## Pattern D: Generative output (3D / image / code / design)

**Fits challenges like:** SynthShape jewelry, Natalie Chan's CAD aircraft, "generate a
[X] from a prompt."

**Stack:**
- LLM for intermediate representation (JSON spec, code, scene graph)
- Rendering layer: Three.js in browser, `cadquery` server-side, SVG generation, etc.
- Iteration loop: user can edit the intermediate rep and re-render

**Quantifiable metrics:**
- Generation time per output
- Success rate (parses, renders without error) on an eval set of 20 prompts
- Complexity metrics (vertex count, token count, etc.)

**Libraries:** `three` on frontend, `cadquery` or `trimesh` server-side, `pillow` for image
compositing.

**Risk:** highest technical risk of the four, highest ceiling for "wow factor." Only pick if
you have a clear vision 15 min after challenge reveal.

---

## Decision rule Saturday 12:30 PM

1. Read all challenges. Note which sponsor owns each (Databricks, OpenAI, ElevenLabs, etc.).
2. Map each challenge to a pattern above. If one doesn't map, that challenge is higher risk.
3. Pick the challenge where: (a) a solo dev can ship a demo in 20h, (b) the sponsor matters
   for your resume (Databricks + OpenAI > community sponsors for quant/SWE), (c) the
   quantifiable metric is obvious.
4. Write down your 20-hour scope **on paper** before touching code. Include what you're
   **not** building.
