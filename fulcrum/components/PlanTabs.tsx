"use client";

import { useEffect, useMemo, useState } from "react";
import type { Dispatch, ReactNode, SetStateAction } from "react";
import type { BudgetLine, MaterialItem, RiskItem, TimelinePhase, ValidationItem, Workflow } from "@/types";
import { formatCurrency, classNames } from "@/lib/display";
import { AlertOctagon, Beaker, CalendarDays, Check, Coins, Plus, Save, ShieldCheck, Trash2 } from "lucide-react";

const TABS = [
  { id: "materials", label: "Materials", icon: Beaker },
  { id: "budget", label: "Budget", icon: Coins },
  { id: "timeline", label: "Timeline", icon: CalendarDays },
  { id: "validation", label: "Validation", icon: ShieldCheck },
  { id: "risks", label: "Risks", icon: AlertOctagon },
] as const;

type TabId = (typeof TABS)[number]["id"];
type Plan = Workflow["plan"];

interface Props {
  workflow: Workflow;
  onSavePlan?: (plan: Plan, note?: string) => Promise<void>;
}

export function PlanTabs({ workflow, onSavePlan }: Props) {
  const [tab, setTab] = useState<TabId>("materials");
  const [draft, setDraft] = useState<Plan>(() => clonePlan(workflow.plan));
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  useEffect(() => {
    setDraft(clonePlan(workflow.plan));
    setSavedAt(null);
  }, [workflow.workflow_id, workflow.updated_at]);

  const totals = useMemo(() => {
    const totalBudget = draft.budget.reduce((sum, b) => sum + numberOrZero(b.total), 0);
    const totalMaterials = draft.materials.reduce((sum, m) => sum + numberOrZero(m.total), 0);
    const totalWeeks = Math.max(1, ...draft.timeline.map((p) => numberOrZero(p.end_week)));
    const confirmCount = [
      ...draft.materials,
      ...draft.budget,
      ...draft.timeline,
      ...draft.validation,
      ...draft.risks,
    ].filter((item) => item.needs_user_confirmation && !item.confirmed).length;
    return { totalBudget, totalMaterials, totalWeeks, confirmCount };
  }, [draft]);

  async function save() {
    if (!onSavePlan) return;
    setSaving(true);
    try {
      await onSavePlan(draft, note.trim() || undefined);
      setSavedAt(new Date().toLocaleTimeString());
      setNote("");
    } finally {
      setSaving(false);
    }
  }

  function confirmAllCurrentTab() {
    setDraft((current) => ({
      ...current,
      [tab]: current[tab].map((item) => confirmItem(item)),
    }));
  }

  return (
    <section className="relative">
      <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-ink pb-2">
        <div className="flex items-baseline gap-3">
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">
            §05
          </span>
          <h2 className="font-display text-[22px] leading-none tracking-tight">
            The Operational Plan
          </h2>
        </div>
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">
          {formatCurrency(totals.totalBudget)} · {totals.totalWeeks}-week schedule · {totals.confirmCount} need confirmation
        </span>
      </div>

      <div className="mt-4 border border-ink/20 bg-paper-deep/20 p-3">
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={confirmAllCurrentTab}
            className="inline-flex items-center gap-2 border border-moss/50 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-moss hover:bg-moss hover:text-paper"
          >
            <Check className="h-3.5 w-3.5" strokeWidth={1.5} />
            Confirm visible tab
          </button>
          <input
            value={note}
            onChange={(event) => setNote(event.target.value)}
            className="min-w-[220px] flex-1 border border-ink/20 bg-paper px-3 py-2 font-display text-[13px] focus:outline-none"
            placeholder="Optional note explaining plan edits"
          />
          <button
            onClick={() => void save()}
            disabled={!onSavePlan || saving}
            className="inline-flex items-center gap-2 bg-ink px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.16em] text-paper hover:bg-rust disabled:opacity-30"
          >
            <Save className="h-3.5 w-3.5" strokeWidth={1.5} />
            {saving ? "Saving" : "Save plan"}
          </button>
        </div>
        <div className="mt-2 font-mono text-[9px] uppercase tracking-[0.16em] text-ink-mute">
          Edit extracted items before execution. Confirmed items are kept; removed items are excluded from the saved workflow plan.
          {savedAt && <span className="text-moss"> Saved {savedAt}</span>}
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-0 border-b border-ink/20">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = t.id === tab;
          const needs = draft[t.id].filter((item) => item.needs_user_confirmation && !item.confirmed).length;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={classNames(
                "relative -mb-px flex items-center gap-2 border-b-2 px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.18em] transition-colors",
                active ? "border-ink text-ink" : "border-transparent text-ink-mute hover:text-ink"
              )}
            >
              <Icon className="h-3.5 w-3.5" strokeWidth={1.5} />
              {t.label}
              {needs > 0 && <span className="text-ochre">({needs})</span>}
            </button>
          );
        })}
      </div>

      <div className="mt-6">
        {tab === "materials" && <MaterialsEditor draft={draft} setDraft={setDraft} total={totals.totalMaterials} />}
        {tab === "budget" && <BudgetEditor draft={draft} setDraft={setDraft} total={totals.totalBudget} />}
        {tab === "timeline" && <TimelineEditor draft={draft} setDraft={setDraft} totalWeeks={totals.totalWeeks} />}
        {tab === "validation" && <ValidationEditor draft={draft} setDraft={setDraft} />}
        {tab === "risks" && <RisksEditor draft={draft} setDraft={setDraft} />}
      </div>
    </section>
  );
}

