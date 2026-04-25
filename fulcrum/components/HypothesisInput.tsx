"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, BookOpenText, Search, Sparkles } from "lucide-react";
import { SAMPLE_HYPOTHESES } from "@/lib/samples";
import { KnowledgeUpload } from "@/components/KnowledgeUpload";
import type { RetrievalOptions, RetrievalPreviewEvent, RetrievalPreviewSource } from "@/lib/api";

interface Props {
  onCompile: (hypothesis: string, options: RetrievalOptions) => void;
  onPreviewRetrieval: (
    hypothesis: string,
    options: RetrievalOptions,
    onEvent: (event: RetrievalPreviewEvent) => void
  ) => Promise<RetrievalPreviewSource[]>;
  isCompiling: boolean;
}

export function HypothesisInput({ onCompile, onPreviewRetrieval, isCompiling }: Props) {
  const [text, setText] = useState("");
  const [maxSources, setMaxSources] = useState(12);
  const [maxResultsPerQuery, setMaxResultsPerQuery] = useState(2);
  const [maxQueries, setMaxQueries] = useState(10);
  const [minQualityScore, setMinQualityScore] = useState(0.25);
  const [searchDepth, setSearchDepth] = useState<"basic" | "advanced">("advanced");
  const [previewSources, setPreviewSources] = useState<RetrievalPreviewSource[]>([]);
  const [selectedUrls, setSelectedUrls] = useState<Set<string>>(new Set());
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [previewEvents, setPreviewEvents] = useState<RetrievalPreviewEvent[]>([]);

  const retrievalOptions: RetrievalOptions = {
    maxSources,
    maxResultsPerQuery,
    maxQueries,
    minQualityScore,
    searchDepth,
    selectedExternalUrls: selectedUrls.size ? Array.from(selectedUrls) : undefined,
  };

  async function preview() {
    if (!text.trim() || isPreviewing) return;
    setIsPreviewing(true);
    setPreviewEvents([]);
    try {
      const sources = await onPreviewRetrieval(text.trim(), retrievalOptions, (event) => {
        setPreviewEvents((events) => [...events.slice(-30), event]);
      });
      setPreviewSources(sources);
      setSelectedUrls(new Set(sources.filter((s) => s.candidate_role === "protocol_candidate").map((s) => s.url)));
    } finally {
      setIsPreviewing(false);
    }
  }

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
            onClick={() => text.trim() && onCompile(text.trim(), retrievalOptions)}
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
          <button
            onClick={preview}
            disabled={!text.trim() || isCompiling || isPreviewing}
            className="inline-flex items-center gap-2 border border-ink/30 px-4 py-3.5 font-mono text-[11px] uppercase tracking-[0.18em] text-ink transition-colors hover:border-rust hover:text-rust disabled:opacity-30"
          >
            <Search className="h-3.5 w-3.5" strokeWidth={1.5} />
            {isPreviewing ? "Previewing sources" : "Preview retrieval"}
          </button>

          <div className="ml-auto flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-mute">
            <BookOpenText className="h-3.5 w-3.5" strokeWidth={1.5} />
            Grounded in internal SOPs · Tavily-discovered external sources
          </div>
        </div>
      </div>

      <KnowledgeUpload disabled={isCompiling} />

      <div className="mt-5 border border-ink/20 bg-paper-deep/20 p-4">
        <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">
          External retrieval config
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-5">
          <NumberControl label="Sources" value={maxSources} min={1} max={40} onChange={setMaxSources} />
          <NumberControl label="Queries" value={maxQueries} min={1} max={10} onChange={setMaxQueries} />
          <NumberControl label="Per query" value={maxResultsPerQuery} min={1} max={8} onChange={setMaxResultsPerQuery} />
          <NumberControl label="Min quality" value={Math.round(minQualityScore * 100)} min={0} max={90} onChange={(v) => setMinQualityScore(v / 100)} />
          <label className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-mute">
            Depth
            <select
              value={searchDepth}
              onChange={(event) => setSearchDepth(event.target.value as "basic" | "advanced")}
              className="mt-1 w-full border border-ink/20 bg-paper px-2 py-2 text-ink"
            >
              <option value="advanced">Advanced</option>
              <option value="basic">Basic</option>
            </select>
          </label>
        </div>
        {previewSources.length > 0 && (
          <div className="mt-4 max-h-[300px] overflow-auto border-t border-rule pt-3">
            <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-mute">
              Review sources · {selectedUrls.size} selected for compile
            </div>
            <div className="space-y-2">
              {previewSources.map((source) => (
                <label key={source.url} className="grid cursor-pointer grid-cols-[20px_1fr_70px] gap-2 border border-ink/10 bg-paper/40 p-2">
                  <input
                    type="checkbox"
                    checked={selectedUrls.has(source.url)}
                    onChange={(event) => {
                      const next = new Set(selectedUrls);
                      if (event.target.checked) next.add(source.url);
                      else next.delete(source.url);
                      setSelectedUrls(next);
                    }}
                  />
                  <span>
                    <span className="block font-display text-[13px] leading-tight">{source.title}</span>
                    <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-ink-mute">
                      {source.domain} · {source.candidate_role} · {source.quality_reasons.slice(0, 2).join("; ")}
                    </span>
                  </span>
                  <span className="text-right font-mono text-[10px] tabular-nums text-rust">
                    {Math.round(source.quality_score * 100)}%
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}
        {isPreviewing && (
          <div className="mt-4 border-t border-rule pt-3">
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-rust">
              Live retrieval
            </div>
            <div className="mt-2 space-y-1">
              {previewEvents.filter((event) => event.type !== "heartbeat").slice(-6).map((event, i) => (
                <div key={i} className="grid grid-cols-[18px_1fr_auto] gap-2 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-mute">
                  <span className="mt-1 h-1.5 w-1.5 animate-pulse rounded-full bg-rust" />
                  <span>{event.type === "progress" ? event.message : event.type}</span>
                  {event.type === "progress" && event.current && event.total && (
                    <span>{event.current}/{event.total}</span>
                  )}
                </div>
              ))}
              {previewEvents.some((event) => event.type === "heartbeat") && (
                <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-mute">
                  Waiting on Tavily response...
                </div>
              )}
            </div>
          </div>
        )}
      </div>

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

function NumberControl({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-mute">
      {label}
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        onChange={(event) => onChange(Math.max(min, Math.min(max, Number(event.target.value))))}
        className="mt-1 w-full border border-ink/20 bg-paper px-2 py-2 text-ink"
      />
    </label>
  );
}
