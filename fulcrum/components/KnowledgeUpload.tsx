"use client";

import { useRef, useState } from "react";
import { FileUp, Loader2 } from "lucide-react";
import { uploadKnowledgeFiles } from "@/lib/api";

type IngestStats = {
  documents_ingested: number;
  chunks_created: number;
  stats: {
    chunks: number;
    sources: number;
    internal_chunks: number;
    external_chunks: number;
  };
};

export function KnowledgeUpload({ disabled = false }: { disabled?: boolean }) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [lastResult, setLastResult] = useState<IngestStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function uploadSelected() {
    if (selectedFiles.length === 0 || isUploading) return;
    setIsUploading(true);
    setError(null);
    try {
      const result = await uploadKnowledgeFiles(selectedFiles);
      setLastResult(result);
      setSelectedFiles([]);
      if (inputRef.current) inputRef.current.value = "";
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="mt-7 border border-ink/20 bg-paper-deep/25">
      <div className="flex items-center justify-between border-b border-ink/20 px-4 py-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">
          Lab context · SOPs / runbooks / facility docs
        </span>
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-mute">
          Local RAG memory
        </span>
      </div>

      <div className="grid gap-4 p-4 lg:grid-cols-[1fr_auto]">
        <div>
          <button
            type="button"
            disabled={disabled || isUploading}
            onClick={() => inputRef.current?.click()}
            className="flex w-full items-center justify-between border border-dashed border-ink/30 bg-paper/50 px-4 py-4 text-left transition-colors hover:border-ink disabled:opacity-40"
          >
            <span>
              <span className="block font-display text-[16px] leading-tight tracking-tight">
                Upload internal SOPs, runbooks, prior runs, or equipment notes
              </span>
              <span className="mt-1 block font-display text-[13px] leading-[1.45] text-ink-soft">
                Markdown, text, and JSON files are read locally in the browser, stored as uploaded protocol candidates, chunked, and embedded.
              </span>
            </span>
            <FileUp className="ml-4 h-5 w-5 shrink-0 text-rust" strokeWidth={1.5} />
          </button>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept=".md,.txt,.json,.csv"
            className="hidden"
            onChange={(e) => setSelectedFiles(Array.from(e.target.files ?? []))}
          />

          {selectedFiles.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {selectedFiles.map((file) => (
                <span
                  key={file.name}
                  className="border border-ink/20 px-2 py-1 font-mono text-[10px] text-ink-soft"
                >
                  {file.name}
                </span>
              ))}
            </div>
          )}

          {error && (
            <p className="mt-3 border-l-2 border-rust pl-3 font-display text-[13px] leading-[1.45] text-rust">
              {error}
            </p>
          )}

          {lastResult && (
            <div className="mt-3 flex flex-wrap gap-3 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-mute">
              <span>{lastResult.documents_ingested} docs</span>
              <span>{lastResult.chunks_created} new chunks</span>
              <span>{lastResult.stats.chunks} total chunks</span>
              <span>{lastResult.stats.sources} sources indexed</span>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <button
            type="button"
            disabled={disabled || isUploading || selectedFiles.length === 0}
            onClick={uploadSelected}
            className="inline-flex items-center justify-center gap-2 bg-ink px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.18em] text-paper transition-colors hover:bg-rust disabled:opacity-30"
          >
            {isUploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileUp className="h-3.5 w-3.5" />}
            Embed uploads
          </button>
        </div>
      </div>
    </div>
  );
}
