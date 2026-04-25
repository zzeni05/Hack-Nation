import type { StepClassification, NoveltySignal } from "@/types";

export const CLASSIFICATION_META: Record<
  StepClassification,
  { label: string; tone: "neutral" | "rust" | "ochre" | "moss"; short: string }
> = {
  exact_reuse: {
    label: "Exact SOP reuse",
    short: "EXACT",
    tone: "moss",
  },
  adapted_from_sop: {
    label: "Adapted from SOP",
    short: "ADAPTED",
    tone: "neutral",
  },
  external_literature_supported: {
    label: "External literature",
    short: "EXTERNAL",
    tone: "neutral",
  },
  decision_required: {
    label: "Decision required",
    short: "DECIDE",
    tone: "rust",
  },
  missing_context: {
    label: "Missing context",
    short: "MISSING",
    tone: "rust",
  },
  facility_constraint: {
    label: "Facility constraint",
    short: "FACILITY",
    tone: "neutral",
  },
  historically_modified: {
    label: "Historically modified",
    short: "HISTORY",
    tone: "ochre",
  },
  scientist_authored: {
    label: "Scientist authored",
    short: "CUSTOM",
    tone: "ochre",
  },
};

export const NOVELTY_META: Record<
  NoveltySignal,
  { label: string; tone: "rust" | "ochre" | "moss"; description: string }
> = {
  not_found: {
    label: "Not found",
    tone: "moss",
    description: "No closely matching prior work found in indexed literature.",
  },
  similar_work_exists: {
    label: "Similar work exists",
    tone: "ochre",
    description:
      "Adjacent prior work found. Hypothesis sits in known parameter space but specific test conditions appear novel.",
  },
  exact_match_found: {
    label: "Exact match found",
    tone: "rust",
    description:
      "An apparently identical or near-identical experiment has been published.",
  },
};

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function classNames(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}
