// Reuse the approved demo domain. Never duplicate or fabricate its figures.
// This module is an adapter for the existing framework-free application.
// @ts-ignore: Legacy ESM domain is intentionally not yet converted to TypeScript.
import { createDemoState, validateState, summary, exportJson, STATUS_LABELS } from '../../../../web/domain.mjs';

export type DemoProject = {
  id: string; name: string; province: string; phase: string;
  status: string; kind: string; proponent: string; technicalLead: string;
};
export type DemoMeasure = {
  id: string; programId: string; title: string; detail: string;
  owner: string; status: string; due: string; frequency: string;
  indicator: string; impactIds: string[];
};
export type DemoInspection = { id: string; result: string; date: string; assignee: string; measureId: string; note: string };
export type DemoState = {
  schema: number; demo: boolean; revision: number; project: DemoProject;
  programs: Array<{ id: string; name: string; kind: string }>;
  measures: DemoMeasure[];
  inspections: DemoInspection[];
  impacts: Array<{ id: string; name: string; factor: string; phase: string; sign: string }>;
  findings: Array<{ id: string; title: string; description: string; status: string; severity: string; inspectionId: string; openedAt: string }>;
  audit: Array<{ id: string; actor: string; at: string; details: string; event: string }>;
  evidence: Array<{ id: string; measureId: string | null; inspectionId: string | null;
    label: string; reference: string; author: string; status: string;
    createdAt: string; reviewer: string | null; reviewedAt: string | null }>;
  correctiveActions: Array<{ id: string; findingId: string; action: string;
    owner: string; due: string; status: string; verification: string }>;
};
export type Summary = {
  programs: number; measures: number; inReview: number; verified: number;
  inspectionsPending: number; inspectionsObserved: number;
  evidencePending: number; findingsOpen: number; correctiveOpen: number;
};
export const STORAGE_KEY = 'ambienta-pga-demo-v05';

export function readDemoState(): DemoState {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed: unknown = JSON.parse(saved);
      validateState(parsed);
      return parsed as DemoState;
    }
  } catch { /* Corrupt/missing local demo data: safely show original fixture in memory. */ }
  return createDemoState() as DemoState;
}
export function initialDemoState(): DemoState { return createDemoState() as DemoState; }
export function demoSummary(data: DemoState): Summary { return summary(data) as Summary; }
export function demoExport(data: DemoState): string { return exportJson(data) as string; }
export function statusText(status: string): string {
  return (STATUS_LABELS as Record<string,string>)[status] || status || 'Sin estado';
}
export function countsByResult(data: DemoState, result: string): number {
  return data.inspections.filter(row => row.result === result).length;
}
