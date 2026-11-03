/**
 * Strict, browser-independent input validation for REAL, authenticated
 * Supabase records. Never seeds sample data, guesses legal approval,
 * or copies values from a local demonstration.
 */
const required=(v,label,min,max)=>{
 if(typeof v!=='string')throw new Error(label+': valor requerido');
 const s=v.trim();
 if(s.length<min||s.length>max)throw new Error(label+': entre '+min+' y '+max+' caracteres');
 return s;
};
const optional=(v,label,max)=>{
 if(v===undefined||v===null||v==='')return '';
 if(typeof v!=='string'||v.trim().length>max)
  throw new Error(label+': máximo '+max+' caracteres');
 return v.trim();
};
export const PRIVATE_PROJECT_PHASES=Object.freeze(['planning','construction','operation','closure']);
const signs=['negative','positive','uncertain'];
export function validatePrivateProject(values){
 if(!values||typeof values!=='object')throw new Error('No se proporcionaron datos del proyecto');
 return {
  name:required(values.name,'Nombre del expediente',3,240),
  province:required(values.province,'Provincia',2,80),
  proponent:optional(values.proponent,'Proponente',240),
  activity_type:optional(values.activity_type,'Actividad',240)
 };
}
export function validatePrivateImpact(values){
 if(!values||typeof values!=='object')throw new Error('No se proporcionaron datos del impacto');
 const phase=values.project_phase,sign=values.sign;
 if(!PRIVATE_PROJECT_PHASES.includes(phase))throw new Error('Etapa de impacto no reconocida');
 if(!signs.includes(sign))throw new Error('Naturaleza del impacto no reconocida');
 return {
  code:required(values.code,'Código de impacto',3,70),
  title:required(values.title,'Impacto',3,240),
  factor:required(values.factor,'Factor ambiental',3,100),
  project_phase:phase,sign
 };
}
export function validatePrivateProgram(values){
 if(!values||typeof values!=='object')throw new Error('No se proporcionaron datos del programa');
 return {
  code:required(values.code,'Código PGA',3,70),
  name:required(values.name,'Nombre del programa',3,240),
  category:required(values.category,'Categoría',3,100),
  description:optional(values.description,'Descripción',2000)
 };
}
