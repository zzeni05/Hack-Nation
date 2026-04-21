# Hackathon Scaffold

Solo-builder scaffold for Hack-Nation Global AI Hackathon (Apr 25-26, 2026).

**Stack:** SvelteKit + Tailwind (frontend) | FastAPI + Python 3.12 (backend) | Anthropic + OpenAI SDKs | Supabase (optional)

## Quick start

```bash
# Backend
cd backend
uv sync
cp .env.example .env  # fill in API keys
uv run uvicorn app.main:app --reload --port 8000

# Frontend (new terminal)
cd frontend
pnpm install
cp .env.example .env  # set VITE_API_URL (defaults to localhost:8000)
pnpm dev
```

Frontend at http://localhost:5173, backend at http://localhost:8000.

## Deploy

- **Frontend:** Vercel — `cd frontend && vercel` (first time) then push to main auto-deploys
- **Backend:** Render — push to main, Render auto-deploys from `render.yaml`

## Hackathon workflow

1. Saturday 12:30 PM ET: challenges revealed
2. Saturday 1 PM: pick challenge, fork this repo, rename, start building
3. Update `README.md` with your project name, problem statement, and **metrics section** (what makes it quantifiable)
4. Keep core loop tight: one happy path working end-to-end before adding features
5. Sunday 7 AM: record demo video using `DEMO_SCRIPT.md` template
6. Sunday 9 AM: submit

## Files you'll edit most

- `backend/app/main.py` — API routes
- `backend/app/llm.py` — LLM calls (Anthropic/OpenAI)
- `frontend/src/routes/+page.svelte` — main UI
- `README.md` — the artifact recruiters will read

## Reference docs

- `CHALLENGE_PATTERNS.md` — four generic architectures; map the challenge onto one
- `DEMO_SCRIPT.md` — video recording template for Sunday morning
