"use client";

import { Check, CircleAlert, Lock } from "lucide-react";
import { classNames } from "@/lib/display";

export type AppStage =
  | "lab_context"
  | "hypothesis"
  | "retrieval"
  | "protocol_basis"
  | "workflow_setup"
  | "prepare_run"
  | "execute"
  | "review";

export interface StageItem {
  id: AppStage;
  number: string;
  label: string;
  eyebrow: string;
  status: "available" | "active" | "complete" | "locked" | "needs_review";
  note?: string;
}

interface Props {
  stages: StageItem[];
  activeStage: AppStage;
  onStageChange: (stage: AppStage) => void;
  children: React.ReactNode;
}

export function GuidedShell({ stages, activeStage, onStageChange, children }: Props) {
  return (
    <section className="relative border-t border-ink bg-paper-deep/30">
      <div className="mx-auto grid max-w-[1480px] gap-8 px-8 py-8 lg:grid-cols-[250px_1fr]">
        <StageRail stages={stages} activeStage={activeStage} onStageChange={onStageChange} />
        <div className="min-w-0">{children}</div>
      </div>
    </section>
  );
}

function StageRail({
  stages,
  activeStage,
  onStageChange,
}: {
  stages: StageItem[];
  activeStage: AppStage;
  onStageChange: (stage: AppStage) => void;
}) {
  return (
    <aside className="lg:sticky lg:top-4 lg:self-start">
      <div className="border border-ink bg-paper">
        <div className="border-b border-ink px-4 py-3">
          <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-rust">
            Guided workflow
          </div>
          <div className="mt-1 font-display text-[22px] leading-none tracking-tight">
            Lab operations engine
          </div>
        </div>
        <ol className="divide-y divide-rule">
          {stages.map((stage) => {
            const active = stage.id === activeStage;
            const locked = stage.status === "locked";
            const Icon =
              stage.status === "complete"
                ? Check
                : stage.status === "needs_review"
                ? CircleAlert
                : locked
                ? Lock
                : null;
            return (
              <li key={stage.id}>
                <button
                  type="button"
                  disabled={locked}
                  onClick={() => onStageChange(stage.id)}
                  className={classNames(
                    "grid w-full grid-cols-[34px_1fr_18px] gap-2 px-4 py-3 text-left transition-colors",
                    active ? "bg-ink text-paper" : "hover:bg-paper-deep/50",
                    locked && "cursor-not-allowed opacity-45"
                  )}
                >
                  <span
                    className={classNames(
                      "flex h-7 w-7 items-center justify-center border font-mono text-[10px] tabular-nums",
                      active ? "border-paper/50" : "border-ink/30"
                    )}
                  >
                    {stage.number}
                  </span>
                  <span className="min-w-0">
                    <span className="block font-mono text-[9px] uppercase tracking-[0.18em] opacity-70">
                      {stage.eyebrow}
                    </span>
                    <span className="mt-0.5 block font-display text-[15px] leading-tight">
                      {stage.label}
                    </span>
                    {stage.note && (
                      <span className="mt-1 block font-display text-[12px] leading-[1.25] opacity-70">
                        {stage.note}
                      </span>
                    )}
                  </span>
                  {Icon && <Icon className="mt-1 h-3.5 w-3.5" strokeWidth={1.7} />}
                </button>
              </li>
            );
          })}
        </ol>
      </div>
    </aside>
  );
}

export function StageHeader({
  number,
  eyebrow,
  title,
  children,
}: {
  number: string;
  eyebrow: string;
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-6 border-b border-ink pb-4">
      <div className="flex items-baseline gap-3">
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">
          §{number}
        </span>
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">
          {eyebrow}
        </span>
      </div>
      <h2 className="mt-2 font-display text-[34px] leading-[1.03] tracking-tight">
        {title}
      </h2>
      {children && <div className="mt-3 max-w-[78ch] font-display text-[15px] leading-[1.55] text-ink-soft">{children}</div>}
    </div>
  );
}