function MaterialsEditor({ draft, setDraft, total }: { draft: Plan; setDraft: PlanSetter; total: number }) {
  return (
    <div className="space-y-3">
      <EditorToolbar
        title={`${draft.materials.length} materials · ${formatCurrency(total)} subtotal`}
        onAdd={() => setDraft((plan) => ({ ...plan, materials: [...plan.materials, newMaterial()] }))}
      />
      <div className="space-y-3">
        {draft.materials.map((item, index) => (
          <EditableCard key={index} confirmed={item.confirmed} needsConfirmation={item.needs_user_confirmation} onConfirm={() => updateArray(setDraft, "materials", index, confirmItem)} onRemove={() => removeArrayItem(setDraft, "materials", index)}>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
              <TextField label="Name" value={item.name} onChange={(value) => updateArray(setDraft, "materials", index, (m) => ({ ...m, name: value }))} className="xl:col-span-2" />
              <TextField label="Purpose" value={item.purpose} onChange={(value) => updateArray(setDraft, "materials", index, (m) => ({ ...m, purpose: value }))} className="xl:col-span-2" />
              <TextField label="Supplier" value={item.supplier} onChange={(value) => updateArray(setDraft, "materials", index, (m) => ({ ...m, supplier: value }))} />
              <TextField label="Catalog" value={item.catalog} onChange={(value) => updateArray(setDraft, "materials", index, (m) => ({ ...m, catalog: value }))} />
              <TextField label="Quantity" value={item.quantity} onChange={(value) => updateArray(setDraft, "materials", index, (m) => ({ ...m, quantity: value }))} />
              <NumberField label="Unit cost" value={item.unit_cost} onChange={(value) => updateArray(setDraft, "materials", index, (m) => ({ ...m, unit_cost: value, total: value }))} />
              <NumberField label="Total" value={item.total} onChange={(value) => updateArray(setDraft, "materials", index, (m) => ({ ...m, total: value }))} />
              <SelectField label="Confidence" value={item.confidence} options={["high", "medium", "low"]} onChange={(value) => updateArray(setDraft, "materials", index, (m) => ({ ...m, confidence: value as MaterialItem["confidence"] }))} />
              <TextField label="Catalog URL" value={item.catalog_url ?? ""} onChange={(value) => updateArray(setDraft, "materials", index, (m) => ({ ...m, catalog_url: value }))} className="xl:col-span-3" />
              <TextField label="Price source" value={item.price_source ?? ""} onChange={(value) => updateArray(setDraft, "materials", index, (m) => ({ ...m, price_source: value }))} />
              <TextField label="Quote date" value={item.quote_date ?? ""} onChange={(value) => updateArray(setDraft, "materials", index, (m) => ({ ...m, quote_date: value }))} />
              <TextField label="Procurement status" value={item.procurement_status ?? ""} onChange={(value) => updateArray(setDraft, "materials", index, (m) => ({ ...m, procurement_status: value }))} />
            </div>
            {item.catalog_url && (
              <a href={item.catalog_url} target="_blank" rel="noreferrer" className="mt-3 inline-block font-mono text-[9px] uppercase tracking-[0.14em] text-rust">
                Open supplier/catalog link
              </a>
            )}
            <EvidenceLine basis={item.basis} estimateType={item.estimate_type} gap={item.gap?.reason} />
            {item.procurement_notes && <div className="mt-2 font-display text-[12px] leading-[1.35] text-ink-soft">{item.procurement_notes}</div>}
          </EditableCard>
        ))}
      </div>
    </div>
  );
}

