"use client";

import { useState } from "react";
import type { ExecutionRun, Workflow } from "@/types";
import {
  compileWorkflowStream,
  addRunStepAttachment,
  commitDecision,
  completeExecutionRun,
  completeRunStep,
  createExecutionRun,
  modifyStep,
  saveRunStepNotes,
  startRunStep,
  submitFeedback,
  previewRetrievalStream,
  updateWorkflowPlan,
  type CompileProgressEvent,
} from "@/lib/api";
import type { RetrievalOptions, RetrievalPreviewEvent, RetrievalPreviewSource } from "@/lib/api";
import { SAMPLE_HYPOTHESES } from "@/lib/samples";
import { Masthead } from "@/components/Masthead";
import { CompilingOverlay } from "@/components/CompilingOverlay";
import { LiteratureQC } from "@/components/LiteratureQC";
import { SopMatchPanel } from "@/components/SopMatchPanel";
import { IntentCard } from "@/components/IntentCard";
import { WorkflowSummary } from "@/components/WorkflowSummary";
import { WorkflowStepper } from "@/components/WorkflowStepper";
import { StepInspector } from "@/components/StepInspector";
import { PlanTabs } from "@/components/PlanTabs";
import { ExecutionTrace, SopImprovementPanel } from "@/components/Trace";
import { ExecutionWorkspace } from "@/components/ExecutionWorkspace";
import { KnowledgeUpload } from "@/components/KnowledgeUpload";
import { GuidedShell, StageHeader, type AppStage, type StageItem } from "@/components/guided/GuidedShell";
import { ArrowRight, BookOpenText, RefreshCw, Search, Sparkles } from "lucide-react";

