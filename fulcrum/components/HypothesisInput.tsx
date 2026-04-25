"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, BookOpenText, Sparkles } from "lucide-react";
import { SAMPLE_HYPOTHESES } from "@/lib/samples";
import { KnowledgeUpload } from "@/components/KnowledgeUpload";

interface Props {
  onCompile: (hypothesis: string) => void;
  isCompiling: boolean;
}

export function HypothesisInput({ onCompile, isCompiling }: Props) {
  const [text, setText] = useState("");

  return (
    <div className="relative">
      {/* Big editorial framing */}
      <div className="relative">
        <div className="pointer-events-none absolute -top-2 right-0 font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">
          §01
        </div>
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">
          State the hypothesis
        </p>
        <h2 className="mt-2 font-display text-[34px] leading-[1.05] tracking-tight">
          <span style={{ fontWeight: 500 }}>What experiment</span>{" "}
          <span className="italic" style={{ fontVariationSettings: '"opsz" 144' }}>
            do you want to run?
          </span>
        </h2>
        <p className="mt-3 max-w-[60ch] font-display text-[15px] leading-[1.55] text-ink-soft">
          Describe a specific intervention, a measurable outcome with a threshold,
          and the mechanism you suspect. The compiler will resolve materials,
          budget, timeline, and validation against your lab's existing SOPs and
          authoritative external sources.
        </p>
      </div>

      {/* Input field */}
      <div className="relative mt-7">
        <div className="corner-mark relative border border-ink bg-paper-deep/40">
          <div className="flex items-center justify-between border-b border-ink/20 px-4 py-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">
              Input · plain language
            </span>
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute tabular-nums">
              {text.length.toString().padStart(4, "0")} / 1200
            </span>
          </div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, 1200))}
            placeholder="Replacing sucrose with trehalose as a cryoprotectant in the freezing medium will increase post-thaw viability of HeLa cells by at least 15 percentage points compared to the standard DMSO protocol…"
            rows={6}
            className="w-full resize-none bg-transparent px-5 py-4 font-display text-[16px] leading-[1.55] text-ink placeholder:text-ink-mute/70 focus:outline-none"
            disabled={isCompiling}
          />
        </div>

        {/* Action row */}
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            onClick={() => text.trim() && onCompile(text.trim())}
            disabled={!text.trim() || isCompiling}
            className="group relative flex items-center gap-3 bg-ink px-5 py-3.5 font-mono text-[11px] uppercase tracking-[0.18em] text-paper transition-colors hover:bg-rust disabled:opacity-30"
          >
            {isCompiling ? (
              <>
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inset-0 animate-ping rounded-full bg-paper opacity-60" />
                  <span className="relative h-1.5 w-1.5 rounded-full bg-paper" />
                </span>
                Compiling workflow
              </>
            ) : (
              <>
                <Sparkles className="h-3.5 w-3.5" strokeWidth={1.5} />
                Compile experiment plan
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" strokeWidth={1.5} />
              </>
            )}
          </button>

          <div className="ml-auto flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-mute">
            <BookOpenText className="h-3.5 w-3.5" strokeWidth={1.5} />
            Grounded in internal SOPs · Tavily-discovered external sources
          </div>
        </div>
      </div>

      <KnowledgeUpload disabled={isCompiling} />

      {/* Sample hypotheses */}
      <div className="mt-10">
        <div className="flex items-baseline gap-3">
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">
            Or compile a sample hypothesis
          </span>
          <span className="h-px flex-1 bg-rule" />
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {SAMPLE_HYPOTHESES.map((sample, i) => (
            <motion.button
              key={sample.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * i + 0.2, duration: 0.4 }}
              onClick={() => setText(sample.full)}
              disabled={isCompiling}
              className="group relative border border-ink/15 bg-paper/40 p-4 text-left transition-all hover:border-ink hover:bg-paper-deep/40"
            >
              <div className="flex items-baseline justify-between gap-3">
                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-rust">
                  {sample.domain}
                </span>
                <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-ink-mute">
                  Sample · 0{SAMPLE_HYPOTHESES.indexOf(sample) + 1}
                </span>
              </div>
              <h3 className="mt-2 font-display text-[18px] leading-[1.2] tracking-tight">
                {sample.short}
              </h3>
              <p className="mt-2 font-display text-[13px] italic leading-[1.45] text-ink-soft">
                {sample.plain}
              </p>
              <div className="mt-3 flex items-center justify-end gap-1.5 font-mono text-[9px] uppercase tracking-[0.22em] text-ink-mute opacity-0 transition-opacity group-hover:opacity-100">
                Use this <ArrowRight className="h-3 w-3" strokeWidth={1.5} />
              </div>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
}