function BudgetEditor({ draft, setDraft, total }: { draft: Plan; setDraft: PlanSetter; total: number }) {
  return (
    <div className="space-y-3">
      <EditorToolbar title={`${draft.budget.length} budget lines · ${formatCurrency(total)} total`} onAdd={() => setDraft((plan) => ({ ...plan, budget: [...plan.budget, newBudget()] }))} />
      {draft.budget.map((item, index) => (
        <EditableCard key={index} confirmed={item.confirmed} needsConfirmation={item.needs_user_confirmation} onConfirm={() => updateArray(setDraft, "budget", index, confirmItem)} onRemove={() => removeArrayItem(setDraft, "budget", index)}>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
            <TextField label="Item" value={item.item} onChange={(value) => updateArray(setDraft, "budget", index, (b) => ({ ...b, item: value }))} className="xl:col-span-2" />
            <SelectField label="Category" value={item.category} options={["Reagents", "Consumables", "Equipment", "Personnel", "Overhead"]} onChange={(value) => updateArray(setDraft, "budget", index, (b) => ({ ...b, category: value as BudgetLine["category"] }))} />
            <TextField label="Quantity" value={item.quantity} onChange={(value) => updateArray(setDraft, "budget", index, (b) => ({ ...b, quantity: value }))} />
            <NumberField label="Total" value={item.total} onChange={(value) => updateArray(setDraft, "budget", index, (b) => ({ ...b, total: value }))} />
            <SelectField label="Confidence" value={item.confidence} options={["high", "medium", "low"]} onChange={(value) => updateArray(setDraft, "budget", index, (b) => ({ ...b, confidence: value as BudgetLine["confidence"] }))} />
            <TextField label="Basis" value={item.basis} onChange={(value) => updateArray(setDraft, "budget", index, (b) => ({ ...b, basis: value }))} className="xl:col-span-6" />
          </div>
          <EvidenceLine estimateType={item.estimate_type} gap={item.gap?.reason} />
        </EditableCard>
      ))}
    </div>
  );
}