export default function Home() {
  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [isCompiling, setIsCompiling] = useState(false);
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [compileEvents, setCompileEvents] = useState<CompileProgressEvent[]>([]);
  const [executionRun, setExecutionRun] = useState<ExecutionRun | null>(null);
  const [stage, setStage] = useState<AppStage>("lab_context");
  const [hypothesisDraft, setHypothesisDraft] = useState("");
  const [retrievalOptions, setRetrievalOptions] = useState<RetrievalOptions>({
    maxSources: 12,
    maxResultsPerQuery: 2,
    maxQueries: 10,
    minQualityScore: 0.25,
    searchDepth: "advanced",
  });
  const [retrievalSources, setRetrievalSources] = useState<RetrievalPreviewSource[]>([]);
  const [selectedSourceUrls, setSelectedSourceUrls] = useState<Set<string>>(new Set());
  const [retrievalEvents, setRetrievalEvents] = useState<RetrievalPreviewEvent[]>([]);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [executionStepId, setExecutionStepId] = useState<string | null>(null);

  const selectedStep =
    workflow?.steps.find((s) => s.step_id === selectedStepId) ?? null;

  const selectedRetrievalOptions: RetrievalOptions = {
    ...retrievalOptions,
    selectedExternalUrls: selectedSourceUrls.size ? Array.from(selectedSourceUrls) : undefined,
  };

  async function handleCompile(hypothesis: string, retrieval: RetrievalOptions) {
    setIsCompiling(true);
    setSelectedStepId(null);
    setError(null);
    setCompileEvents([]);
    try {
      const wf = await compileWorkflowStream(hypothesis, {
        useExternalRetrieval: true,
        retrieval,
        onEvent: (event) => setCompileEvents((events) => [...events.slice(-80), event]),
      });
      setWorkflow(wf);
      setExecutionRun(null);
      setStage("protocol_basis");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Workflow compilation failed");
    } finally {
      setIsCompiling(false);
    }
  }

  async function handlePreviewRetrieval() {
    if (!hypothesisDraft.trim() || isPreviewing) return;
    setIsPreviewing(true);
    setError(null);
    setRetrievalEvents([]);
    try {
      const result = await previewRetrievalStream(hypothesisDraft.trim(), retrievalOptions, (event) => {
        setRetrievalEvents((events) => [...events.slice(-60), event]);
      });
      setRetrievalSources(result.sources);
      setSelectedSourceUrls(
        new Set(
          result.sources
            .filter((source) => source.candidate_role === "protocol_candidate")
            .map((source) => source.url)
        )
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Retrieval preview failed");
    } finally {
      setIsPreviewing(false);
    }
  }

  async function handleCommitDecision(
    stepId: string,
    optionId: string,
    note: string
  ) {
    if (!workflow) return;
    const result = await commitDecision(workflow.workflow_id, stepId, optionId, note);
    setWorkflow(result.workflow);
    setSelectedStepId(null);
  }

  async function handleModifyStep(stepId: string, instructions: string[], note: string) {
    if (!workflow) return;
    const result = await modifyStep(workflow.workflow_id, stepId, instructions, note);
    setWorkflow(result.workflow);
  }

  async function handleSubmitFeedback(
    stepId: string,
    section: string,
    rating: number,
    correction: string,
    reason: string
  ) {
    if (!workflow) return;
    const result = await submitFeedback(
      workflow.workflow_id,
      stepId,
      section,
      rating,
      correction,
      reason
    );
    setWorkflow(result.workflow);
  }

  async function handleUpdatePlan(plan: Workflow["plan"], note?: string) {
    if (!workflow) return;
    const result = await updateWorkflowPlan(workflow.workflow_id, plan, note);
    setWorkflow(result.workflow);
  }

  function handleReset() {
    setWorkflow(null);
    setSelectedStepId(null);
    setExecutionRun(null);
    setExecutionStepId(null);
    setStage("lab_context");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleCreateRun() {
    if (!workflow) return;
    const run = await createExecutionRun(workflow.workflow_id);
    setExecutionRun(run);
    setExecutionStepId(run.current_step_id ?? run.steps[0]?.step_id ?? null);
    setStage("execute");
  }

  async function handleStartRunStep(stepId: string) {
    if (!executionRun) return;
    setExecutionRun(await startRunStep(executionRun.run_id, stepId));
  }

  async function handleSaveRunStep(
    stepId: string,
    operatorNote: string,
    deviationNote: string,
    actuals: Record<string, unknown>
  ) {
    if (!executionRun) return;
    setExecutionRun(await saveRunStepNotes(executionRun.run_id, stepId, { operatorNote, deviationNote, actuals }));
  }

  async function handleCompleteRunStep(
    stepId: string,
    operatorNote: string,
    deviationNote: string,
    actuals: Record<string, unknown>
  ) {
    if (!executionRun) return;
    setExecutionRun(await completeRunStep(executionRun.run_id, stepId, { operatorNote, deviationNote, actuals }));
  }

  async function handleAddRunAttachment(stepId: string, filename: string, note: string, contentType?: string) {
    if (!executionRun) return;
    setExecutionRun(await addRunStepAttachment(executionRun.run_id, stepId, { filename, note, contentType }));
  }

  async function handleCompleteRun() {
    if (!executionRun) return;
    setExecutionRun(await completeExecutionRun(executionRun.run_id));
    setStage("review");
  }

  const stages = buildStages(
    stage,
    workflow,
    executionRun,
    hypothesisDraft.trim().length > 0,
    retrievalSources.length
  );

  return (
    <main className="relative min-h-screen">
      <CompilingOverlay visible={isCompiling} events={compileEvents} />

      <Masthead />
      <GuidedShell stages={stages} activeStage={stage} onStageChange={setStage}>
        <StageActions workflow={workflow} onReset={handleReset} />

        {stage === "lab_context" && (
          <LabContextStage onContinue={() => setStage("hypothesis")} />
        )}

        {stage === "hypothesis" && (
          <HypothesisStage
            value={hypothesisDraft}
            onChange={setHypothesisDraft}
            error={error}
            isCompiling={isCompiling}
            onContinue={() => setStage("retrieval")}
          />
        )}

        {stage === "retrieval" && (
          <RetrievalStage
            hypothesis={hypothesisDraft}
            options={retrievalOptions}
            onOptionsChange={setRetrievalOptions}
            sources={retrievalSources}
            selectedUrls={selectedSourceUrls}
            onSelectedUrlsChange={setSelectedSourceUrls}
            events={retrievalEvents}
            error={error}
            isPreviewing={isPreviewing}
            isCompiling={isCompiling}
            onPreview={handlePreviewRetrieval}
            onCompile={() => handleCompile(hypothesisDraft.trim(), selectedRetrievalOptions)}
            onBack={() => setStage("hypothesis")}
          />
        )}

        {stage === "protocol_basis" && workflow && (
          <ProtocolBasisStage workflow={workflow} onContinue={() => setStage("workflow_setup")} onBack={() => setStage("retrieval")} />
        )}

        {stage === "workflow_setup" && workflow && (
          <WorkflowSetupStage
            workflow={workflow}
            selectedStepId={selectedStepId}
            onSelectStep={setSelectedStepId}
            onStartRun={handleCreateRun}
            onUpdatePlan={handleUpdatePlan}
          />
        )}

        {stage === "execute" && workflow && (
          <ExecuteStage
            workflow={workflow}
            executionRun={executionRun}
            onCreateRun={handleCreateRun}
            onStartStep={handleStartRunStep}
            onSaveStep={handleSaveRunStep}
            onCompleteStep={handleCompleteRunStep}
            onAddAttachment={handleAddRunAttachment}
            onCompleteRun={handleCompleteRun}
            activeStepId={executionStepId}
            onActiveStepChange={setExecutionStepId}
          />
        )}

        {stage === "review" && workflow && (
          <ReviewStage workflow={workflow} executionRun={executionRun} />
        )}
      </GuidedShell>

      {/* Step inspector drawer */}
      <StepInspector
        step={selectedStep}
        onClose={() => setSelectedStepId(null)}
        onCommitDecision={handleCommitDecision}
        onModifyStep={handleModifyStep}
        onSubmitFeedback={handleSubmitFeedback}
      />

      {/* Empty-state footer when no workflow */}
      {!workflow && !isCompiling && (
        <footer className="relative border-t border-ink bg-paper py-6">
          <div className="mx-auto flex max-w-[1480px] flex-wrap items-center justify-between gap-3 px-8 font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">
            <span>Challenge 04 · The AI Scientist</span>
            <span>Powered by Fulcrum Science</span>
          </div>
        </footer>
      )}
    </main>
  );
}

function buildStages(
  activeStage: AppStage,
  workflow: Workflow | null,
  executionRun: ExecutionRun | null,
  hasHypothesis: boolean,
  retrievalSourceCount: number
): StageItem[] {
  const hasWorkflow = Boolean(workflow);
  const hasRun = Boolean(executionRun);
  const completedRun = executionRun?.status === "completed";
  const stage = (
    id: AppStage,
    number: string,
    label: string,
    eyebrow: string,
    locked: boolean,
    complete: boolean,
    note?: string
  ): StageItem => ({
    id,
    number,
    label,
    eyebrow,
    note,
    status: locked ? "locked" : activeStage === id ? "active" : complete ? "complete" : "available",
  });

  return [
    stage("lab_context", "01", "Lab context", "Uploads", false, hasWorkflow, "SOPs, runbooks, prior runs"),
    stage("hypothesis", "02", "Hypothesis", "Intent", false, hasWorkflow, "Structured experiment input"),
    stage("retrieval", "03", "Retrieval review", "Sources", !hasHypothesis && !hasWorkflow, hasWorkflow, retrievalSourceCount ? `${retrievalSourceCount} sources previewed` : "Tavily config and source selection"),
    stage("protocol_basis", "04", "Protocol basis", "Evidence", !hasWorkflow, hasWorkflow, workflow?.protocol_basis?.basis_label),
    stage("workflow_setup", "05", "Workflow setup", "Plan", !hasWorkflow, hasRun, workflow ? `${workflow.steps.length} steps` : undefined),
    stage("execute", "06", "Execute run", "Runbook", !hasWorkflow, completedRun, hasRun ? executionRun?.status : "start run"),
    stage("review", "07", "Review", "Memory", !hasWorkflow, completedRun, "Trace and SOP signals"),
  ];
}

function StageActions({ workflow, onReset }: { workflow: Workflow | null; onReset: () => void }) {
  if (!workflow) return null;
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4 border-b border-ink pb-4">
      <div className="max-w-[78ch]">
        <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">
          Compiled workflow · {workflow.workflow_id}
        </div>
        <p className="mt-1.5 font-display text-[19px] leading-[1.35] italic tracking-tight">
          "{workflow.hypothesis}"
        </p>
      </div>
      <button
        onClick={onReset}
        className="inline-flex items-center gap-2 border border-ink/30 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-soft transition-colors hover:border-ink hover:text-ink"
      >
        <RefreshCw className="h-3 w-3" strokeWidth={1.5} />
        New hypothesis
      </button>
    </div>
  );
}

function LabContextStage({ onContinue }: { onContinue: () => void }) {
  return (
    <div>
      <StageHeader number="01" eyebrow="Lab context" title="Upload the operational reality first.">
        Add SOPs, runbooks, equipment manuals, facility constraints, and prior run notes. You can skip this and compile from external sources, but internal uploads become first-class protocol candidates.
      </StageHeader>
      <div className="grid gap-8 xl:grid-cols-[1fr_360px]">
        <div>
          <KnowledgeUpload />
          <button
            onClick={onContinue}
            className="mt-5 inline-flex items-center gap-2 bg-ink px-5 py-3 font-mono text-[10px] uppercase tracking-[0.18em] text-paper transition-colors hover:bg-rust"
          >
            Continue to hypothesis <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
        <aside className="border-l border-ink/15 pl-6">
          <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">
            What counts as context
          </div>
          <ul className="mt-3 space-y-3 font-display text-[14px] leading-[1.45] text-ink-soft">
            <li>Internal SOPs and runbooks become reusable protocol candidates.</li>
            <li>Prior runs become memory for future estimates, deviations, and SOP improvement signals.</li>
            <li>Facility notes can constrain execution and scheduling.</li>
          </ul>
        </aside>
      </div>
    </div>
  );
}

function HypothesisStage({
  value,
  onChange,
  error,
  isCompiling,
  onContinue,
}: {
  value: string;
  onChange: (value: string) => void;
  error: string | null;
  isCompiling: boolean;
  onContinue: () => void;
}) {
  return (
    <div className="grid gap-10 xl:grid-cols-[1fr_360px]">
      <div>
        <StageHeader number="02" eyebrow="Hypothesis" title="State the experiment you want to run.">
          Describe the model system, intervention, comparator, outcome, threshold, and mechanism. Retrieval and source selection happen in the next stage.
        </StageHeader>
        <div className="corner-mark relative border border-ink bg-paper-deep/40">
          <div className="flex items-center justify-between border-b border-ink/20 px-4 py-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">
              Input · plain language
            </span>
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute tabular-nums">
              {value.length.toString().padStart(4, "0")} / 1200
            </span>
          </div>
          <textarea
            value={value}
            onChange={(event) => onChange(event.target.value.slice(0, 1200))}
            placeholder="Replacing sucrose with trehalose as a cryoprotectant in the freezing medium will increase post-thaw viability of HeLa cells by at least 15 percentage points compared to the standard DMSO protocol..."
            rows={8}
            className="w-full resize-none bg-transparent px-5 py-4 font-display text-[16px] leading-[1.55] text-ink placeholder:text-ink-mute/70 focus:outline-none"
            disabled={isCompiling}
          />
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            onClick={onContinue}
            disabled={!value.trim() || isCompiling}
            className="inline-flex items-center gap-2 bg-ink px-5 py-3 font-mono text-[10px] uppercase tracking-[0.18em] text-paper transition-colors hover:bg-rust disabled:opacity-30"
          >
            Continue to retrieval <ArrowRight className="h-3.5 w-3.5" />
          </button>
          <div className="ml-auto flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-mute">
            <BookOpenText className="h-3.5 w-3.5" strokeWidth={1.5} />
            Internal SOPs first · external protocols second
          </div>
        </div>
        {error && (
          <div className="mt-4 border-l-2 border-rust pl-3 font-display text-[14px] leading-[1.5] text-rust">
            {error}
          </div>
        )}
        <div className="mt-10">
          <div className="flex items-baseline gap-3">
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">
              Or start from a sample hypothesis
            </span>
            <span className="h-px flex-1 bg-rule" />
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {SAMPLE_HYPOTHESES.map((sample) => (
              <button
                key={sample.id}
                onClick={() => onChange(sample.full)}
                disabled={isCompiling}
                className="group relative border border-ink/15 bg-paper/40 p-4 text-left transition-all hover:border-ink hover:bg-paper-deep/40 disabled:opacity-40"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-rust">
                    {sample.domain}
                  </span>
                  <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-ink-mute">
                    Sample
                  </span>
                </div>
                <h3 className="mt-2 font-display text-[18px] leading-[1.2] tracking-tight">
                  {sample.short}
                </h3>
                <p className="mt-2 font-display text-[13px] italic leading-[1.45] text-ink-soft">
                  {sample.plain}
                </p>
              </button>
            ))}
          </div>
        </div>
      </div>
      <aside className="border-l border-ink/15 pl-6">
        <IntentPrepCard />
      </aside>
    </div>
  );
}

function IntentPrepCard() {
  return (
    <div className="space-y-5">
      <section className="border border-ink/20 bg-paper-deep/30 p-4">
        <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">
          What the compiler extracts
        </div>
        <ul className="mt-3 space-y-2 font-display text-[14px] leading-[1.45] text-ink-soft">
          <li>Model system, intervention, comparator, outcome, and threshold.</li>
          <li>Likely assay families and controls.</li>
          <li>Operational keywords used to retrieve SOPs, protocols, supplier docs, and QC references.</li>
        </ul>
      </section>
      <section className="border border-moss/30 bg-moss/5 p-4">
        <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-moss">
          Grounding rule
        </div>
        <p className="mt-2 font-display text-[13px] leading-[1.45] text-ink-soft">
          The compiler should reuse uploaded SOPs when they fit, then pull external procedures as protocol candidates. Unsupported sections become gaps or decision points.
        </p>
      </section>
    </div>
  );
}

function RetrievalStage({
  hypothesis,
  options,
  onOptionsChange,
  sources,
  selectedUrls,
  onSelectedUrlsChange,
  events,
  error,
  isPreviewing,
  isCompiling,
  onPreview,
  onCompile,
  onBack,
}: {
  hypothesis: string;
  options: RetrievalOptions;
  onOptionsChange: (options: RetrievalOptions) => void;
  sources: RetrievalPreviewSource[];
  selectedUrls: Set<string>;
  onSelectedUrlsChange: (urls: Set<string>) => void;
  events: RetrievalPreviewEvent[];
  error: string | null;
  isPreviewing: boolean;
  isCompiling: boolean;
  onPreview: () => Promise<void>;
  onCompile: () => void;
  onBack: () => void;
}) {
  const protocolCount = sources.filter((source) => source.candidate_role === "protocol_candidate").length;
  const evidenceCount = sources.length - protocolCount;

  function updateOptions(next: Partial<RetrievalOptions>) {
    onOptionsChange({ ...options, ...next });
  }

  function toggleSource(url: string, checked: boolean) {
    const next = new Set(selectedUrls);
    if (checked) next.add(url);
    else next.delete(url);
    onSelectedUrlsChange(next);
  }

  return (
    <div>
      <StageHeader number="03" eyebrow="Retrieval" title="Preview, tune, and select the protocol basis.">
        Run Tavily discovery separately from compilation so source count, search depth, quality threshold, and selected references are visible before the workflow is compiled.
      </StageHeader>
      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-6">
          <section className="border border-ink/20 bg-paper-deep/30 p-4">
            <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">
              Hypothesis being searched
            </div>
            <p className="mt-2 font-display text-[17px] italic leading-[1.4] tracking-tight">
              "{hypothesis}"
            </p>
            <button
              onClick={onBack}
              className="mt-3 border border-ink/25 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-soft hover:border-ink hover:text-ink"
            >
              Edit hypothesis
            </button>
          </section>

          <section className="border border-ink/20 bg-paper-deep/20 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">
                  Tavily retrieval config
                </div>
                <p className="mt-1 font-display text-[13px] leading-[1.45] text-ink-soft">
                  Lower counts are faster for testing. Higher counts improve odds of finding a real protocol candidate.
                </p>
              </div>
              <button
                onClick={() => void onPreview()}
                disabled={!hypothesis.trim() || isPreviewing || isCompiling}
                className="inline-flex items-center gap-2 border border-ink/30 px-4 py-3 font-mono text-[10px] uppercase tracking-[0.18em] text-ink transition-colors hover:border-rust hover:text-rust disabled:opacity-30"
              >
                <Search className="h-3.5 w-3.5" strokeWidth={1.5} />
                {isPreviewing ? "Retrieving sources" : "Preview retrieval"}
              </button>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-5">
              <NumberControl label="Sources" value={options.maxSources ?? 12} min={1} max={40} onChange={(value) => updateOptions({ maxSources: value })} />
              <NumberControl label="Queries" value={options.maxQueries ?? 10} min={1} max={10} onChange={(value) => updateOptions({ maxQueries: value })} />
              <NumberControl label="Per query" value={options.maxResultsPerQuery ?? 2} min={1} max={8} onChange={(value) => updateOptions({ maxResultsPerQuery: value })} />
              <NumberControl label="Min quality" value={Math.round((options.minQualityScore ?? 0.25) * 100)} min={0} max={90} onChange={(value) => updateOptions({ minQualityScore: value / 100 })} />
              <label className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-mute">
                Depth
                <select
                  value={options.searchDepth ?? "advanced"}
                  onChange={(event) => updateOptions({ searchDepth: event.target.value as "basic" | "advanced" })}
                  className="mt-1 w-full border border-ink/20 bg-paper px-2 py-2 text-ink"
                >
                  <option value="advanced">Advanced</option>
                  <option value="basic">Basic</option>
                </select>
              </label>
            </div>
          </section>

          {(isPreviewing || events.length > 0) && (
            <RetrievalProgress events={events} isPreviewing={isPreviewing} />
          )}

          {error && (
            <div className="border-l-2 border-rust pl-3 font-display text-[14px] leading-[1.5] text-rust">
              {error}
            </div>
          )}

          <section className="border border-ink bg-paper">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink px-4 py-3">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">
                  Source review
                </div>
                <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-mute">
                  {selectedUrls.size} selected · {protocolCount} protocol candidates · {evidenceCount} evidence refs
                </div>
              </div>
              <button
                onClick={onCompile}
                disabled={!hypothesis.trim() || isCompiling}
                className="inline-flex items-center gap-2 bg-ink px-5 py-3 font-mono text-[10px] uppercase tracking-[0.18em] text-paper transition-colors hover:bg-rust disabled:opacity-30"
              >
                {isCompiling ? "Compiling" : "Compile selected basis"}
                <Sparkles className="h-3.5 w-3.5" strokeWidth={1.5} />
              </button>
            </div>
            {sources.length ? (
              <div className="max-h-[620px] overflow-auto divide-y divide-rule">
                {sources.map((source) => (
                  <label key={source.url} className="grid cursor-pointer grid-cols-[24px_1fr_72px] gap-3 p-4 transition-colors hover:bg-paper-deep/30">
                    <input
                      type="checkbox"
                      checked={selectedUrls.has(source.url)}
                      onChange={(event) => toggleSource(source.url, event.target.checked)}
                      className="mt-1"
                    />
                    <span className="min-w-0">
                      <span className="block font-display text-[16px] leading-tight tracking-tight">{source.title}</span>
                      <span className="mt-1 block font-mono text-[9px] uppercase tracking-[0.14em] text-ink-mute">
                        {source.domain} · {source.candidate_role} · {source.source_type}
                      </span>
                      <span className="mt-2 block font-display text-[13px] leading-[1.4] text-ink-soft">
                        {source.content_preview}
                      </span>
                      {source.quality_reasons.length > 0 && (
                        <span className="mt-2 block font-mono text-[9px] uppercase tracking-[0.14em] text-ink-mute">
                          {source.quality_reasons.slice(0, 3).join(" · ")}
                        </span>
                      )}
                    </span>
                    <span className="text-right font-mono text-[10px] uppercase tracking-[0.12em] text-rust tabular-nums">
                      {Math.round(source.quality_score * 100)}%
                    </span>
                  </label>
                ))}
              </div>
            ) : (
              <div className="p-6 font-display text-[14px] leading-[1.5] text-ink-soft">
                Preview retrieval to inspect external sources before compiling. You can also compile without preview; the backend will retrieve using the current config.
              </div>
            )}
          </section>
        </div>

        <aside className="space-y-5 xl:sticky xl:top-4 xl:self-start">
          <section className="border border-moss/30 bg-moss/5 p-4">
            <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-moss">
              Candidate rule
            </div>
            <p className="mt-2 font-display text-[13px] leading-[1.45] text-ink-soft">
              Protocol-like sources can become workflow step candidates. Paper and supplier evidence can support materials, validation, decision nodes, and gap filling.
            </p>
          </section>
          <section className="border border-ink/20 bg-paper-deep/20 p-4">
            <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">
              Live behavior
            </div>
            <ul className="mt-3 space-y-2 font-display text-[13px] leading-[1.45] text-ink-soft">
              <li>Preview streams query progress as Tavily returns results.</li>
              <li>Selected URLs are sent to compile as an allowlist.</li>
              <li>Unselected sources can still be rediscovered later if you raise source limits and re-preview.</li>
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}

function RetrievalProgress({ events, isPreviewing }: { events: RetrievalPreviewEvent[]; isPreviewing: boolean }) {
  const visible = events.filter((event) => event.type !== "heartbeat").slice(-8);
  const lastHeartbeat = [...events].reverse().find((event) => event.type === "heartbeat");

  return (
    <section className="border border-rust/30 bg-rust/5 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-rust">
          Live retrieval progress
        </div>
        {isPreviewing && (
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-rust">
            running
          </span>
        )}
      </div>
      <div className="mt-3 space-y-2">
        {visible.map((event, index) => (
          <div key={index} className="grid grid-cols-[18px_1fr_auto] gap-2 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-mute">
            <span className="mt-1.5 h-1.5 w-1.5 animate-pulse rounded-full bg-rust" />
            <span>{event.type === "progress" ? event.message : event.type}</span>
            {event.type === "progress" && event.current && event.total && (
              <span>{event.current}/{event.total}</span>
            )}
          </div>
        ))}
        {visible.length === 0 && (
          <div className="font-display text-[13px] text-ink-soft">
            Waiting for the first retrieval event...
          </div>
        )}
        {lastHeartbeat?.type === "heartbeat" && isPreviewing && (
          <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-mute">
            Backend still alive · waiting on external search response · {Math.round(lastHeartbeat.elapsed_ms / 1000)}s
          </div>
        )}
      </div>
    </section>
  );
}

function ProtocolBasisStage({
  workflow,
  onContinue,
  onBack,
}: {
  workflow: Workflow;
  onContinue: () => void;
  onBack: () => void;
}) {
  return (
    <div>
      <StageHeader number="04" eyebrow="Protocol basis" title="Decide whether the evidence basis is usable.">
        Review the retrieved protocol basis, source quality, missing context, and readiness confidence before turning it into an operational setup.
      </StageHeader>
      <WorkflowSummary workflow={workflow} />
      <div className="mt-8 grid gap-8 xl:grid-cols-[1fr_360px]">
        <div className="space-y-10">
          <LiteratureQC qc={workflow.qc} />
          <SopMatchPanel match={workflow.sop_match} />
          <div className="flex gap-3">
            <button onClick={onContinue} className="bg-ink px-5 py-3 font-mono text-[10px] uppercase tracking-[0.18em] text-paper hover:bg-rust">
              Proceed to workflow setup
            </button>
            <button onClick={onBack} className="border border-ink/30 px-5 py-3 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-soft hover:border-ink hover:text-ink">
              Back to retrieval
            </button>
          </div>
        </div>
        <aside className="space-y-6 xl:sticky xl:top-4 xl:self-start">
          <IntentCard intent={workflow.structured_intent} />
          <ProtocolBasisCard workflow={workflow} />
        </aside>
      </div>
    </div>
  );
}

function WorkflowSetupStage({
  workflow,
  selectedStepId,
  onSelectStep,
  onStartRun,
  onUpdatePlan,
}: {
  workflow: Workflow;
  selectedStepId: string | null;
  onSelectStep: (stepId: string) => void;
  onStartRun: () => Promise<void>;
  onUpdatePlan: (plan: Workflow["plan"], note?: string) => Promise<void>;
}) {
  const blocking = workflow.steps.filter((step) => step.status === "blocked" || step.status === "needs_user_choice");
  return (
    <div>
      <StageHeader number="05" eyebrow="Workflow setup" title="Review the steps and operational plan together.">
        Resolve decisions, inspect materials and timing assumptions, and confirm whether this workflow is ready to execute.
      </StageHeader>
      <WorkflowSummary workflow={workflow} />
      {blocking.length > 0 && (
        <div className="mt-5 border-l-2 border-rust bg-rust/5 px-4 py-3 font-display text-[14px] text-rust">
          {blocking.length} steps need review before execution. You can still start a run, but unresolved gaps will be tracked.
        </div>
      )}
      <div className="mt-8 grid gap-8 2xl:grid-cols-[minmax(420px,0.95fr)_minmax(520px,1.05fr)]">
        <WorkflowStepper steps={workflow.steps} selectedStepId={selectedStepId} onSelectStep={onSelectStep} />
        <PlanTabs workflow={workflow} onSavePlan={onUpdatePlan} />
      </div>
      <button
        onClick={() => void onStartRun()}
        className="mt-8 bg-ink px-5 py-3 font-mono text-[10px] uppercase tracking-[0.18em] text-paper hover:bg-rust"
      >
        Start execution run
      </button>
    </div>
  );
}

function ExecuteStage({
  workflow,
  executionRun,
  onCreateRun,
  onStartStep,
  onSaveStep,
  onCompleteStep,
  onAddAttachment,
  onCompleteRun,
  activeStepId,
  onActiveStepChange,
}: {
  workflow: Workflow;
  executionRun: ExecutionRun | null;
  onCreateRun: () => Promise<void>;
  onStartStep: (stepId: string) => Promise<void>;
  onSaveStep: (stepId: string, operatorNote: string, deviationNote: string, actuals: Record<string, unknown>) => Promise<void>;
  onCompleteStep: (stepId: string, operatorNote: string, deviationNote: string, actuals: Record<string, unknown>) => Promise<void>;
  onAddAttachment: (stepId: string, filename: string, note: string, contentType?: string) => Promise<void>;
  onCompleteRun: () => Promise<void>;
  activeStepId: string | null;
  onActiveStepChange: (stepId: string | null) => void;
}) {
  return (
    <div>
      <StageHeader number="06" eyebrow="Execute" title="Run the workflow step by step.">
        Keep the active step, run notes, files, actual values, and provenance in one workspace.
      </StageHeader>
      <div className="grid gap-8 2xl:grid-cols-[minmax(0,1fr)_380px]">
        <ExecutionWorkspace
          workflow={workflow}
          run={executionRun}
          onCreateRun={onCreateRun}
          onStartStep={onStartStep}
          onSaveStep={onSaveStep}
          onCompleteStep={onCompleteStep}
          onAddAttachment={onAddAttachment}
          onCompleteRun={onCompleteRun}
          onActiveStepChange={onActiveStepChange}
        />
        <StepPlanContext workflow={workflow} activeStepId={activeStepId ?? executionRun?.current_step_id ?? null} />
      </div>
    </div>
  );
}

function ReviewStage({ workflow, executionRun }: { workflow: Workflow; executionRun: ExecutionRun | null }) {
  return (
    <div>
      <StageHeader number="07" eyebrow="Review" title="Turn execution into memory.">
        Review trace events, deviations, run status, and SOP improvement signals after execution.
      </StageHeader>
      <div className="grid gap-8 xl:grid-cols-[1fr_360px]">
        <div className="space-y-10">
          {executionRun && (
            <section className="border border-ink bg-paper-deep/30 p-5">
              <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">Run summary</div>
              <div className="mt-2 font-display text-[26px] leading-none">{executionRun.status}</div>
              <div className="mt-3 grid grid-cols-3 gap-3 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-mute">
                <span>{executionRun.steps.length} steps</span>
                <span>{executionRun.steps.filter((s) => s.status === "completed").length} complete</span>
                <span>{executionRun.events.length} events</span>
              </div>
            </section>
          )}
          {executionRun && <PlannedActualReview workflow={workflow} run={executionRun} />}
          <SopImprovementPanel recs={workflow.sop_recommendations} />
        </div>
        <ExecutionTrace trace={workflow.trace} />
      </div>
    </div>
  );
}

function StepPlanContext({ workflow, activeStepId }: { workflow: Workflow; activeStepId: string | null }) {
  const step = workflow.steps.find((candidate) => candidate.step_id === activeStepId) ?? workflow.steps[0];
  const normalizedTitle = step?.title.toLowerCase() ?? "";
  const stepChunkIds = new Set(step?.source_refs.map((ref) => ref.chunk_id) ?? []);
  const relatedMaterials = workflow.plan.materials.filter((material) => {
    const text = `${material.name} ${material.purpose} ${material.basis ?? ""}`.toLowerCase();
    return (
      (material.source_ref?.chunk_id && stepChunkIds.has(material.source_ref.chunk_id)) ||
      text.includes(normalizedTitle) ||
      normalizedTitle.split(/\s+/).some((word) => word.length > 4 && text.includes(word))
    );
  });
  const materials = relatedMaterials.length ? relatedMaterials : workflow.plan.materials.slice(0, 5);
  const relatedValidation = workflow.plan.validation.filter((item) => {
    const text = `${item.endpoint} ${item.assay} ${item.threshold}`.toLowerCase();
    return normalizedTitle.split(/\s+/).some((word) => word.length > 4 && text.includes(word));
  });
  const validation = relatedValidation.length ? relatedValidation : workflow.plan.validation.slice(0, 3);
  const relatedRisks = workflow.plan.risks.filter((risk) => {
    const text = `${risk.category} ${risk.risk} ${risk.mitigation}`.toLowerCase();
    return step?.classification === "missing_context" || normalizedTitle.split(/\s+/).some((word) => word.length > 4 && text.includes(word));
  });
  const risks = relatedRisks.length ? relatedRisks : workflow.plan.risks.slice(0, 3);

  return (
    <aside className="space-y-4 2xl:sticky 2xl:top-4 2xl:self-start">
      <section className="border border-ink bg-paper-deep/30 p-4">
        <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">
          Active step plan context
        </div>
        <h3 className="mt-2 font-display text-[20px] leading-tight tracking-tight">
          {step?.title ?? "No active step"}
        </h3>
        <p className="mt-2 font-display text-[13px] leading-[1.45] text-ink-soft">
          Materials, validation, risks, and source provenance shown here are pulled from the compiled plan while the run records actual execution.
        </p>
      </section>

      <PlanContextBlock title="Materials">
        {materials.length ? materials.map((material) => (
          <div key={`${material.name}-${material.purpose}`} className="border-b border-rule py-2 last:border-b-0">
            <div className="font-display text-[13px] leading-tight">{material.name}</div>
            <div className="mt-1 font-mono text-[9px] uppercase tracking-[0.14em] text-ink-mute">
              {material.quantity} · ${material.total.toLocaleString()} · {material.confidence}
            </div>
            {material.needs_user_confirmation && (
              <div className="mt-1 font-mono text-[9px] uppercase tracking-[0.14em] text-ochre">
                confirm estimate
              </div>
            )}
          </div>
        )) : (
          <p className="font-display text-[13px] text-ink-soft">No material estimate tied to this step yet.</p>
        )}
      </PlanContextBlock>

      <PlanContextBlock title="Timeline">
        {workflow.plan.timeline.slice(0, 4).map((phase) => (
          <div key={phase.phase} className="border-b border-rule py-2 last:border-b-0">
            <div className="font-display text-[13px] leading-tight">{phase.phase}</div>
            <div className="mt-1 font-mono text-[9px] uppercase tracking-[0.14em] text-ink-mute">
              {phase.duration} · W{phase.start_week}-W{phase.end_week}
            </div>
          </div>
        ))}
      </PlanContextBlock>

      <PlanContextBlock title="Validation">
        {validation.length ? validation.map((item) => (
          <div key={`${item.endpoint}-${item.assay}`} className="border-b border-rule py-2 last:border-b-0">
            <div className="font-display text-[13px] leading-tight">{item.endpoint}</div>
            <div className="mt-1 font-mono text-[9px] uppercase tracking-[0.14em] text-ink-mute">
              {item.assay} · {item.type}
            </div>
          </div>
        )) : (
          <p className="font-display text-[13px] text-ink-soft">No validation item tied to this step yet.</p>
        )}
      </PlanContextBlock>

      <PlanContextBlock title="Risks">
        {risks.length ? risks.map((risk) => (
          <div key={`${risk.category}-${risk.risk}`} className="border-b border-rule py-2 last:border-b-0">
            <div className="font-display text-[13px] leading-tight">{risk.risk}</div>
            <div className="mt-1 font-mono text-[9px] uppercase tracking-[0.14em] text-ink-mute">
              {risk.category} · {risk.severity}
            </div>
          </div>
        )) : (
          <p className="font-display text-[13px] text-ink-soft">No explicit risk tied to this step yet.</p>
        )}
      </PlanContextBlock>
    </aside>
  );
}

function PlanContextBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border border-ink/15 bg-paper-deep/20 p-4">
      <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">{title}</div>
      <div className="mt-2">{children}</div>
    </section>
  );
}

