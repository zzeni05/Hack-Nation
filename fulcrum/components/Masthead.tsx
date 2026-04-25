"use client";

export function Masthead() {
  return (
    <header className="relative z-10 border-b border-ink">
      <div className="mx-auto flex max-w-[1480px] items-end justify-between px-8 pt-6 pb-4">
        <div>
          <div className="flex items-baseline gap-3">
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">
              Vol. 01 · Iss. 04
            </span>
            <span className="h-px w-8 bg-ink-mute" />
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">
              MIT × Fulcrum Science
            </span>
          </div>
          <h1 className="mt-3 font-display text-[44px] leading-[0.92] tracking-tight text-ink">
            <span className="italic" style={{ fontVariationSettings: '"opsz" 144, "SOFT" 100' }}>
              The
            </span>{" "}
            <span style={{ fontWeight: 600, fontVariationSettings: '"opsz" 144' }}>
              AI Scientist
            </span>
          </h1>
        </div>
        <div className="hidden text-right md:block">
          <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">
            From hypothesis to runnable experiment plan
          </div>
          <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">
            <span className="text-ink">Compiled live</span> · {" "}
            <time>{new Date().toLocaleDateString("en-US", { year: "numeric", month: "short", day: "2-digit" })}</time>
          </div>
        </div>
      </div>
      <div className="border-t border-ink/30">
        <div className="mx-auto flex max-w-[1480px] items-center gap-6 px-8 py-2 font-mono text-[10px] uppercase tracking-[0.22em] text-ink-soft">
          <span>§01 Hypothesis</span>
          <span className="text-ink-mute">→</span>
          <span>§02 Literature QC</span>
          <span className="text-ink-mute">→</span>
          <span>§03 SOP Match</span>
          <span className="text-ink-mute">→</span>
          <span>§04 Workflow</span>
          <span className="text-ink-mute">→</span>
          <span>§05 Plan</span>
          <span className="text-ink-mute">→</span>
          <span>§06 Trace</span>
          <span className="ml-auto flex items-center gap-2 text-rust">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inset-0 animate-ping rounded-full bg-rust opacity-60" />
              <span className="relative h-1.5 w-1.5 rounded-full bg-rust" />
            </span>
            Engine online
          </span>
        </div>
      </div>
    </header>
  );
}