function TimelineEditor({ draft, setDraft, totalWeeks }: { draft: Plan; setDraft: PlanSetter; totalWeeks: number }) {
  return (
    <div className="space-y-3">
      <EditorToolbar title={`${draft.timeline.length} phases · ${totalWeeks} week schedule`} onAdd={() => setDraft((plan) => ({ ...plan, timeline: [...plan.timeline, newTimeline()] }))} />
      {draft.timeline.map((phase, index) => (
        <EditableCard key={index} confirmed={phase.confirmed} needsConfirmation={phase.needs_user_confirmation} onConfirm={() => updateArray(setDraft, "timeline", index, confirmItem)} onRemove={() => removeArrayItem(setDraft, "timeline", index)}>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
            <TextField label="Phase" value={phase.phase} onChange={(value) => updateArray(setDraft, "timeline", index, (p) => ({ ...p, phase: value }))} className="xl:col-span-2" />
            <TextField label="Duration" value={phase.duration} onChange={(value) => updateArray(setDraft, "timeline", index, (p) => ({ ...p, duration: value }))} />
            <NumberField label="Start week" value={phase.start_week} onChange={(value) => updateArray(setDraft, "timeline", index, (p) => ({ ...p, start_week: Math.max(1, Math.round(value)) }))} />
            <NumberField label="End week" value={phase.end_week} onChange={(value) => updateArray(setDraft, "timeline", index, (p) => ({ ...p, end_week: Math.max(1, Math.round(value)) }))} />
            <label className="flex items-end gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-mute">
              <input type="checkbox" checked={phase.critical_path} onChange={(event) => updateArray(setDraft, "timeline", index, (p) => ({ ...p, critical_path: event.target.checked }))} />
              Critical path
            </label>
            <TextField label="Dependencies" value={phase.dependencies.join(", ")} onChange={(value) => updateArray(setDraft, "timeline", index, (p) => ({ ...p, dependencies: csv(value) }))} className="xl:col-span-3" />
            <TextField label="Notes" value={phase.notes ?? ""} onChange={(value) => updateArray(setDraft, "timeline", index, (p) => ({ ...p, notes: value }))} className="xl:col-span-3" />
          </div>
          <EvidenceLine basis={phase.basis} estimateType={phase.estimate_type} gap={phase.gap?.reason} />
        </EditableCard>
      ))}
    </div>
  );
}

function ValidationEditor({ draft, setDraft }: { draft: Plan; setDraft: PlanSetter }) {
  return (
    <div className="space-y-3">
      <EditorToolbar title={`${draft.validation.length} validation items`} onAdd={() => setDraft((plan) => ({ ...plan, validation: [...plan.validation, newValidation()] }))} />
      {draft.validation.map((item, index) => (
        <EditableCard key={index} confirmed={item.confirmed} needsConfirmation={item.needs_user_confirmation} onConfirm={() => updateArray(setDraft, "validation", index, confirmItem)} onRemove={() => removeArrayItem(setDraft, "validation", index)}>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
            <TextField label="Endpoint" value={item.endpoint} onChange={(value) => updateArray(setDraft, "validation", index, (v) => ({ ...v, endpoint: value }))} className="xl:col-span-2" />
            <SelectField label="Type" value={item.type} options={["primary", "secondary"]} onChange={(value) => updateArray(setDraft, "validation", index, (v) => ({ ...v, type: value as ValidationItem["type"] }))} />
            <TextField label="Assay" value={item.assay} onChange={(value) => updateArray(setDraft, "validation", index, (v) => ({ ...v, assay: value }))} />
            <TextField label="Threshold" value={item.threshold} onChange={(value) => updateArray(setDraft, "validation", index, (v) => ({ ...v, threshold: value }))} className="xl:col-span-2" />
            <TextField label="Controls" value={item.controls.join(", ")} onChange={(value) => updateArray(setDraft, "validation", index, (v) => ({ ...v, controls: csv(value) }))} className="xl:col-span-6" />
          </div>
        </EditableCard>
      ))}
    </div>
  );
}

function RisksEditor({ draft, setDraft }: { draft: Plan; setDraft: PlanSetter }) {
  return (
    <div className="space-y-3">
      <EditorToolbar title={`${draft.risks.length} risks`} onAdd={() => setDraft((plan) => ({ ...plan, risks: [...plan.risks, newRisk()] }))} />
      {draft.risks.map((item, index) => (
        <EditableCard key={index} confirmed={item.confirmed} needsConfirmation={item.needs_user_confirmation} onConfirm={() => updateArray(setDraft, "risks", index, confirmItem)} onRemove={() => removeArrayItem(setDraft, "risks", index)}>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
            <SelectField label="Category" value={item.category} options={["operational", "scientific", "safety"]} onChange={(value) => updateArray(setDraft, "risks", index, (r) => ({ ...r, category: value as RiskItem["category"] }))} />
            <SelectField label="Severity" value={item.severity} options={["low", "medium", "high"]} onChange={(value) => updateArray(setDraft, "risks", index, (r) => ({ ...r, severity: value as RiskItem["severity"] }))} />
            <TextField label="Risk" value={item.risk} onChange={(value) => updateArray(setDraft, "risks", index, (r) => ({ ...r, risk: value }))} className="xl:col-span-4" />
            <TextField label="Mitigation" value={item.mitigation} onChange={(value) => updateArray(setDraft, "risks", index, (r) => ({ ...r, mitigation: value }))} className="xl:col-span-6" />
          </div>
        </EditableCard>
      ))}
    </div>
  );
}

