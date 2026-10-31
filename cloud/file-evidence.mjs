/** Private evidence upload: no public URL, overwrite or automatic approval. */
export const EVIDENCE_BUCKET='environmental-evidence-private';
export const MAX_BYTES=5*1024*1024;
const extensions={'image/jpeg':'jpg','image/png':'png','application/pdf':'pdf'};
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function validateEvidenceFile(file){
 if(!file||typeof file.size!=='number'||typeof file.name!=='string')throw Error('Seleccioná un archivo.');
 if(file.size<1||file.size>MAX_BYTES)throw Error('El archivo debe pesar entre 1 byte y 5 MiB.');
 if(!Object.hasOwn(extensions,file.type))throw Error('Solo se aceptan JPG, PNG y PDF.');
 if(!file.name.trim()||file.name.length>240)throw Error('Nombre de archivo inválido.');
 return extensions[file.type];
}
export function makePrivatePath(projectId,measureId,file,objectId){
 const extension=validateEvidenceFile(file);
 if(![projectId,measureId,objectId].every(x=>typeof x==='string'&&UUID.test(x)))throw Error('Identificador de proyecto, medida o archivo inválido.');
 return projectId+'/'+measureId+'/'+objectId+'.'+extension;
}
export async function sha256Browser(file,crypt=globalThis.crypto){
 if(!crypt?.subtle?.digest||typeof file?.arrayBuffer!=='function')throw Error('Se requiere crypto.subtle para calcular SHA-256.');
 const bytes=await file.arrayBuffer();
 const hash=await crypt.subtle.digest('SHA-256',bytes);
 return [...new Uint8Array(hash)].map(x=>x.toString(16).padStart(2,'0')).join('');
}
export async function uploadPendingEvidence(client,{projectId,measureId,userId,label,file,inspectionId=null,crypt=globalThis.crypto}){
 validateEvidenceFile(file);
 if(!client?.storage?.from||!client?.from)throw Error('Cliente Supabase sin Storage.');
 if(!UUID.test(userId))throw Error('Sesión de usuario inválida.');
 if(typeof label!=='string'||label.trim().length<3||label.length>320)throw Error('Descripción de evidencia inválida.');
 if(inspectionId!==null&&!UUID.test(inspectionId))throw Error('Inspección inválida.');
 if(!crypt?.randomUUID)throw Error('Se requiere crypto.randomUUID.');
 const path=makePrivatePath(projectId,measureId,file,crypt.randomUUID());
 const checksum=await sha256Browser(file,crypt);
 const bucket=client.storage.from(EVIDENCE_BUCKET);
 const uploaded=await bucket.upload(path,file,{upsert:false,contentType:file.type,cacheControl:'0'});
 if(uploaded.error)throw Error(uploaded.error.message||'No se pudo cargar el archivo privado.');
 try{
  const result=await client.from('environmental_evidence').insert({
   project_id:projectId,measure_id:measureId,inspection_id:inspectionId,
   created_by:userId,label:label.trim(),reference_label:file.name,
   storage_path:path,original_file_name:file.name,file_size_bytes:file.size,
   file_mime_type:file.type,sha256_client:checksum,status:'pending'
  }).select('*').single();
  if(result.error)throw Error(result.error.message||'No se registró la evidencia.');
  return result.data;
 }catch(error){
  const cleanup=await bucket.remove([path]).catch(e=>({error:e}));
  if(cleanup?.error)throw Error('No se registró la evidencia y falló la limpieza del archivo huérfano. Avisá al administrador. '+error.message);
  throw error;
 }
}
export async function downloadPrivateEvidence(client,record){
 if(!record?.storage_path)throw Error('Esta referencia no tiene archivo adjunto.');
 const result=await client.storage.from(EVIDENCE_BUCKET).download(record.storage_path);
 if(result.error)throw Error(result.error.message||'No se pudo descargar la evidencia.');
 return {blob:result.data,name:record.original_file_name||'evidencia'};
}
