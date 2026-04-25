"""Central config loaded from env vars."""
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    anthropic_api_key: str | None = None
    openai_api_key: str | None = None
    llm_provider: str = "anthropic"

    supabase_url: str | None = None
    supabase_key: str | None = None

    tavily_api_key: str | None = None

    chroma_path: str = "./data/chroma"
    knowledge_path: str = "./knowledge/internal"
    workflow_store_path: str = "./data/workflows.json"
    feedback_store_path: str = "./data/feedback.json"
    trace_store_path: str = "./data/trace_events.json"

    cors_origins: str = "http://localhost:5173,http://localhost:3000"

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",")]


settings = Settings()