function EditableCard({
  children,
  confirmed,
  needsConfirmation,
  onConfirm,
  onRemove,
}: {
  children: ReactNode;
  confirmed?: boolean;
  needsConfirmation?: boolean;
  onConfirm: () => void;
  onRemove: () => void;
}) {
  return (
    <div className={classNames("border bg-paper-deep/30 p-4", confirmed ? "border-moss/40" : needsConfirmation ? "border-ochre/50" : "border-ink/15")}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1 font-mono text-[9px] uppercase tracking-[0.14em]">
          {confirmed ? (
            <span className="border border-moss/50 px-1.5 py-0.5 text-moss">confirmed</span>
          ) : needsConfirmation ? (
            <span className="border border-ochre/50 px-1.5 py-0.5 text-ochre">needs confirmation</span>
          ) : (
            <span className="border border-ink/20 px-1.5 py-0.5 text-ink-mute">unconfirmed</span>
          )}
        </div>
        <div className="flex gap-2">
          <button onClick={onConfirm} className="inline-flex items-center gap-1 border border-moss/50 px-2 py-1.5 font-mono text-[9px] uppercase tracking-[0.14em] text-moss hover:bg-moss hover:text-paper">
            <Check className="h-3 w-3" /> Keep
          </button>
          <button onClick={onRemove} className="inline-flex items-center gap-1 border border-rust/40 px-2 py-1.5 font-mono text-[9px] uppercase tracking-[0.14em] text-rust hover:bg-rust hover:text-paper">
            <Trash2 className="h-3 w-3" /> Remove
          </button>
        </div>
      </div>
      {children}
    </div>
  );
}

function EditorToolbar({ title, onAdd }: { title: string; onAdd: () => void }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink/20 pb-3">
      <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">{title}</div>
      <button onClick={onAdd} className="inline-flex items-center gap-2 border border-ink/30 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-ink hover:border-rust hover:text-rust">
        <Plus className="h-3.5 w-3.5" strokeWidth={1.5} />
        Add item
      </button>
    </div>
  );
}

function TextField({ label, value, onChange, className }: { label: string; value: string; onChange: (value: string) => void; className?: string }) {
  return (
    <label className={classNames("font-mono text-[10px] uppercase tracking-[0.18em] text-ink-mute", className)}>
      {label}
      <input value={value ?? ""} onChange={(event) => onChange(event.target.value)} className="mt-1 w-full border border-ink/20 bg-paper px-2 py-2 font-display text-[13px] normal-case tracking-normal text-ink focus:outline-none" />
    </label>
  );
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <label className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-mute">
      {label}
      <input type="number" value={Number.isFinite(value) ? value : 0} onChange={(event) => onChange(Number(event.target.value))} className="mt-1 w-full border border-ink/20 bg-paper px-2 py-2 font-mono text-[13px] normal-case tracking-normal text-ink focus:outline-none" />
    </label>
  );
}

