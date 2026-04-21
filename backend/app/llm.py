"""LLM abstraction: call Anthropic or OpenAI with the same interface."""
from collections.abc import AsyncIterator

from anthropic import AsyncAnthropic
from openai import AsyncOpenAI

from app.config import settings

_anthropic: AsyncAnthropic | None = None
_openai: AsyncOpenAI | None = None


def get_anthropic() -> AsyncAnthropic:
    global _anthropic
    if _anthropic is None:
        if not settings.anthropic_api_key:
            raise RuntimeError("ANTHROPIC_API_KEY not set")
        _anthropic = AsyncAnthropic(api_key=settings.anthropic_api_key)
    return _anthropic


def get_openai() -> AsyncOpenAI:
    global _openai
    if _openai is None:
        if not settings.openai_api_key:
            raise RuntimeError("OPENAI_API_KEY not set")
        _openai = AsyncOpenAI(api_key=settings.openai_api_key)
    return _openai


async def complete(
    prompt: str,
    system: str = "You are a helpful assistant.",
    provider: str | None = None,
    max_tokens: int = 1024,
) -> str:
    """Non-streaming completion. Returns the full response text."""
    provider = provider or settings.llm_provider

    if provider == "anthropic":
        client = get_anthropic()
        resp = await client.messages.create(
            model="claude-sonnet-4-5",
            max_tokens=max_tokens,
            system=system,
            messages=[{"role": "user", "content": prompt}],
        )
        return resp.content[0].text

    elif provider == "openai":
        client = get_openai()
        resp = await client.chat.completions.create(
            model="gpt-4o",
            max_tokens=max_tokens,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": prompt},
            ],
        )
        return resp.choices[0].message.content or ""

    raise ValueError(f"Unknown provider: {provider}")


async def stream(
    prompt: str,
    system: str = "You are a helpful assistant.",
    provider: str | None = None,
    max_tokens: int = 1024,
) -> AsyncIterator[str]:
    """Streaming completion. Yields text chunks."""
    provider = provider or settings.llm_provider

    if provider == "anthropic":
        client = get_anthropic()
        async with client.messages.stream(
            model="claude-sonnet-4-5",
            max_tokens=max_tokens,
            system=system,
            messages=[{"role": "user", "content": prompt}],
        ) as s:
            async for text in s.text_stream:
                yield text

    elif provider == "openai":
        client = get_openai()
        s = await client.chat.completions.create(
            model="gpt-4o",
            max_tokens=max_tokens,
            stream=True,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": prompt},
            ],
        )
        async for chunk in s:
            delta = chunk.choices[0].delta.content
            if delta:
                yield delta

    else:
        raise ValueError(f"Unknown provider: {provider}")
