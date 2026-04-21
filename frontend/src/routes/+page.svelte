<script>
  import { streamChat, health } from '$lib/api.js';

  let prompt = $state('');
  let response = $state('');
  let loading = $state(false);
  let latency = $state(0);
  let error = $state('');
  let provider = $state('');

  // Check backend on mount
  $effect(() => {
    health()
      .then((h) => (provider = h.provider))
      .catch(() => (error = 'Backend unreachable. Is it running on :8000?'));
  });

  async function submit() {
    if (!prompt.trim() || loading) return;
    loading = true;
    response = '';
    error = '';
    try {
      latency = await streamChat(prompt, (chunk) => {
        response += chunk;
      });
    } catch (e) {
      error = e.message;
    } finally {
      loading = false;
    }
  }

  function onKeydown(e) {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      submit();
    }
  }
</script>

<main class="min-h-screen max-w-3xl mx-auto px-6 py-12">
  <header class="mb-10">
    <h1 class="text-4xl font-bold tracking-tight">Hackathon Project</h1>
    <p class="mt-2 text-zinc-400">
      Solo scaffold. Replace this with your challenge-specific UI Saturday.
    </p>
    <div class="mt-3 flex gap-3 text-xs font-mono text-zinc-500">
      {#if provider}
        <span class="px-2 py-1 rounded bg-zinc-900 border border-zinc-800">
          provider: {provider}
        </span>
      {/if}
      {#if latency > 0}
        <span class="px-2 py-1 rounded bg-zinc-900 border border-zinc-800">
          last: {latency}ms
        </span>
      {/if}
    </div>
  </header>

  <section class="space-y-4">
    <textarea
      bind:value={prompt}
      onkeydown={onKeydown}
      placeholder="Ask anything. Cmd/Ctrl+Enter to submit."
      rows="4"
      class="w-full p-4 rounded-lg bg-zinc-900 border border-zinc-800 focus:border-zinc-600 focus:outline-none font-mono text-sm resize-none"
    ></textarea>

    <button
      onclick={submit}
      disabled={loading || !prompt.trim()}
      class="px-5 py-2.5 rounded-lg bg-zinc-100 text-zinc-950 font-medium hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition"
    >
      {loading ? 'Streaming…' : 'Submit'}
    </button>

    {#if error}
      <div class="p-4 rounded-lg bg-red-950/50 border border-red-900 text-red-200 text-sm">
        {error}
      </div>
    {/if}

    {#if response}
      <div class="p-5 rounded-lg bg-zinc-900 border border-zinc-800 whitespace-pre-wrap">
        {response}
      </div>
    {/if}
  </section>

  <footer class="mt-16 pt-6 border-t border-zinc-900 text-xs text-zinc-600 font-mono">
    SvelteKit + Tailwind · FastAPI backend · Anthropic/OpenAI
  </footer>
</main>