function PlannedActualReview({ workflow, run }: { workflow: Workflow; run: ExecutionRun }) {
  const plannedBudget = workflow.plan.budget.reduce((total, line) => total + (Number.isFinite(line.total) ? line.total : 0), 0);
  return (
    <section className="border border-ink bg-paper">
      <div className="border-b border-ink px-4 py-3">
        <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">
          Planned vs actual
        </div>
        <div className="mt-1 grid gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-mute sm:grid-cols-3">
          <span>Estimated spend ${plannedBudget.toLocaleString()}</span>
          <span>{workflow.plan.timeline.length} planned phases</span>
          <span>{run.steps.filter((step) => step.deviation_note).length} deviations noted</span>
        </div>
      </div>
      <div className="divide-y divide-rule">
        {run.steps.map((runStep) => {
          const workflowStep = workflow.steps.find((step) => step.step_id === runStep.step_id);
          return (
            <div key={runStep.step_id} className="grid gap-3 p-4 lg:grid-cols-[220px_1fr]">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-rust">
                  Step {runStep.order.toString().padStart(2, "0")} · {runStep.status}
                </div>
                <div className="mt-1 font-display text-[15px] leading-tight">{runStep.title}</div>
                <div className="mt-1 font-mono text-[9px] uppercase tracking-[0.14em] text-ink-mute">
                  {workflowStep?.classification ?? runStep.classification}
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <ReviewCell label="Planned">
                  {workflowStep?.instructions.slice(0, 2).join(" ") || "No planned instruction recorded."}
                </ReviewCell>
                <ReviewCell label="Actual note">
                  {runStep.operator_note || "No operator note."}
                </ReviewCell>
                <ReviewCell label="Deviation / files">
                  {runStep.deviation_note || "No deviation."}
                  {runStep.attachments.length > 0 && (
                    <span className="mt-1 block font-mono text-[9px] uppercase tracking-[0.14em] text-ink-mute">
                      {runStep.attachments.length} attachment{runStep.attachments.length === 1 ? "" : "s"}
                    </span>
                  )}
                  {Object.keys(runStep.actuals ?? {}).length > 0 && (
                    <span className="mt-1 block font-mono text-[9px] uppercase tracking-[0.14em] text-moss">
                      actuals captured
                    </span>
                  )}
                </ReviewCell>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function ReviewCell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="border-l border-ink/15 pl-3">
      <div className="font-mono text-[9px] uppercase tracking-[0.16em] text-ink-mute">{label}</div>
      <div className="mt-1 font-display text-[12px] leading-[1.4] text-ink-soft">{children}</div>
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

function ProtocolBasisCard({ workflow }: { workflow: Workflow }) {
  if (!workflow.protocol_basis) return null;
  return (
    <section className="border border-moss/40 bg-moss/5 p-4">
      <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-moss">
        {workflow.protocol_basis.basis_label ?? "Protocol basis"}
      </div>
      <h3 className="mt-2 font-display text-[18px] leading-tight tracking-tight">
        {workflow.protocol_basis.base_protocol_name}
      </h3>
      <div className="mt-3 grid grid-cols-2 gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-mute">
        <span>Readiness {Math.round(workflow.protocol_basis.base_protocol_score * 100)}%</span>
        {workflow.protocol_basis.semantic_fit_score !== undefined && (
          <span>Semantic {Math.round(workflow.protocol_basis.semantic_fit_score * 100)}%</span>
        )}
        <span>{workflow.protocol_basis.candidate_count} candidates</span>
        <span>{workflow.protocol_basis.imported_steps} imported</span>
        <span>{workflow.protocol_basis.gap_filled_steps} gap-filled</span>
        <span>{workflow.protocol_basis.source_origin ?? "unknown origin"}</span>
      </div>
      {workflow.protocol_basis.confidence_breakdown?.penalties?.length ? (
        <ul className="mt-3 space-y-1 border-t border-moss/20 pt-3">
          {workflow.protocol_basis.confidence_breakdown.penalties.slice(0, 3).map((penalty, i) => (
            <li key={i} className="font-display text-[12px] leading-[1.35] text-ink-soft">
              {penalty}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
