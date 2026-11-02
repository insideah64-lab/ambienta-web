import test from 'node:test';
import assert from 'node:assert/strict';
import {createDiablillosState} from '../../apps/web-v3/src/lib/diablillosDemo.mjs';
import {auditDocumentLinks} from '../../apps/web-v3/src/features/traceability/document-link-audit.mjs';
import {buildDocumentIssueReport,prepareDocumentIssueExport,verifyDocumentIssueExport,
 ISSUE_REPORT_SCHEMA} from '../../apps/web-v3/src/features/traceability/document-issue-export.mjs';

const fixture=()=>createDiablillosState();
const corrupted=()=>{
 const state=fixture();
 state.evidence[3].inspectionId='INSP-HUERFANA';
 state.evidence.push({...state.evidence[4],reference:'DEMO:duplicado'});
 state.evidence[5].measureId=null;
 return state;
};
test('consistent Diablillos reports zero issues without certifying anything',async()=>{
 const state=fixture(),before=JSON.stringify(state);
 const f=await prepareDocumentIssueExport(state);
 assert.equal(f.data.schema,ISSUE_REPORT_SCHEMA);
 assert.equal(f.data.summary.recordsChecked,18);
 assert.equal(f.data.summary.issuesFound,0);
 assert.deepEqual(f.data.issues,[]);
 assert.equal(f.data.source.caseDemo,true);
 assert.equal(f.data.source.sourceDocumentsIndependentlyVerified,false);
 assert.equal(f.data.source.evidenceFilesIncluded,false);
 assert.match(f.data.disclaimer,/no verifica archivos originales/i);
 assert(await verifyDocumentIssueExport(f.data));
 assert.equal(JSON.stringify(state),before);
});
test('orphan and duplicate references export exact origin, field and reference',async()=>{
 const data=corrupted(),before=JSON.stringify(data);
 const a=auditDocumentLinks(data);
 const f=await prepareDocumentIssueExport(data);
 assert.equal(f.data.summary.issuesFound,a.total);
 const orphan=f.data.issues.find(x=>x.code==='missing_target'&&x.origin.id==='EVID-D-004');
 assert.deepEqual(orphan.origin,{kind:'evidence',collection:'evidence',id:'EVID-D-004',field:'inspectionId'});
 assert.equal(orphan.reference,'INSP-HUERFANA');
 assert.equal(orphan.targetKind,'inspection');
 assert.equal(orphan.navigation.relativeUrl,'/evidencias?evidencia=EVID-D-004');
 const dup=f.data.issues.find(x=>x.code==='duplicate_id'&&x.origin.id==='EVID-D-005');
 assert.equal(dup.origin.field,'id');
 assert.equal(dup.occurrences,2);
 assert.equal(dup.navigation.safe,false);
 const unlinked=f.data.issues.find(x=>x.code==='unlinked_evidence'&&x.origin.id==='EVID-D-006');
 assert.equal(unlinked.reference,null);
 assert.equal(unlinked.origin.field,'measureId/inspectionId');
 assert.equal(JSON.stringify(data),before);
});
test('export is deterministic, scoped and tamper evident on exact JSON content',async()=>{
 const state=corrupted(),first=await prepareDocumentIssueExport(state);
 const second=await prepareDocumentIssueExport(state);
 assert.equal(first.json,second.json);
 assert.equal(first.filename,second.filename);
 assert.match(first.filename,/\.json$/);
 assert.match(first.data.integrity.report_sha256,/^[0-9a-f]{64}$/);
 assert(await verifyDocumentIssueExport(JSON.parse(first.json)));
 const tampered=JSON.parse(first.json);
 tampered.issues[0].origin.field='otra-columna';
 assert.equal(await verifyDocumentIssueExport(tampered),false);
 const tamperedSource=JSON.parse(first.json);
 tamperedSource.source.projectId='OTRO-EXPEDIENTE';
 assert.equal(await verifyDocumentIssueExport(tamperedSource),false);
 assert.equal(await verifyDocumentIssueExport({schema:ISSUE_REPORT_SCHEMA}),false);
});
test('report excludes original notes, file bytes and geometric coordinates',()=>{
 const state=corrupted();
 state.evidence[3].reference='ARCHIVO_PRIVADO_QUE_NO_DEBE_APARECER';
 state.evidence[3].label='NOTA_PRIVADA_QUE_NO_DEBE_APARECER';
 state.project.bbox=[-64,-23,-63,-22];
 const text=JSON.stringify(buildDocumentIssueReport(state));
 assert(!text.includes('ARCHIVO_PRIVADO_QUE_NO_DEBE_APARECER'));
 assert(!text.includes('NOTA_PRIVADA_QUE_NO_DEBE_APARECER'));
 assert(!text.includes('"bbox"'));
 assert(text.includes('browser_local_demo_state'));
});
test('changed report field order does not change the digest meaning',async()=>{
 const f=await prepareDocumentIssueExport(corrupted());
 const {schema,scope,source,summary,issues,disclaimer,integrity}=f.data;
 const reordered={integrity,issues,disclaimer,summary,source,scope,schema};
 assert(await verifyDocumentIssueExport(reordered));
});
test('conflicting references are precisely recorded, not certified as an environmental violation',()=>{
 const state=fixture();
 state.evidence[3].measureId='MED-DIAB-003';
 const r=buildDocumentIssueReport(state);
 const i=r.issues.find(x=>x.code==='conflicting_reference');
 assert.equal(i.origin.id,'EVID-D-004');
 assert.equal(i.origin.field,'measureId/inspectionId');
 assert.equal(i.reference,'MED-DIAB-003 | INSP-DIAB-002');
 assert.match(r.disclaimer,/cumplimiento ambiental/);
});
