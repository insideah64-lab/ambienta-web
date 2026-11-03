import test from 'node:test';
import assert from 'node:assert/strict';
import {createEnvironmentalRepository} from '../../web/cloud/repository.mjs';
import {validatePrivateMeasure,privateMeasureSummary}
 from '../../apps/web-v3/src/features/cloud/private-measure.mjs';

const PROJECT='25e7bb18-4d4d-458c-98f5-2d8e17cb2379';
const OTHER='125be5a4-b2e6-4a60-8c65-eb0141be22c0';
const PROGRAM='96e61bd9-d266-4881-bb51-64a709d02459';
const IMPACT='071dd14a-40dc-4332-a936-3279cb85d449';
const USER='f1d6c228-1565-4f1e-8e88-063a59b16de4';
const MEASURE='93dd889c-c1dc-4111-b39c-aa2ed93f0c15';
const base={
 programId:PROGRAM,impactId:IMPACT,
 title:'Control de escorrentía',description:'Canaletas de drenaje con inspecciones programadas.',
 owner:'Equipo ambiental',indicator:'Turbidez superficial',
 criterion:'Umbral y método documentados',frequency:'Mensual',
 dueDate:'2027-02-28'
};
const scope={projectId:PROJECT,programIds:[PROGRAM],impactIds:[IMPACT]};
function fakeClient(auth=true,fail=false){
 const calls=[];
 const client={
  auth:{async getUser(){return {error:null,data:{user:auth?{id:USER}:null}}}},
  from(){throw Error('La medida no se crea por INSERT separado')},
  async rpc(fn,args){
   calls.push({fn,args});
   return fail?{error:{message:'Autorización RLS denegada'},data:null}:
    {error:null,data:MEASURE};
  }
 };
 return {repository:createEnvironmentalRepository(client),calls};
}
test('PGA measure validation keeps only explicit project-bound IDs and legal fields',()=>{
 assert.deepEqual(validatePrivateMeasure({...base,title:'  Control de escorrentía  '},scope),
  {...base,title:'Control de escorrentía'});
 assert.equal(validatePrivateMeasure({...base,dueDate:''},scope).dueDate,'');
 assert.equal(validatePrivateMeasure({...base,dueDate:'2028-02-29'},scope).dueDate,'2028-02-29');
 assert.throws(()=>validatePrivateMeasure({...base,dueDate:'2027-02-29'},scope),/día inexistente/);
 assert.throws(()=>validatePrivateMeasure({...base,dueDate:'2027-13-01'},scope),/Fecha límite/);
 assert.throws(()=>validatePrivateMeasure({...base,dueDate:'2027-1-1'},scope),/Fecha límite/);
 assert.throws(()=>validatePrivateMeasure({...base,indicator:' '},scope),/Indicador/);
 assert.throws(()=>validatePrivateMeasure({...base,frequency:'x'.repeat(81)},scope),/Frecuencia/);
});
test('Cross-project impact or program IDs cannot pass even when formatted as UUIDs',()=>{
 for(const altered of [
  {...base,impactId:OTHER},{...base,programId:OTHER},
  {...base,impactId:'IMP-D-AGU'},{...base,programId:'PGA-001'}
 ]){
  assert.throws(()=>validatePrivateMeasure(altered,scope),/no pertenece/);
 }
 assert.throws(()=>validatePrivateMeasure(base,{...scope,projectId:'DIAB-2026-DEMO'}),/Proyecto privado inválido/);
 assert.throws(()=>validatePrivateMeasure(base,{...scope,programIds:[]}),/no pertenece/);
 assert.throws(()=>validatePrivateMeasure(base,{...scope,impactIds:[]}),/no pertenece/);
});
test('Atomic invoker-rights RPC receives exactly the selected private UUIDs and allowed fields',async()=>{
 const {repository,calls}=fakeClient();
 const valid=validatePrivateMeasure(base,scope);
 const result=await repository.createMeasure(PROJECT,valid);
 assert.equal(result,MEASURE);
 assert.equal(calls.length,1);
 assert.deepEqual(calls[0],{
  fn:'create_measure_with_impact',
  args:{
   p_project_id:PROJECT,p_program_id:PROGRAM,p_impact_id:IMPACT,
   p_title:base.title,p_description:base.description,p_owner_label:base.owner,
   p_indicator:base.indicator,p_criterion:base.criterion,
   p_frequency:base.frequency,p_due_date:base.dueDate
  }
 });
 assert(!JSON.stringify(calls).includes('approval'));
 assert(!JSON.stringify(calls).includes('DIAB-2026-DEMO'));
});
test('Missing session and server RLS denial never count as successful measure creation',async()=>{
 const guest=fakeClient(false);
 await assert.rejects(guest.repository.createMeasure(PROJECT,base),/Iniciá sesión/);
 assert.equal(guest.calls.length,0);
 const denied=fakeClient(true,true);
 await assert.rejects(denied.repository.createMeasure(PROJECT,base),/Autorización RLS denegada/);
 assert.equal(denied.calls.length,1);
 const invalid=fakeClient();
 await assert.rejects(invalid.repository.createMeasure(PROJECT,{...base,programId:'DIAB-PGA'}),
  /Programa inválido/);
 assert.equal(invalid.calls.length,0);
});
test('Only server-provided explicit links are shown; dangling links are flagged rather than inferred',()=>{
 const measures=[{id:MEASURE,title:'Control de escorrentía',status:'draft',program_id:PROGRAM}];
 const programs=[{id:PROGRAM,code:'PGA-AGU-001',name:'Programa Agua'}];
 const impacts=[{id:IMPACT,code:'IMP-AGU-001',title:'Riesgo hídrico'}];
 const linked=privateMeasureSummary(measures,[
  {measure_id:MEASURE,impact_id:IMPACT},
  {measure_id:MEASURE,impact_id:IMPACT}
 ],impacts,programs);
 assert.equal(linked.length,1);
 assert.deepEqual(linked[0].impactIds,[IMPACT]);
 assert.equal(linked[0].programLabel,'PGA-AGU-001');
 assert.deepEqual(linked[0].problems,[]);
 const orphan=privateMeasureSummary(measures,[],impacts,programs);
 assert.equal(orphan[0].impactIds.length,0);
 assert.match(orphan[0].problems.join(' '),/Sin impacto vinculado/);
 const bad=privateMeasureSummary(measures,[{measure_id:MEASURE,impact_id:OTHER}],impacts,[]);
 assert.equal(bad[0].impactIds[0],OTHER);
 assert(bad[0].problems.some(s=>s.includes('no resuelto')));
});
