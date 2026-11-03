import test from 'node:test';
import assert from 'node:assert/strict';
import {createEnvironmentalRepository} from '../../web/cloud/repository.mjs';
import {validatePrivateFinding,validatePrivateCorrectiveAction,privateAuditSummary}
 from '../../apps/web-v3/src/features/cloud/private-audit.mjs';

const PROJECT='25e7bb18-4d4d-458c-98f5-2d8e17cb2379';
const OTHER='125be5a4-b2e6-4a60-8c65-eb0141be22c0';
const INSPECTION='32e5f44a-ceb7-4a30-bb5c-8d5be6f0cfe4';
const PENDING='11e4d152-262d-41ab-a360-75d499c86267';
const FINDING='93dd889c-c1dc-4111-b39c-aa2ed93f0c15';
const OTHER_FINDING='9cc7378d-426f-41cc-a8f1-836e17d503de';
const USER='f1d6c228-1565-4f1e-8e88-063a59b16de4';
const scope={
 projectId:PROJECT,
 inspections:[
  {id:INSPECTION,project_id:PROJECT,result:'observed',scheduled_for:'2026-11-03'},
  {id:PENDING,project_id:PROJECT,result:'pending',scheduled_for:'2026-11-04'},
  {id:OTHER_FINDING,project_id:OTHER,result:'observed'}
 ],
 findings:[
  {id:FINDING,project_id:PROJECT,title:'Falta de control de escorrentía'},
  {id:OTHER_FINDING,project_id:OTHER,title:'Otro expediente'}
 ]
};
const finding={
 inspectionId:INSPECTION,title:'Drenaje insuficiente',
 description:'Presencia declarada de escorrentías durante inspección',
 severity:'minor'
};
const action={
 findingId:FINDING,action:'Reparar la protección perimetral del drenaje',
 owner:'Equipo ambiental',dueDate:'2028-02-29'
};
function mockRepository(authenticated=true,deny=false){
 const writes=[], client={
  auth:{async getUser(){return {error:null,data:{user:authenticated?{id:USER}:null}};}},
  rpc(){throw Error('No privileged RPC is required for findings or actions')},
  from(table){return {insert(record){
   writes.push({table,record});
   return {select(){return {async single(){
    return deny?{error:{message:'RLS: permiso denegado'},data:null}:
      {error:null,data:{id:table==='audit_findings'?FINDING:'6aaf7ac9-59fd-49a2-a618-e78d2e58d0d4',...record}};
   }}}};
  }}}
 };
 return {repository:createEnvironmentalRepository(client),writes};
}
test('Only observed inspection in the selected project can produce a finding',()=>{
 assert.deepEqual(validatePrivateFinding({...finding,title:'  Drenaje insuficiente  '},scope),finding);
 assert.throws(()=>validatePrivateFinding({...finding,inspectionId:PENDING},scope),/requiere una inspección/);
 assert.throws(()=>validatePrivateFinding({...finding,inspectionId:OTHER_FINDING},scope),/no pertenece/);
 assert.throws(()=>validatePrivateFinding({...finding,inspectionId:'DIAB-2026-DEMO'},scope),/identificador inválido/);
 assert.throws(()=>validatePrivateFinding({...finding,severity:'approved'},scope),/no reconocida/);
 assert.throws(()=>validatePrivateFinding({...finding,description:'a'},scope),/Descripción del hallazgo/);
 assert.throws(()=>validatePrivateFinding(finding,{...scope,projectId:OTHER}),/no pertenece/);
});
test('Corrective action points only to a same-project finding with a real calendar date',()=>{
 assert.deepEqual(validatePrivateCorrectiveAction({...action,owner:'  Equipo ambiental  '},scope),action);
 assert.equal(validatePrivateCorrectiveAction({...action,dueDate:''},scope).dueDate,'');
 for(const invalid of ['2027-02-29','2028-13-01','2028-2-9','not-a-date'])
  assert.throws(()=>validatePrivateCorrectiveAction({...action,dueDate:invalid},scope),/Fecha límite/);
 assert.throws(()=>validatePrivateCorrectiveAction({...action,findingId:OTHER_FINDING},scope),/no pertenece/);
 assert.throws(()=>validatePrivateCorrectiveAction({...action,findingId:'demo-f1'},scope),/identificador inválido/);
 assert.throws(()=>validatePrivateCorrectiveAction({...action,owner:'X'},scope),/Responsable/);
 assert.throws(()=>validatePrivateCorrectiveAction(action,{...scope,findings:[]}),/no pertenece/);
});
test('Repository creates a finding with authenticated actor and open status only',async()=>{
 const {repository,writes}=mockRepository();
 const v=validatePrivateFinding(finding,scope);
 await repository.createFinding(PROJECT,v.inspectionId,v);
 assert.deepEqual(writes.map(x=>x.table),['audit_findings']);
 assert.deepEqual(writes[0].record,{
  project_id:PROJECT,inspection_id:INSPECTION,created_by:USER,
  title:finding.title,description:finding.description,
  severity:'minor',status:'open'
 });
});
test('Repository creates an open action from an explicit finding, no closure',async()=>{
 const {repository,writes}=mockRepository();
 const v=validatePrivateCorrectiveAction(action,scope);
 await repository.createCorrectiveAction(PROJECT,v.findingId,v);
 assert.deepEqual(writes.map(x=>x.table),['corrective_actions']);
 assert.deepEqual(writes[0].record,{
  project_id:PROJECT,finding_id:FINDING,created_by:USER,
  action:action.action,owner_label:action.owner,due_date:'2028-02-29',status:'open'
 });
 assert(!JSON.stringify(writes).includes('approved'));
});
test('Guest or RLS denied cannot falsely report creation',async()=>{
 const guest=mockRepository(false);
 await assert.rejects(guest.repository.createFinding(PROJECT,INSPECTION,finding),/Iniciá sesión/);
 assert.equal(guest.writes.length,0);
 const invalid=mockRepository();
 await assert.rejects(invalid.repository.createCorrectiveAction('DIAB-2026-DEMO',FINDING,action),
  /Proyecto inválido/);
 assert.equal(invalid.writes.length,0);
 const denied=mockRepository(true,true);
 await assert.rejects(denied.repository.createCorrectiveAction(PROJECT,FINDING,action),/RLS/);
 assert.equal(denied.writes.length,1);
});
test('Read-only audit projection never joins foreign project rows or guesses missing IDs',()=>{
 const data={
  project:{id:PROJECT},
  monitoring_inspections:[
   {id:INSPECTION,project_id:PROJECT,result:'observed',scheduled_for:'2026-11-03'},
   {id:PENDING,project_id:OTHER,result:'observed',scheduled_for:'2026-11-04'}
  ],
  audit_findings:[
   {id:FINDING,project_id:PROJECT,inspection_id:INSPECTION,
    title:'Hallazgo registrado',description:'Observación técnica declarada',severity:'minor',status:'open'},
   {id:'ORPHAN',project_id:PROJECT,inspection_id:PENDING,
    title:'Sin origen',description:'Requiere revisión',severity:'observation',status:'open'},
   {id:OTHER_FINDING,project_id:OTHER,inspection_id:INSPECTION,
    title:'Dato ajeno',description:'No se debe mostrar',severity:'major',status:'open'}
  ],
  corrective_actions:[
   {id:'A1',project_id:PROJECT,finding_id:FINDING,
    action:'Revisar drenaje',owner_label:'Responsable',due_date:null,status:'open'},
   {id:'A2',project_id:PROJECT,finding_id:OTHER_FINDING,
    action:'No debe inferir origen',owner_label:'Responsable',status:'open'},
   {id:'A3',project_id:OTHER,finding_id:FINDING,
    action:'No debe mostrarse',owner_label:'Ajeno',status:'open'}
  ]
 };
 const before=JSON.stringify(data),out=privateAuditSummary(data);
 assert.equal(out.findings.length,2);
 assert.equal(out.actions.length,2);
 assert.deepEqual(out.findings[0].warnings,[]);
 assert.match(out.findings[1].warnings.join(' '),/no resuelta/);
 assert.equal(out.actions[0].linkedTitle,'Hallazgo registrado');
 assert.match(out.actions[1].warnings.join(' '),/no resuelto/);
 assert.equal(out.actions[0].status,'open');
 assert.equal(JSON.stringify(data),before);
});
