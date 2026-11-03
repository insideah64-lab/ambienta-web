import test from 'node:test';
import assert from 'node:assert/strict';
import {createEnvironmentalRepository} from '../../web/cloud/repository.mjs';
import {validatePrivateInspection,validatePrivateEvidenceReference,privateMonitoringSummary}
 from '../../apps/web-v3/src/features/cloud/private-monitoring.mjs';

const PROJECT='25e7bb18-4d4d-458c-98f5-2d8e17cb2379';
const FOREIGN_PROJECT='125be5a4-b2e6-4a60-8c65-eb0141be22c0';
const MEASURE='93dd889c-c1dc-4111-b39c-aa2ed93f0c15';
const OTHER_MEASURE='9cc7378d-426f-41cc-a8f1-836e17d503de';
const INSPECTION='32e5f44a-ceb7-4a30-bb5c-8d5be6f0cfe4';
const OTHER_INSPECTION='11e4d152-262d-41ab-a360-75d499c86267';
const USER='f1d6c228-1565-4f1e-8e88-063a59b16de4';
const scope={
 projectId:PROJECT,measures:[{id:MEASURE,project_id:PROJECT,title:'Control hídrico'},
  {id:OTHER_MEASURE,project_id:PROJECT,title:'Plan polvo'}],
 inspections:[
  {id:INSPECTION,project_id:PROJECT,measure_id:MEASURE,scheduled_for:'2026-11-03'},
  {id:OTHER_INSPECTION,project_id:PROJECT,measure_id:OTHER_MEASURE,scheduled_for:'2026-11-04'}
 ]
};
function fake(auth=true,deny=false){
 const writes=[];
 const client={
  auth:{async getUser(){return {error:null,data:{user:auth?{id:USER}:null}}}},
  rpc(){throw new Error('Un registro de monitoreo no necesita RPC de aprobación')},
  from(table){return {insert(record){
   writes.push({table,record});
   return {select(_columns){return {async single(){
    return deny?{data:null,error:{message:'RLS denegado'}}:
     {data:{id:INSPECTION,...record},error:null};
   }}}};
  }}}
 };
 return {repository:createEnvironmentalRepository(client),writes};
}
test('Inspection validation requires a real measure of same project, correct date and enum',()=>{
 const v=validatePrivateInspection({measureId:MEASURE,date:'2028-02-29',
  result:'pending',note:'  Inspección prevista  '},scope);
 assert.deepEqual(v,{measureId:MEASURE,date:'2028-02-29',result:'pending',note:'Inspección prevista'});
 for(const date of ['2027-02-29','2026-13-03','2026-9-8','11/03/2026'])
  assert.throws(()=>validatePrivateInspection({...v,date},scope),/Fecha/);
 for(const m of [OTHER_INSPECTION,FOREIGN_PROJECT,'IMP-D-AGU'])
  assert.throws(()=>validatePrivateInspection({...v,measureId:m},scope),/no pertenece|inválido/);
 assert.throws(()=>validatePrivateInspection({...v,result:'approved'},scope),/no reconocido/);
 assert.throws(()=>validatePrivateInspection({...v,note:' '},scope),/Observación/);
});
test('References never link to an inspection from a different measure or project',()=>{
 const v=validatePrivateEvidenceReference({measureId:MEASURE,inspectionId:INSPECTION,
  label:'  Acta del control  ',reference:'  ACTA-2026-01  '},scope);
 assert.deepEqual(v,{measureId:MEASURE,inspectionId:INSPECTION,
  label:'Acta del control',reference:'ACTA-2026-01'});
 const direct=validatePrivateEvidenceReference({...v,inspectionId:''},scope);
 assert.equal(direct.inspectionId,'');
 for(const inspectionId of [OTHER_INSPECTION,FOREIGN_PROJECT])
  assert.throws(()=>validatePrivateEvidenceReference({...v,inspectionId},scope),
   /no corresponde/);
 assert.throws(()=>validatePrivateEvidenceReference({...v,inspectionId:'1'},scope),
  /identificador inválido/);
 assert.throws(()=>validatePrivateEvidenceReference({...v,label:'a'},scope),
  /Descripción documental/);
 const other={...scope,projectId:FOREIGN_PROJECT};
 assert.throws(()=>validatePrivateEvidenceReference(v,other),/no pertenece/);
});
test('Repository records inspection as user declaration with explicit measure & owner identity',async()=>{
 const {repository,writes}=fake();
 const v=validatePrivateInspection({measureId:MEASURE,date:'2026-11-03',
  result:'observed',note:'Se informa incidencia durante la recorrida'},scope);
 await repository.createInspection(PROJECT,v.measureId,v);
 assert.equal(writes.length,1);
 assert.equal(writes[0].table,'monitoring_inspections');
 assert.deepEqual(writes[0].record,{
  project_id:PROJECT,measure_id:MEASURE,recorded_by:USER,
  scheduled_for:'2026-11-03',result:'observed',
  note:'Se informa incidencia durante la recorrida'
 });
 assert(!JSON.stringify(writes).includes('approved'));
});
test('Reference metadata is pending only; does not create a Storage object',async()=>{
 const {repository,writes}=fake();
 const v=validatePrivateEvidenceReference({measureId:MEASURE,inspectionId:INSPECTION,
  label:'Acta hídrica',reference:'Carpeta interna / ACTA-01'},scope);
 await repository.registerEvidence(PROJECT,MEASURE,v);
 assert.deepEqual(writes.map(x=>x.table),['environmental_evidence']);
 assert.deepEqual(writes[0].record,{
  project_id:PROJECT,measure_id:MEASURE,inspection_id:INSPECTION,
  created_by:USER,label:v.label,reference_label:v.reference,status:'pending'
 });
 for(const k of ['storage_path','sha256_client','file_mime_type'])
  assert(!(k in writes[0].record));
});
test('Anonymous session, server RLS failure and malformed project ID prevent false success',async()=>{
 const guest=fake(false);
 await assert.rejects(guest.repository.createInspection(PROJECT,MEASURE,
  {date:'2026-11-03',result:'pending',note:'Plazo previsto'}),/Iniciá sesión/);
 assert.equal(guest.writes.length,0);
 const denied=fake(true,true);
 await assert.rejects(denied.repository.registerEvidence(PROJECT,MEASURE,
  {label:'Acta control',reference:'DOC-01'}),/RLS denegado/);
 const invalid=fake();
 await assert.rejects(invalid.repository.createInspection('DIAB-2026-DEMO',MEASURE,
  {date:'2026-11-03',result:'pending',note:'Plazo previsto'}),/Proyecto inválido/);
 assert.equal(invalid.writes.length,0);
});
test('Monitoring summary never inherits another project records or fabricates verification',()=>{
 const s={
  project:{id:PROJECT},
  management_measures:[{id:MEASURE,project_id:PROJECT,title:'Control hídrico'}],
  monitoring_inspections:[
   {id:INSPECTION,project_id:PROJECT,measure_id:MEASURE,
    scheduled_for:'2026-11-03',result:'conformant',note:'Resultado declarado'},
   {id:OTHER_INSPECTION,project_id:FOREIGN_PROJECT,measure_id:MEASURE,
    scheduled_for:'2026-11-04',result:'observed',note:'Otro expediente'}
  ],
  environmental_evidence:[
   {id:'E1',project_id:PROJECT,measure_id:MEASURE,inspection_id:INSPECTION,
    label:'Acta',reference_label:'ACTA 01',status:'pending'},
   {id:'E2',project_id:FOREIGN_PROJECT,measure_id:MEASURE,
    label:'Fuera',reference_label:'EXTERNO',status:'pending'},
   {id:'E3',project_id:PROJECT,measure_id:MEASURE,storage_path:PROJECT+'/path',
    label:'Archivo',reference_label:'ARCHIVO',status:'pending'},
   {id:'E4',project_id:PROJECT,measure_id:MEASURE,inspection_id:OTHER_INSPECTION,
    label:'Desalineada',reference_label:'DOC 02',status:'pending'}
  ]
 };
 const frozen=JSON.stringify(s),a=privateMonitoringSummary(s);
 assert.equal(a.inspections.length,1);
 assert.equal(a.references.length,2);
 assert.deepEqual(a.references.map(e=>e.id),['E1','E4']);
 assert.deepEqual(a.references[0].warnings,[]);
 assert.match(a.references[1].warnings.join(' '),/no corresponde/);
 assert.equal(a.references[0].status,'pending');
 assert.equal(JSON.stringify(s),frozen,'Viewing records must not mutate data');
});
