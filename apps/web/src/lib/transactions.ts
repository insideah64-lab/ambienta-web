// Typed bridge: all rules and audit events remain in original web/domain.mjs.
// @ts-ignore Legacy JavaScript module deliberately preserved for V1 compatibility.
import { addMeasure, recordInspection, addEvidence, reviewEvidence,
  changeMeasureStatus, openFinding, addCorrectiveAction, validateState
} from '../../../../web/domain.mjs';
import type { DemoState } from './demo';

export type MeasureInput = {
  programId:string; impactId:string; title:string; detail:string; owner:string;
  indicator:string; frequency:string; due:string; criterion:string;
};
export type InspectionInput = {
  measureId:string; date:string; result:string; note:string; assignee:string;
};
export type EvidenceInput = {
  measureId:string; inspectionId:string; label:string; reference:string;
};
export type FindingInput = {inspectionId:string; title:string; description:string; severity:string};
export type ActionInput = {findingId:string; action:string; owner:string; due:string};
export type Transaction = (previous:DemoState)=>DemoState;

export function createMeasure(input:MeasureInput, actor:string):Transaction {
  return current => addMeasure(current,input,actor) as DemoState;
}
export function createInspection(input:InspectionInput, actor:string):Transaction {
  return current => recordInspection(current,input,actor) as DemoState;
}
export function registerEvidence(input:EvidenceInput, actor:string):Transaction {
  return current => addEvidence(current,input,actor) as DemoState;
}
export function decideEvidence(id:string,decision:'validada'|'rechazada',reviewer:string):Transaction {
  return current => reviewEvidence(current,id,decision,reviewer) as DemoState;
}
export function setMeasureStatus(id:string,status:string,actor:string):Transaction {
  return current => changeMeasureStatus(current,id,status,actor) as DemoState;
}
export function createFinding(input:FindingInput,actor:string):Transaction {
  return current => openFinding(current,input,actor) as DemoState;
}
export function createCorrective(input:ActionInput,actor:string):Transaction {
  return current => addCorrectiveAction(current,input,actor) as DemoState;
}
export function applyAndPersist(current:DemoState,operation:Transaction,storage:Pick<Storage,'setItem'>,key:string):DemoState {
  // No React state mutation or success feedback before the original domain validates.
  const next=operation(current);
  if(next===current)throw new Error('La operación no generó una nueva revisión.');
  validateState(next);
  if(next.revision!==current.revision+1)throw new Error('Revisión de datos incompatible.');
  storage.setItem(key,JSON.stringify(next));
  return next;
}