function SelectField({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return (
    <label className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-mute">
      {label}
      <select value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 w-full border border-ink/20 bg-paper px-2 py-2 font-mono text-[12px] text-ink focus:outline-none">
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
  );
}

function EvidenceLine({ basis, estimateType, gap }: { basis?: string; estimateType?: string; gap?: string }) {
  if (!basis && !estimateType && !gap) return null;
  return (
    <div className="mt-3 border-t border-rule pt-2 font-display text-[12px] leading-[1.35] text-ink-soft">
      {estimateType && <span className="mr-2 font-mono text-[9px] uppercase tracking-[0.14em] text-ink-mute">{estimateType.replaceAll("_", " ")}</span>}
      {basis}
      {gap && <span className="block font-mono text-[9px] uppercase tracking-[0.14em] text-ochre">Gap · {gap}</span>}
    </div>
  );
}

type PlanSetter = Dispatch<SetStateAction<Plan>>;
type PlanArrayKey = "materials" | "budget" | "timeline" | "validation" | "risks";

function updateArray<K extends PlanArrayKey>(
  setDraft: PlanSetter,
  key: K,
  index: number,
  updater: (item: Plan[K][number]) => Plan[K][number]
) {
  setDraft((plan) => ({
    ...plan,
    [key]: plan[key].map((item, i) => (i === index ? updater(item) : item)),
  }));
}

function removeArrayItem<K extends PlanArrayKey>(setDraft: PlanSetter, key: K, index: number) {
  setDraft((plan) => ({ ...plan, [key]: plan[key].filter((_, i) => i !== index) }));
}

function confirmItem<T extends { needs_user_confirmation?: boolean; confirmed?: boolean }>(item: T): T {
  return { ...item, needs_user_confirmation: false, confirmed: true };
}

function clonePlan(plan: Plan): Plan {
  return {
    materials: plan.materials.map((item) => ({ ...item, gap: item.gap ? { ...item.gap, resolution_options: [...item.gap.resolution_options] } : undefined })),
    budget: plan.budget.map((item) => ({ ...item, gap: item.gap ? { ...item.gap, resolution_options: [...item.gap.resolution_options] } : undefined })),
    timeline: plan.timeline.map((item) => ({ ...item, dependencies: [...item.dependencies], gap: item.gap ? { ...item.gap, resolution_options: [...item.gap.resolution_options] } : undefined })),
    validation: plan.validation.map((item) => ({ ...item, controls: [...item.controls] })),
    risks: plan.risks.map((item) => ({ ...item })),
  };
}

function csv(value: string): string[] {
  return value.split(",").map((part) => part.trim()).filter(Boolean);
}

function numberOrZero(value: number): number {
  return Number.isFinite(value) ? value : 0;
}

function newMaterial(): MaterialItem {
  return {
    name: "New material",
    purpose: "",
    supplier: "",
    catalog: "",
    quantity: "",
    unit_cost: 0,
    total: 0,
    confidence: "low",
    estimate_type: "scientist_added",
    confirmed: false,
    needs_user_confirmation: true,
    price_source: "scientist_added",
    quote_date: new Date().toISOString().slice(0, 10),
    procurement_status: "needs_confirmation",
    procurement_notes: "Scientist-added material; confirm supplier URL, quote, and catalog before ordering.",
  };
}

function newBudget(): BudgetLine {
  return {
    item: "New budget line",
    category: "Reagents",
    quantity: "",
    total: 0,
    basis: "Scientist added during plan curation.",
    confidence: "low",
    estimate_type: "scientist_added",
    confirmed: false,
    needs_user_confirmation: true,
  };
}

function newTimeline(): TimelinePhase {
  return {
    phase: "New phase",
    duration: "1 week",
    start_week: 1,
    end_week: 1,
    dependencies: [],
    critical_path: false,
    notes: "",
    estimate_type: "scientist_added",
    confirmed: false,
    needs_user_confirmation: true,
  };
}

function newValidation(): ValidationItem {
  return {
    endpoint: "New endpoint",
    type: "secondary",
    assay: "",
    controls: [],
    threshold: "",
    confirmed: false,
    needs_user_confirmation: true,
  };
}

function newRisk(): RiskItem {
  return {
    category: "operational",
    severity: "medium",
    risk: "New risk",
    mitigation: "",
    confirmed: false,
    needs_user_confirmation: true,
  };
}
