"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { ExecutionRun, MemoryInsights, Workflow } from "@/types";
import type { PrepStatus, RunPreparation, RunPreparationItem } from "@/types";
import {
  compileWorkflowStream,
  addRunStepAttachment,
  commitDecision,
  completeExecutionRun,
  completeRunStep,
  createExecutionRun,
  deleteAllMemory,
  getMemoryInsights,
  modifyStep,
  saveRunStepNotes,
  startRunStep,
  submitFeedback,
  previewRetrievalStream,
  saveRunFindings,
  updateWorkflowRunPreparation,
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
import { ArrowRight, BarChart3, BookOpenText, ClipboardCheck, Database, Download, ExternalLink, FileText, History, LogOut, RefreshCw, Save, Search, Sparkles } from "lucide-react";

const AUTH_KEY = "operon_demo_auth";

export default function Home() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
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
  const [memoryInsights, setMemoryInsights] = useState<MemoryInsights | null>(null);
  const [memoryLoading, setMemoryLoading] = useState(false);
  const [memoryError, setMemoryError] = useState<string | null>(null);
  const [memoryDeleting, setMemoryDeleting] = useState(false);

  const selectedStep =
    workflow?.steps.find((s) => s.step_id === selectedStepId) ?? null;

  const selectedRetrievalOptions: RetrievalOptions = {
    ...retrievalOptions,
    selectedExternalUrls: selectedSourceUrls.size ? Array.from(selectedSourceUrls) : undefined,
  };

  useEffect(() => {
    if (window.localStorage.getItem(AUTH_KEY) !== "true") {
      router.replace("/login?next=/demo");
      return;
    }
    setAuthChecked(true);
  }, [router]);

  function handleLogout() {
    window.localStorage.removeItem(AUTH_KEY);
    router.replace("/");
  }

  async function loadMemoryInsights() {
    setMemoryLoading(true);
    setMemoryError(null);
    try {
      setMemoryInsights(await getMemoryInsights());
    } catch (error) {
      setMemoryError(error instanceof Error ? error.message : "Failed to load memory insights");
    } finally {
      setMemoryLoading(false);
    }
  }

  async function handleDeleteAllMemory() {
    const confirmed = window.confirm(
      "Delete all local workflows, runs, feedback, uploaded docs, protocol cache, and vector memory? This cannot be undone."
    );
    if (!confirmed) return;
    setMemoryDeleting(true);
    setMemoryError(null);
    try {
      const result = await deleteAllMemory();
      setMemoryInsights(result.insights);
      setWorkflow(null);
      setExecutionRun(null);
      setSelectedStepId(null);
      setExecutionStepId(null);
      setRetrievalSources([]);
      setSelectedSourceUrls(new Set());
      setRetrievalEvents([]);
      setCompileEvents([]);
      setStage("memory_insights");
    } catch (error) {
      setMemoryError(error instanceof Error ? error.message : "Failed to delete local memory");
    } finally {
      setMemoryDeleting(false);
    }
  }

  useEffect(() => {
    if (stage === "memory_insights" && !memoryInsights && !memoryLoading) {
      void loadMemoryInsights();
    }
  }, [stage]);

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
    note: string,
    customBranch?: {
      label: string;
      summary: string;
      tradeoffs?: string[];
      costImpact?: "Low" | "Medium" | "High";
      timelineImpact?: string;
      risks?: string[];
    }
  ) {
    if (!workflow) return;
    const result = await commitDecision(workflow.workflow_id, stepId, optionId, note, customBranch);
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

  async function handleUpdateRunPreparation(runPreparation: RunPreparation, note?: string) {
    if (!workflow) return;
    const result = await updateWorkflowRunPreparation(workflow.workflow_id, runPreparation, note);
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

  async function handleSaveFindings(payload: { conclusion?: string; findings?: string; nextSteps?: string }) {
    if (!executionRun) return;
    setExecutionRun(await saveRunFindings(executionRun.run_id, payload));
  }

  const stages = buildStages(
    stage,
    workflow,
    executionRun,
    hypothesisDraft.trim().length > 0,
    retrievalSources.length
  );

  if (!authChecked) {
    return <main className="min-h-screen bg-paper" />;
  }

  return (
    <main className="relative min-h-screen">
      <CompilingOverlay visible={isCompiling} events={compileEvents} />

      <Masthead />
      <button
        onClick={handleLogout}
        className="fixed right-4 top-4 z-40 inline-flex items-center gap-2 border border-ink/30 bg-paper/90 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-ink shadow-sm backdrop-blur transition-colors hover:border-ink hover:bg-ink hover:text-paper"
      >
        <LogOut className="h-3.5 w-3.5" strokeWidth={1.5} />
        Logout
      </button>
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
            onContinue={() => setStage("prepare_run")}
            onUpdatePlan={handleUpdatePlan}
          />
        )}

        {stage === "prepare_run" && workflow && (
          <PrepareRunStage
            workflow={workflow}
            onSavePreparation={handleUpdateRunPreparation}
            onStartRun={handleCreateRun}
            onBack={() => setStage("workflow_setup")}
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
          <ReviewStage workflow={workflow} executionRun={executionRun} onSaveFindings={handleSaveFindings} />
        )}

        {stage === "memory_insights" && (
          <MemoryInsightsStage
            insights={memoryInsights}
            loading={memoryLoading}
            error={memoryError}
            deleting={memoryDeleting}
            onRefresh={loadMemoryInsights}
            onDeleteAll={handleDeleteAllMemory}
          />
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
    stage("prepare_run", "06", "Prepare run", "Readiness", !hasWorkflow, hasRun, workflow?.run_preparation?.readiness_status?.replaceAll("_", " ")),
    stage("execute", "07", "Execute run", "Runbook", !hasWorkflow, completedRun, hasRun ? executionRun?.status : "start run"),
    stage("review", "08", "Review", "Memory", !hasWorkflow, completedRun, "Trace and SOP signals"),
    stage("memory_insights", "09", "Memory insights", "Learning", false, false, "Previous runs and stored learning"),
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
  onContinue,
  onUpdatePlan,
}: {
  workflow: Workflow;
  selectedStepId: string | null;
  onSelectStep: (stepId: string) => void;
  onContinue: () => void;
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
        onClick={onContinue}
        className="mt-8 bg-ink px-5 py-3 font-mono text-[10px] uppercase tracking-[0.18em] text-paper hover:bg-rust"
      >
        Proceed to run preparation
      </button>
    </div>
  );
}

function PrepareRunStage({
  workflow,
  onSavePreparation,
  onStartRun,
  onBack,
}: {
  workflow: Workflow;
  onSavePreparation: (runPreparation: RunPreparation, note?: string) => Promise<void>;
  onStartRun: () => Promise<void>;
  onBack: () => void;
}) {
  const [prep, setPrep] = useState<RunPreparation>(() => workflow.run_preparation ?? buildDefaultRunPreparation(workflow));
  const [note, setNote] = useState(workflow.run_preparation?.preparation_note ?? "");
  const [saving, setSaving] = useState(false);

  const readiness = computeReadiness(prep);
  const allItems = flattenPrep(prep);
  const blocked = allItems.filter((item) => item.status === "blocked");
  const needsReview = allItems.filter((item) => item.status === "needs_review" || item.status === "not_started");

  function updateItem(section: keyof RunPreparation, id: string, patch: Partial<RunPreparationItem>) {
    setPrep((current) => ({
      ...current,
      [section]: (current[section] as RunPreparationItem[]).map((item) =>
        item.id === id ? { ...item, ...patch } : item
      ),
    }));
  }

  async function save() {
    setSaving(true);
    try {
      const next = { ...prep, readiness_status: readiness, preparation_note: note };
      setPrep(next);
      await onSavePreparation(next, note.trim() || undefined);
    } finally {
      setSaving(false);
    }
  }

  async function start() {
    const next = { ...prep, readiness_status: readiness, preparation_note: note };
    await onSavePreparation(next, note.trim() || undefined);
    await onStartRun();
  }

  return (
    <div>
      <StageHeader number="06" eyebrow="Prepare run" title="Convert the curated plan into a runnable lab operation.">
        Confirm approvals, procurement, finance, scheduling, validation, and risk readiness before creating the execution run. This stage does not claim institutional approval; it records scientist-confirmed readiness and likely review requirements.
      </StageHeader>
      <WorkflowSummary workflow={workflow} />

      <section className="mt-6 border border-ink bg-paper-deep/30 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">Run readiness gate</div>
            <div className="mt-2 font-display text-[32px] leading-none tracking-tight">
              {readiness.replaceAll("_", " ")}
            </div>
            <div className="mt-3 flex flex-wrap gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-mute">
              <span>{blocked.length} blocked</span>
              <span>{needsReview.length} need review</span>
              <span>{allItems.filter((item) => item.status === "confirmed").length} confirmed</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => exportPrepMarkdown(workflow, prep)} className="inline-flex items-center gap-2 border border-ink/30 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.16em] hover:border-ink">
              <FileText className="h-3.5 w-3.5" /> Finance packet
            </button>
            <button onClick={() => void save()} disabled={saving} className="inline-flex items-center gap-2 border border-ink px-3 py-2 font-mono text-[10px] uppercase tracking-[0.16em] hover:bg-ink hover:text-paper disabled:opacity-40">
              <Save className="h-3.5 w-3.5" /> {saving ? "Saving" : "Save prep"}
            </button>
          </div>
        </div>
        <textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          rows={2}
          className="mt-4 w-full resize-none border border-ink/20 bg-paper px-3 py-2 font-display text-[14px] leading-[1.45] focus:outline-none"
          placeholder="Optional preparation note: approver names, purchasing constraints, scheduling caveats..."
        />
      </section>

      <div className="mt-8 grid gap-8 2xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-8">
          <PrepSection title="Approvals and institutional review" items={prep.approval_items} section="approval_items" onUpdate={updateItem} />
          <PrepSection title="Materials and ordering" items={prep.material_items} section="material_items" onUpdate={updateItem} showLinks />
          <PrepSection title="Finance and procurement packet" items={prep.finance_items} section="finance_items" onUpdate={updateItem} />
          <PrepSection title="Schedule readiness" items={prep.schedule_items} section="schedule_items" onUpdate={updateItem} />
          <PrepSection title="Validation readiness" items={prep.validation_items} section="validation_items" onUpdate={updateItem} />
          <PrepSection title="Risk readiness" items={prep.risk_items} section="risk_items" onUpdate={updateItem} />
        </div>

        <aside className="space-y-5 2xl:sticky 2xl:top-4 2xl:self-start">
          <section className="border border-ink bg-paper p-4">
            <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">Readiness rule</div>
            <p className="mt-2 font-display text-[13px] leading-[1.45] text-ink-soft">
              A run is blocked if any checklist item is blocked. It is ready with warnings if likely approvals, materials, validation, schedule, or high-risk items still need review.
            </p>
          </section>
          <section className="border border-ochre/40 bg-ochre/5 p-4">
            <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-ochre">Scientific operations basis</div>
            <ul className="mt-3 space-y-2 font-display text-[13px] leading-[1.45] text-ink-soft">
              <li>PI/project lead approval is commonly expected before experimental execution.</li>
              <li>Biosafety, IBC, IRB, IACUC, and EHS review depend on materials, organisms, samples, vectors, animals, humans, and hazards.</li>
              <li>Budget owner and procurement review depend on institutional thresholds and supplier policies.</li>
              <li>Equipment and facility scheduling should be confirmed before run start.</li>
            </ul>
          </section>
          <div className="flex flex-col gap-2">
            <button onClick={onBack} className="border border-ink/30 px-4 py-3 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-soft hover:border-ink hover:text-ink">
              Back to workflow setup
            </button>
            <button onClick={() => void start()} disabled={readiness === "blocked"} className="inline-flex items-center justify-center gap-2 bg-ink px-4 py-3 font-mono text-[10px] uppercase tracking-[0.16em] text-paper hover:bg-rust disabled:opacity-35">
              <ClipboardCheck className="h-3.5 w-3.5" />
              Start execution run
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}

function PrepSection({
  title,
  items,
  section,
  onUpdate,
  showLinks = false,
}: {
  title: string;
  items: RunPreparationItem[];
  section: keyof RunPreparation;
  onUpdate: (section: keyof RunPreparation, id: string, patch: Partial<RunPreparationItem>) => void;
  showLinks?: boolean;
}) {
  return (
    <section className="border border-ink bg-paper">
      <div className="border-b border-ink px-4 py-3">
        <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">{title}</div>
      </div>
      <div className="divide-y divide-rule">
        {items.map((item) => (
          <div key={item.id} className="grid gap-3 p-4 lg:grid-cols-[1fr_170px]">
            <div>
              <div className="font-display text-[15px] leading-tight tracking-tight">{item.label}</div>
              <p className="mt-1 font-display text-[13px] leading-[1.45] text-ink-soft">{item.rationale}</p>
              {showLinks && item.links?.length ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {item.links.map((link) => (
                    <a key={link.url} href={link.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 border border-ink/20 px-2 py-1 font-mono text-[9px] uppercase tracking-[0.14em] text-ink-soft hover:border-rust hover:text-rust">
                      {link.label} <ExternalLink className="h-3 w-3" />
                    </a>
                  ))}
                </div>
              ) : null}
            </div>
            <div className="space-y-2">
              <select
                value={item.status}
                onChange={(event) => onUpdate(section, item.id, { status: event.target.value as PrepStatus })}
                className="w-full border border-ink/20 bg-paper-deep/30 px-2 py-2 font-mono text-[10px] uppercase tracking-[0.12em] focus:outline-none"
              >
                <option value="not_started">Not started</option>
                <option value="in_progress">In progress</option>
                <option value="needs_review">Needs review</option>
                <option value="confirmed">Confirmed</option>
                <option value="not_required">Not required</option>
                <option value="blocked">Blocked</option>
              </select>
              <input
                value={item.owner ?? ""}
                onChange={(event) => onUpdate(section, item.id, { owner: event.target.value })}
                className="w-full border border-ink/20 bg-paper px-2 py-1.5 font-display text-[12px] focus:outline-none"
                placeholder="Owner / approver"
              />
              <input
                value={item.note ?? ""}
                onChange={(event) => onUpdate(section, item.id, { note: event.target.value })}
                className="w-full border border-ink/20 bg-paper px-2 py-1.5 font-display text-[12px] focus:outline-none"
                placeholder="Prep note"
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function buildDefaultRunPreparation(workflow: Workflow): RunPreparation {
  const totalBudget = workflow.plan.budget.reduce((sum, line) => sum + (Number.isFinite(line.total) ? line.total : 0), 0);
  return {
    readiness_status: "ready_with_warnings",
    material_items: workflow.plan.materials.map((material, index) => ({
      id: `material_${index + 1}`,
      label: material.name,
      category: "material",
      status: material.confirmed ? "confirmed" : "needs_review",
      rationale: `${material.quantity || "Quantity unspecified"} · ${material.supplier || "supplier not set"} · ${material.catalog || "catalog not set"} · estimated ${formatMoney(material.total)}. Price source: ${material.price_source ?? "not recorded"}${material.quote_date ? `, quote/source date ${material.quote_date}` : ""}. Confirm inventory, acceptable substitute, pack size, and current ordering path before execution.`,
      links: materialOrderLinks(material),
      source_ref: material.source_ref,
    })),
    approval_items: buildApprovalItems(workflow, totalBudget),
    finance_items: [
      {
        id: "finance_procurement_packet",
        label: "Procurement and budget packet",
        category: "finance",
        status: totalBudget > 0 ? "needs_review" : "not_started",
        rationale: `Estimated plan budget is ${formatMoney(totalBudget)}. Export the finance packet and confirm budget owner/procurement requirements for your institution.`,
      },
      {
        id: "finance_cost_confidence",
        label: "Confirm estimated or low-confidence costs",
        category: "finance",
        status: workflow.plan.budget.some((line) => line.needs_user_confirmation || line.confidence === "low") ? "needs_review" : "confirmed",
        rationale: "Budget lines inferred from sources or heuristics should be checked before purchase requests are submitted.",
      },
    ],
    schedule_items: workflow.plan.timeline.map((phase, index) => ({
      id: `schedule_${index + 1}`,
      label: phase.phase,
      category: "schedule",
      status: phase.confirmed ? "confirmed" : "needs_review",
      rationale: `${phase.duration}; weeks ${phase.start_week}-${phase.end_week}. Confirm equipment reservations, operator availability, delivery lead times, and facility/storage windows.`,
    })),
    validation_items: workflow.plan.validation.map((item, index) => ({
      id: `validation_${index + 1}`,
      label: `${item.endpoint} via ${item.assay}`,
      category: "validation",
      status: item.confirmed ? "confirmed" : "needs_review",
      rationale: `Confirm controls (${item.controls.join(", ") || "none listed"}), threshold (${item.threshold || "not specified"}), data capture, and acceptance criteria before execution.`,
      source_ref: item.source_ref,
    })),
    risk_items: workflow.plan.risks.map((risk, index) => ({
      id: `risk_${index + 1}`,
      label: risk.risk,
      category: "risk",
      status: risk.severity === "high" ? "needs_review" : risk.confirmed ? "confirmed" : "needs_review",
      rationale: `${risk.category} risk, severity ${risk.severity}. Mitigation: ${risk.mitigation || "not specified"}. High severity risks should have a named reviewer or mitigation note.`,
    })),
    preparation_note: "",
  };
}

function buildApprovalItems(workflow: Workflow, totalBudget: number): RunPreparationItem[] {
  const text = [
    workflow.hypothesis,
    workflow.structured_intent.model_system,
    workflow.structured_intent.intervention,
    workflow.structured_intent.comparator,
    workflow.structured_intent.experiment_type,
    workflow.plan.materials.map((item) => `${item.name} ${item.purpose}`).join(" "),
    workflow.plan.risks.map((risk) => `${risk.category} ${risk.risk}`).join(" "),
  ].join(" ").toLowerCase();

  const items: RunPreparationItem[] = [
    {
      id: "approval_pi",
      label: "PI or project lead approval",
      category: "approval",
      status: "needs_review",
      rationale: "Most lab workflows require project owner or PI approval before resources, staff time, and shared facilities are committed.",
    },
    {
      id: "approval_budget",
      label: "Budget owner / procurement approval",
      category: "approval",
      status: totalBudget >= 500 ? "needs_review" : "in_progress",
      rationale: `Estimated budget is ${formatMoney(totalBudget)}. Institutional purchase thresholds vary, so the scientist should confirm whether budget owner or procurement approval is required.`,
    },
    {
      id: "approval_lab_manager",
      label: "Lab manager / facility scheduling",
      category: "approval",
      status: "needs_review",
      rationale: "Shared equipment, incubators, freezers, plate readers, biosafety cabinets, and storage locations should be reserved or confirmed before execution.",
    },
  ];

  if (/(hela|cell|cells|culture|bacteria|yeast|virus|viral|plasmid|recombinant|dna|rna|biosafety|atcc|addgene)/.test(text)) {
    items.push({
      id: "approval_biosafety",
      label: "Biosafety / IBC confirmation",
      category: "approval",
      status: "needs_review",
      rationale: "Biological materials, cell culture, recombinant DNA, viral vectors, or microorganisms may require biosafety or IBC review depending on institutional rules.",
    });
  }
  if (/(human|patient|donor|clinical|blood|tissue|identifiable)/.test(text)) {
    items.push({
      id: "approval_irb",
      label: "IRB / human samples confirmation",
      category: "approval",
      status: "needs_review",
      rationale: "Human subjects, identifiable data, or human-derived samples may require IRB or institutional human-samples review.",
    });
  }
  if (/(mouse|mice|rat|animal|zebrafish|in vivo|murine)/.test(text)) {
    items.push({
      id: "approval_iacuc",
      label: "IACUC / animal protocol confirmation",
      category: "approval",
      status: "needs_review",
      rationale: "Animal work generally requires an approved animal protocol before experiments begin.",
    });
  }
  if (/(dmso|formaldehyde|methanol|ethanol|chloroform|hazard|toxic|flammable|corrosive|biohazard|liquid nitrogen)/.test(text)) {
    items.push({
      id: "approval_ehs",
      label: "EHS / chemical safety confirmation",
      category: "approval",
      status: "needs_review",
      rationale: "Hazardous chemicals, cryogens, biohazards, or special waste streams may require EHS handling, PPE, storage, or disposal confirmation.",
    });
  }

  return items;
}

function materialOrderLinks(material: { name: string; supplier?: string; catalog?: string; catalog_url?: string | null; supplier_search_url?: string | null }) {
  const directLinks = [];
  if (material.catalog_url) directLinks.push({ label: "Catalog/source URL", url: material.catalog_url });
  if (material.supplier_search_url && material.supplier_search_url !== material.catalog_url) {
    directLinks.push({ label: "Supplier search", url: material.supplier_search_url });
  }
  if (directLinks.length) return directLinks;
  const query = encodeURIComponent(`${material.name} ${material.catalog ?? ""}`.trim());
  const supplier = (material.supplier ?? "").toLowerCase();
  const links = [];
  if (supplier.includes("thermo")) links.push({ label: "Thermo Fisher search", url: `https://www.thermofisher.com/search/results?keyword=${query}` });
  if (supplier.includes("sigma") || supplier.includes("millipore")) links.push({ label: "Sigma-Aldrich search", url: `https://www.sigmaaldrich.com/US/en/search/${query}` });
  if (supplier.includes("promega")) links.push({ label: "Promega search", url: `https://www.promega.com/search/?q=${query}` });
  if (supplier.includes("qiagen")) links.push({ label: "Qiagen search", url: `https://www.qiagen.com/us/search?query=${query}` });
  if (supplier.includes("atcc")) links.push({ label: "ATCC search", url: `https://www.atcc.org/search#q=${query}` });
  if (supplier.includes("addgene")) links.push({ label: "Addgene search", url: `https://www.addgene.org/search/advanced/?q=${query}` });
  if (links.length === 0) {
    links.push(
      { label: "Thermo Fisher", url: `https://www.thermofisher.com/search/results?keyword=${query}` },
      { label: "Sigma-Aldrich", url: `https://www.sigmaaldrich.com/US/en/search/${query}` }
    );
  }
  return links;
}

function flattenPrep(prep: RunPreparation): RunPreparationItem[] {
  return [
    ...prep.material_items,
    ...prep.approval_items,
    ...prep.finance_items,
    ...prep.schedule_items,
    ...prep.validation_items,
    ...prep.risk_items,
  ];
}

function computeReadiness(prep: RunPreparation): RunPreparation["readiness_status"] {
  const items = flattenPrep(prep);
  if (items.some((item) => item.status === "blocked")) return "blocked";
  if (items.some((item) => ["not_started", "needs_review", "in_progress"].includes(item.status))) return "ready_with_warnings";
  return "ready";
}

function exportPrepMarkdown(workflow: Workflow, prep: RunPreparation) {
  const lines = [
    `# Run Preparation Packet`,
    "",
    `Workflow: ${workflow.workflow_id}`,
    `Hypothesis: ${workflow.hypothesis}`,
    `Readiness: ${computeReadiness(prep)}`,
    "",
    "## Materials",
    ...prep.material_items.map((item) => `- [${item.status}] ${item.label}: ${item.rationale}`),
    "",
    "## Approvals",
    ...prep.approval_items.map((item) => `- [${item.status}] ${item.label}: ${item.rationale}${item.owner ? ` Owner: ${item.owner}.` : ""}`),
    "",
    "## Finance",
    ...prep.finance_items.map((item) => `- [${item.status}] ${item.label}: ${item.rationale}`),
    "",
    "## Schedule",
    ...prep.schedule_items.map((item) => `- [${item.status}] ${item.label}: ${item.rationale}`),
    "",
    "## Validation",
    ...prep.validation_items.map((item) => `- [${item.status}] ${item.label}: ${item.rationale}`),
    "",
    "## Risks",
    ...prep.risk_items.map((item) => `- [${item.status}] ${item.label}: ${item.rationale}`),
  ];
  downloadText(`${workflow.workflow_id}_run_preparation_packet.md`, lines.join("\n"), "text/markdown");
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(Number.isFinite(value) ? value : 0);
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
      <StageHeader number="07" eyebrow="Execute" title="Run the workflow step by step.">
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

function ReviewStage({
  workflow,
  executionRun,
  onSaveFindings,
}: {
  workflow: Workflow;
  executionRun: ExecutionRun | null;
  onSaveFindings: (payload: { conclusion?: string; findings?: string; nextSteps?: string }) => Promise<void>;
}) {
  return (
    <div>
      <StageHeader number="08" eyebrow="Review" title="Turn execution into memory.">
        Review trace events, deviations, run status, conclusions, exports, and any real SOP improvement signals after execution.
      </StageHeader>
      <div className="grid gap-8 xl:grid-cols-[1fr_360px]">
        <div className="space-y-10">
          {executionRun && (
            <section className="border border-ink bg-paper-deep/30 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">Run summary</div>
                  <div className="mt-2 font-display text-[26px] leading-none">{executionRun.status}</div>
                </div>
                <RunExportButtons workflow={workflow} run={executionRun} />
              </div>
              <div className="mt-3 grid grid-cols-3 gap-3 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-mute">
                <span>{executionRun.steps.length} steps</span>
                <span>{executionRun.steps.filter((s) => s.status === "completed").length} complete</span>
                <span>{executionRun.events.length} events</span>
              </div>
            </section>
          )}
          {executionRun && <FindingsEditor run={executionRun} onSave={onSaveFindings} />}
          {executionRun && <PlannedActualReview workflow={workflow} run={executionRun} />}
          <SopImprovementPanel recs={workflow.sop_recommendations} />
        </div>
        <ExecutionTrace trace={workflow.trace} />
      </div>
    </div>
  );
}

function MemoryInsightsStage({
  insights,
  loading,
  error,
  deleting,
  onRefresh,
  onDeleteAll,
}: {
  insights: MemoryInsights | null;
  loading: boolean;
  error: string | null;
  deleting: boolean;
  onRefresh: () => Promise<void>;
  onDeleteAll: () => Promise<void>;
}) {
  return (
    <div>
      <StageHeader number="09" eyebrow="Memory insights" title="Inspect previous runs and learning signals.">
        This view only reports stored workflows, completed run records, scientist feedback, and vector-indexed memory. Empty states mean the system has not collected that evidence yet.
      </StageHeader>

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-ink pb-4">
        <p className="max-w-[78ch] font-display text-[14px] leading-[1.45] text-ink-soft">
          Previous hypotheses and run analytics are used as retrievable lab memory for future compilation, run preparation, decision support, and SOP improvement review.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => void onRefresh()}
            disabled={loading || deleting}
            className="inline-flex items-center gap-2 border border-ink/30 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-ink transition-colors hover:border-ink disabled:opacity-40"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} strokeWidth={1.5} />
            {loading ? "Loading" : "Refresh"}
          </button>
          <button
            onClick={() => void onDeleteAll()}
            disabled={loading || deleting}
            className="inline-flex items-center gap-2 border border-rust bg-rust/5 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-rust transition-colors hover:bg-rust hover:text-paper disabled:opacity-40"
          >
            <Database className="h-3.5 w-3.5" strokeWidth={1.5} />
            {deleting ? "Deleting" : "Delete all local memory"}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-5 border border-rust bg-rust/5 p-4 font-display text-[14px] leading-[1.45] text-rust">
          {error}
        </div>
      )}

      {loading && !insights && (
        <div className="grid min-h-[320px] place-items-center border border-ink bg-paper">
          <div className="text-center">
            <RefreshCw className="mx-auto h-6 w-6 animate-spin text-rust" strokeWidth={1.5} />
            <div className="mt-4 font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">
              Loading stored workflows, runs, feedback, and vector memory
            </div>
          </div>
        </div>
      )}

      {insights && (
        <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-8">
            <section className="grid gap-3 md:grid-cols-4">
              <MemoryMetric icon={FileText} label="Workflows" value={insights.insights.workflow_count} />
              <MemoryMetric icon={History} label="Runs" value={insights.insights.run_count} />
              <MemoryMetric icon={ClipboardCheck} label="Completed" value={insights.insights.completed_run_count} />
              <MemoryMetric icon={Database} label="Feedback" value={insights.insights.feedback_count} />
              <MemoryMetric icon={Sparkles} label="Custom branches" value={insights.insights.custom_branch_count} />
              <MemoryMetric icon={BookOpenText} label="Manual gaps" value={insights.insights.manual_gap_resolution_count} />
              <MemoryMetric icon={BarChart3} label="Run prep" value={insights.insights.run_prep_count} />
              <MemoryMetric icon={RefreshCw} label="Deviations" value={insights.insights.deviation_count} />
            </section>

            <MemoryPanel title="Previous hypotheses" subtitle="Compiled workflows stored in the local workflow store.">
              {insights.workflows.length ? insights.workflows.map((workflow) => (
                <article key={workflow.workflow_id} className="grid gap-3 border-b border-rule p-4 last:border-b-0 lg:grid-cols-[1fr_210px]">
                  <div>
                    <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-mute">
                      {workflow.workflow_id} · {workflow.experiment_type}
                    </div>
                    <p className="mt-2 font-display text-[15px] leading-[1.45] text-ink">{workflow.hypothesis || "No hypothesis text recorded."}</p>
                    <div className="mt-2 font-display text-[13px] leading-[1.4] text-ink-soft">
                      Basis: {workflow.protocol_basis || "No protocol basis recorded."}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-mute">
                    <span>Readiness {formatPercent(workflow.readiness)}</span>
                    <span>{workflow.open_decisions} decisions</span>
                    <span>{workflow.run_count} runs</span>
                    <span>{workflow.memory_used_count} memories used</span>
                  </div>
                </article>
              )) : <MemoryEmpty text="No compiled workflows are stored yet." />}
            </MemoryPanel>

            <MemoryPanel title="Previous runs" subtitle="Execution records with status, deviations, attachments, and findings.">
              {insights.runs.length ? insights.runs.map((run) => (
                <article key={run.run_id} className="grid gap-3 border-b border-rule p-4 last:border-b-0 lg:grid-cols-[1fr_220px]">
                  <div>
                    <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-mute">
                      {run.run_id} · {run.status}
                    </div>
                    <p className="mt-2 font-display text-[14px] leading-[1.45] text-ink-soft">
                      {run.conclusion || run.findings_preview || "No conclusion or findings recorded yet."}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-mute">
                    <span>{run.completed_steps}/{run.total_steps} steps</span>
                    <span>{run.deviation_count} deviations</span>
                    <span>{run.attachment_count} files</span>
                    <span>{run.completed_at ? "completed" : "open"}</span>
                  </div>
                </article>
              )) : <MemoryEmpty text="No execution runs are stored yet. Start and complete a run in Step 07 to create run memory." />}
            </MemoryPanel>

            <MemoryPanel title="Learning events" subtitle="Concrete events that can influence future workflows.">
              {insights.learning_events.length ? insights.learning_events.map((event, index) => (
                <article key={`${event.event_type}-${event.workflow_id ?? "none"}-${event.run_id ?? "none"}-${index}`} className="border-b border-rule p-4 last:border-b-0">
                  <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-rust">
                    {event.event_type.replaceAll("_", " ")} {event.timestamp ? `· ${formatDateTime(event.timestamp)}` : ""}
                  </div>
                  <div className="mt-1 font-display text-[16px] leading-tight">{event.label}</div>
                  <p className="mt-2 font-display text-[13px] leading-[1.45] text-ink-soft">{event.description}</p>
                </article>
              )) : <MemoryEmpty text="No learning events have been recorded yet." />}
            </MemoryPanel>
          </div>

          <aside className="space-y-5 xl:sticky xl:top-4 xl:self-start">
            <section className="border border-ink bg-paper-deep/30 p-4">
              <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">How memory improves future workflows</div>
              <ul className="mt-3 space-y-3 font-display text-[13px] leading-[1.45] text-ink-soft">
                <li>Completed runs are indexed as prior-run memory with execution notes, deviations, actual values, findings, and attachment metadata.</li>
                <li>Custom decision branches and manually authored missing-context steps are indexed as scientist notes for similar future hypotheses.</li>
                <li>Run-preparation confirmations are indexed so future plans can learn recurring approval, procurement, schedule, validation, and risk requirements.</li>
                <li>Feedback is stored separately and retrieved by experiment type and hypothesis terms during compilation.</li>
              </ul>
            </section>
            <MemoryCountList title="Experiment types" items={insights.insights.top_experiment_types} empty="No experiment-type history yet." />
            <MemoryCountList title="Feedback sections" items={insights.insights.top_feedback_sections} empty="No feedback sections yet." />
            <MemoryCountList title="Vector memory sources" items={insights.insights.memory_sources} empty="No vector-indexed memory yet." />
            <section className="border border-ink bg-paper p-4">
              <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">Improvement opportunities</div>
              {insights.improvement_opportunities.length ? (
                <ul className="mt-3 space-y-2 font-display text-[13px] leading-[1.45] text-ink-soft">
                  {insights.improvement_opportunities.map((item) => <li key={item}>- {item}</li>)}
                </ul>
              ) : (
                <p className="mt-3 font-display text-[13px] leading-[1.45] text-ink-soft">No improvement opportunities detected from stored evidence yet.</p>
              )}
            </section>
          </aside>
        </div>
      )}
    </div>
  );
}

function MemoryMetric({ icon: Icon, label, value }: { icon: typeof FileText; label: string; value: number }) {
  return (
    <div className="border border-ink bg-paper p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-mute">{label}</div>
        <Icon className="h-4 w-4 text-rust" strokeWidth={1.5} />
      </div>
      <div className="mt-3 font-display text-[30px] leading-none tabular-nums">{value}</div>
    </div>
  );
}

function MemoryPanel({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <section className="border border-ink bg-paper">
      <div className="border-b border-ink px-4 py-3">
        <div className="font-display text-[20px] leading-tight tracking-tight">{title}</div>
        <p className="mt-1 font-display text-[13px] leading-[1.45] text-ink-soft">{subtitle}</p>
      </div>
      {children}
    </section>
  );
}

function MemoryEmpty({ text }: { text: string }) {
  return <p className="p-4 font-display text-[14px] leading-[1.45] text-ink-soft">{text}</p>;
}

function MemoryCountList({ title, items, empty }: { title: string; items: { label: string; count: number }[]; empty: string }) {
  return (
    <section className="border border-ink bg-paper p-4">
      <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">{title}</div>
      {items.length ? (
        <div className="mt-3 space-y-2">
          {items.map((item) => (
            <div key={item.label} className="flex items-center justify-between gap-3 border-b border-rule pb-2 last:border-b-0 last:pb-0">
              <span className="font-display text-[13px] leading-tight text-ink-soft">{item.label}</span>
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-mute">{item.count}</span>
            </div>
          ))}
        </div>
      ) : <p className="mt-3 font-display text-[13px] leading-[1.45] text-ink-soft">{empty}</p>}
    </section>
  );
}

function formatPercent(value?: number | null) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "n/a";
  return `${Math.round(value * 100)}%`;
}

function formatDateTime(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function FindingsEditor({
  run,
  onSave,
}: {
  run: ExecutionRun;
  onSave: (payload: { conclusion?: string; findings?: string; nextSteps?: string }) => Promise<void>;
}) {
  const [conclusion, setConclusion] = useState(run.findings?.conclusion ?? "");
  const [findings, setFindings] = useState(run.findings?.findings ?? "");
  const [nextSteps, setNextSteps] = useState(run.findings?.next_steps ?? "");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await onSave({ conclusion, findings, nextSteps });
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="border border-ink bg-paper">
      <div className="border-b border-ink px-4 py-3">
        <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">
          Conclusion and findings
        </div>
        <p className="mt-1 font-display text-[13px] leading-[1.45] text-ink-soft">
          Capture the scientific outcome and operational lessons from this run. These notes are included in exports and saved to the run record.
        </p>
      </div>
      <div className="grid gap-4 p-4">
        <label>
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-mute">Conclusion</span>
          <textarea value={conclusion} onChange={(event) => setConclusion(event.target.value)} rows={3} className="mt-1 w-full resize-none border border-ink/20 bg-paper-deep/30 px-3 py-2 font-display text-[14px] leading-[1.45] focus:outline-none" placeholder="Did the run support, reject, or partially support the hypothesis?" />
        </label>
        <label>
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-mute">Findings</span>
          <textarea value={findings} onChange={(event) => setFindings(event.target.value)} rows={5} className="mt-1 w-full resize-none border border-ink/20 bg-paper-deep/30 px-3 py-2 font-display text-[14px] leading-[1.45] focus:outline-none" placeholder="Summarize measurements, observations, deviations, surprising results, and interpretation." />
        </label>
        <label>
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-mute">Recommended next steps</span>
          <textarea value={nextSteps} onChange={(event) => setNextSteps(event.target.value)} rows={3} className="mt-1 w-full resize-none border border-ink/20 bg-paper-deep/30 px-3 py-2 font-display text-[14px] leading-[1.45] focus:outline-none" placeholder="Repeat, adjust protocol, update SOP, run a follow-up condition..." />
        </label>
        <button onClick={() => void save()} disabled={saving} className="inline-flex w-fit items-center gap-2 bg-ink px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.16em] text-paper hover:bg-rust disabled:opacity-40">
          <Save className="h-3.5 w-3.5" strokeWidth={1.5} />
          {saving ? "Saving" : "Save findings"}
        </button>
      </div>
    </section>
  );
}

function RunExportButtons({ workflow, run }: { workflow: Workflow; run: ExecutionRun }) {
  return (
    <div className="flex flex-wrap gap-2">
      <button onClick={() => exportRunJson(workflow, run)} className="inline-flex items-center gap-2 border border-ink/30 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-ink hover:border-ink">
        <Download className="h-3.5 w-3.5" strokeWidth={1.5} />
        JSON export
      </button>
      <button onClick={() => exportRunMarkdown(workflow, run)} className="inline-flex items-center gap-2 border border-ink/30 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-ink hover:border-ink">
        <Download className="h-3.5 w-3.5" strokeWidth={1.5} />
        Markdown export
      </button>
    </div>
  );
}

function exportRunJson(workflow: Workflow, run: ExecutionRun) {
  downloadText(
    `${run.run_id}_full_provenance.json`,
    JSON.stringify({ exported_at: new Date().toISOString(), workflow, run }, null, 2),
    "application/json"
  );
}

function exportRunMarkdown(workflow: Workflow, run: ExecutionRun) {
  const lines = [
    `# Run Export: ${run.run_id}`,
    "",
    `Workflow: ${workflow.workflow_id}`,
    `Status: ${run.status}`,
    `Created: ${run.created_at}`,
    `Completed: ${run.completed_at ?? "not completed"}`,
    "",
    "## Hypothesis",
    "",
    workflow.hypothesis,
    "",
    "## Conclusion",
    "",
    run.findings?.conclusion || "Not recorded.",
    "",
    "## Findings",
    "",
    run.findings?.findings || "Not recorded.",
    "",
    "## Recommended Next Steps",
    "",
    run.findings?.next_steps || "Not recorded.",
    "",
    "## Run Preparation",
    "",
    workflow.run_preparation
      ? `Readiness: ${workflow.run_preparation.readiness_status}`
      : "No run preparation checklist saved.",
    "",
    ...(workflow.run_preparation
      ? flattenPrep(workflow.run_preparation).map((item) => `- [${item.status}] ${item.category}: ${item.label} — ${item.rationale}${item.note ? ` Note: ${item.note}` : ""}`)
      : []),
    "",
    "## Steps",
    "",
    ...run.steps.flatMap((step) => [
      `### ${step.order}. ${step.title}`,
      "",
      `Status: ${step.status}`,
      `Classification: ${step.classification}`,
      `Started: ${step.started_at ?? "not started"}`,
      `Completed: ${step.completed_at ?? "not completed"}`,
      "",
      `Operator note: ${step.operator_note || "none"}`,
      "",
      `Deviation note: ${step.deviation_note || "none"}`,
      "",
      "Actuals:",
      "```json",
      JSON.stringify(step.actuals ?? {}, null, 2),
      "```",
      "",
      `Attachments: ${step.attachments.length ? step.attachments.map((a) => a.filename).join(", ") : "none"}`,
      "",
    ]),
    "## Workflow Trace",
    "",
    ...workflow.trace.map((event) => `- ${event.timestamp} | ${event.event_type} | ${event.summary}${event.scientist_note ? ` | Note: ${event.scientist_note}` : ""}`),
    "",
    "## Run Events",
    "",
    ...run.events.map((event) => `- ${event.timestamp} | ${event.event_type} | ${event.summary}`),
  ];
  downloadText(`${run.run_id}_full_provenance.md`, lines.join("\n"), "text/markdown");
}

function downloadText(filename: string, text: string, type: string) {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
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
