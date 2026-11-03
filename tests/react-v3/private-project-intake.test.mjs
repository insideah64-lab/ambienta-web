import test from 'node:test';
import assert from 'node:assert/strict';
import {createEnvironmentalRepository} from '../../web/cloud/repository.mjs';
import {validatePrivateProject,validatePrivateImpact,validatePrivateProgram}
 from '../../apps/web-v3/src/features/cloud/private-intake.mjs';

const userId='f1d6c228-1565-4f1e-8e88-063a59b16de4';
const projectId='25e7bb18-4d4d-458c-98f5-2d8e17cb2379';
function mockRepository(authenticated=true){
 const writes=[];
 const client={
  auth:{async getUser(){return {error:null,data:{user:authenticated?{id:userId}:null}};}},
  rpc(){throw Error('No RPC should be called by the intake forms');},
  from(table){
   return {
    insert(record){
     writes.push({table,record});
     return {select(){return {async single(){
      return {error:null,data:{id:table==='environmental_projects'?projectId:'9d6f06c9-8e59-42df-90e3-3b3b02d8ee40',...record}};
     }}}};
    }
   };
  }
 };
 return {repository:createEnvironmentalRepository(client),writes};
}
test('Private intake validates fields before any database attempt',()=>{
 assert.deepEqual(validatePrivateProject({
  name:'  Evaluación Ambiental Industrial ',province:' Salta ',
  proponent:' Titular QA ',activity_type:' Industrial '
 }),{name:'Evaluación Ambiental Industrial',province:'Salta',proponent:'Titular QA',activity_type:'Industrial'});
 assert.throws(()=>validatePrivateProject({name:' X ',province:'Salta'}),/Nombre del expediente/);
 assert.throws(()=>validatePrivateProject({name:'Expediente válido',province:'S'}),/Provincia/);
 assert.throws(()=>validatePrivateProject({name:'Expediente válido',province:'Salta',activity_type:'A'.repeat(241)}),/Actividad/);
 assert.throws(()=>validatePrivateImpact({code:'IMP-001',title:'Cambio en agua',factor:'Agua',project_phase:'invalid',sign:'negative'}),/Etapa/);
 assert.throws(()=>validatePrivateImpact({code:'IMP-001',title:'Cambio en agua',factor:'Agua',project_phase:'planning',sign:'none'}),/Naturaleza/);
 assert.throws(()=>validatePrivateProgram({code:'PGA-001',name:'Control Hídrico',category:'X'}),/Categoría/);
});
test('Owner creation uses authenticated identity and cannot imply an approved project',async()=>{
 const {repository,writes}=mockRepository();
 const payload=validatePrivateProject({name:'Proyecto QA sin datos de campo',province:'Salta',
  proponent:'Proponente declarado',activity_type:'Laboratorio'});
 const result=await repository.createProject(payload);
 assert.equal(result.id,projectId);
 assert.equal(writes.length,1);
 assert.equal(writes[0].table,'environmental_projects');
 assert.equal(writes[0].record.owner_id,userId);
 assert.equal(writes[0].record.status,'draft');
 assert.equal(writes[0].record.project_phase,'planning');
 assert.equal(writes[0].record.province,'Salta');
 assert(!JSON.stringify(writes).includes('DIAB-2026-DEMO'));
});
test('Impact and PGA program use the selected private project UUID only',async()=>{
 const {repository,writes}=mockRepository();
 const impact=validatePrivateImpact({
  code:'IMP-AGU-001',title:'Presión hídrica a evaluar',factor:'Agua superficial',
  project_phase:'operation',sign:'uncertain'
 });
 const program=validatePrivateProgram({code:'PGA-AGU-001',name:'Monitoreo hídrico',
  category:'Agua',description:'A definir'});
 await repository.createImpact(projectId,impact);
 await repository.createProgram(projectId,program);
 assert.deepEqual(writes.map(x=>x.table),['environmental_impacts','management_programs']);
 for(const write of writes)assert.equal(write.record.project_id,projectId);
 assert.equal(writes[0].record.sign,'uncertain');
 assert.equal(writes[1].record.name,'Monitoreo hídrico');
 assert(!writes.some(w=>w.record.status==='approved'||w.record.assessment_status==='approved'));
});
test('Not authenticated means no private writes; malformed project IDs rejected',async()=>{
 const {repository,writes}=mockRepository(false);
 await assert.rejects(repository.createProject(validatePrivateProject({name:'QA project',province:'Salta'})),/Iniciá sesión/);
 await assert.rejects(repository.createImpact(projectId,validatePrivateImpact({
  code:'IMP-003',title:'Impacto',factor:'Agua',project_phase:'planning',sign:'negative'
 })),/Iniciá sesión/);
 await assert.rejects(repository.createProgram(projectId,validatePrivateProgram({
  code:'PGA-003',name:'Programa',category:'Agua'
 })),/Iniciá sesión/);
 assert.equal(writes.length,0);
 const logged=mockRepository(true);
 await assert.rejects(logged.repository.createImpact('DIAB-2026-DEMO',{
  code:'IMP-003',title:'Impacto',factor:'Agua',project_phase:'planning',sign:'negative'
 }),/Proyecto inválido/);
 assert.equal(logged.writes.length,0);
});
