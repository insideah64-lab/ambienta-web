import {auditDocumentLinks} from './document-link-audit.mjs';
import {canonicalGraphJson,sha256Text} from './document-graph-export.mjs';

/** V3.6.7: reproducible, DEMO-only documentary reference report.
 * SHA-256 is scoped to this JSON snapshot, never to evidence files, original
 * documents, legal obligations or environmental compliance.
 */
export const ISSUE_REPORT_SCHEMA='ambienta.document_reference_audit.v1';
export const ISSUE_REPORT_CANON='sorted-object-keys/json-v1';
const DISCLAIMER='Revisión automática de referencias de un expediente local DEMO. '+
 'El SHA-256 solo detecta cambios de este reporte; no verifica archivos originales, '+
 'autoría, inspección de campo ni cumplimiento ambiental.';
const safeName=x=>String(x??'demo').replace(/[^A-Za-z0-9_-]/g,'_').slice(0,72)||'demo';

export function buildDocumentIssueReport(state){
 const audit=auditDocumentLinks(state);
 // Deliberately exclude untrusted free-text notes, geocoordinates and file bytes.
 return {
  schema:ISSUE_REPORT_SCHEMA,
  scope:'declared_references_only',
  source:{
   kind:'browser_local_demo_state',projectId:state?.project?.id??null,
   revision:state?.revision??null,caseDemo:state?.demo===true,
   sourceDocumentsIndependentlyVerified:false,evidenceFilesIncluded:false,
   collectionsReviewed:['programs','measures','inspections','evidence',
    'findings','correctiveActions']
  },
  summary:{recordsChecked:audit.checked,issuesFound:audit.total,
   zeroIssuesDoesNotProveCompliance:true},
  issues:audit.issues.map(i=>({
   code:i.code,
   origin:{kind:i.kind,collection:i.sourceCollection,id:i.id,
    field:i.field},
   reference:i.reference,
   targetKind:i.targetKind,occurrences:i.occurrences,
   navigation:{safe:i.url!==null,relativeUrl:i.url},
   description:i.message
  })),
  disclaimer:DISCLAIMER
 };
}

export async function prepareDocumentIssueExport(state){
 const report=buildDocumentIssueReport(state);
 const digest=await sha256Text(canonicalGraphJson(report));
 const payload={...report,integrity:{
  algorithm:'SHA-256',canonicalization:ISSUE_REPORT_CANON,
  report_sha256:digest,
  scope:'Canonical JSON of report excluding integrity',
  interpretation:'Checksum of this report only; no external file or source authentication'
 }};
 return {
  filename:'ambienta-referencias-'+safeName(state?.project?.id)+'-rev-'+
   safeName(state?.revision??'na')+'.json',
  data:payload,json:JSON.stringify(payload,null,2)+'\n'
 };
}

export async function verifyDocumentIssueExport(payload){
 if(!payload||payload.schema!==ISSUE_REPORT_SCHEMA||
  payload.scope!=='declared_references_only'||
  !payload.integrity||
  payload.integrity.algorithm!=='SHA-256'||
  payload.integrity.canonicalization!==ISSUE_REPORT_CANON||
  !/^[a-f0-9]{64}$/.test(payload.integrity.report_sha256??''))return false;
 const {integrity,...report}=payload;
 return await sha256Text(canonicalGraphJson(report))===integrity.report_sha256;
}
