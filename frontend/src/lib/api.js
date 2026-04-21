// Simple API client. Uses VITE_API_URL env var, falls back to localhost.

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export async function chat(prompt, system = 'You are a helpful assistant.') {
  const res = await fetch(`${API_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, system })
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

/**
 * Stream chat response. Calls onChunk(text) for each SSE chunk.
 * Returns total latency in ms.
 */
export async function streamChat(prompt, onChunk, system = 'You are a helpful assistant.') {
  const start = performance.now();
  const res = await fetch(`${API_URL}/api/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, system })
  });
  if (!res.ok || !res.body) throw new Error(`API error: ${res.status}`);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    // SSE format: events separated by \n\n, data lines start with "data: "
    const events = buffer.split('\n\n');
    buffer = events.pop() || '';
    for (const event of events) {
      for (const line of event.split('\n')) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data) onChunk(data);
        }
      }
    }
  }
  return Math.round(performance.now() - start);
}

export async function health() {
  const res = await fetch(`${API_URL}/health`);
  return res.json();
}
