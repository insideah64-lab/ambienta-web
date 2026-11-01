// AMBIENTA V3.7 — integrity-only local file check against an EXISTING DEMO evidence reference.
// No writes, no custody, no identity proof, no compliance evaluation.
const SHA=/^[a-f0-9]{64}$/;
const iso=x=>typeof x==='string'&&x.length<45&&!Number.isNaN(Date.parse(x));
const err=x=>{throw Error('V3.7: '+x);};
const validId=x=>typeof x==='string'&&x.trim().length>0&&x.length<200;
// Compatible with the established EvidenceIntegrityLab fingerprint reference format.
export function parseRegisteredFingerprint(reference){
 const m=/^sha256:([a-f0-9]{64})\|archivo:([^|\r\n<>]{1,90})\|bytes:(\d{1,10})$/i.exec(reference||'');
 if(!m)return null;
 const bytes=Number(m[3]);
 if(!Number.isSafeInteger(bytes)||bytes<1||bytes>10485760)return null;
 return {sha256:m[1].toLowerCase(),name:m[2],bytes};
}
export function eligibleInspectionEvidence(data,inspectionId){
 const inspection=data?.inspections?.find(i=>i.id===inspectionId);
 if(!inspection)return [];
 return (data.evidence||[]).filter(e=>e.inspectionId===inspectionId&&
   (!e.measureId||e.measureId===inspection.measureId)&&parseRegisteredFingerprint(e.reference));
}
export function verifyExistingEvidence({proposals,report,entryId,inspectionId,evidenceId,
 data,fingerprint,checkedAt}){
 if(proposals?.schema!=='ambienta-documentary-proposals-v1'||
  report?.schema!=='ambienta-point-zones-v1'||!proposals.origin||
  !SHA.test(proposals.origin.inputSha256||'')||
  proposals.origin.inputSha256!==report.provenance?.inputSha256||
  proposals.origin.scenarioSha256!==report.provenance?.scenarioSha256||
  proposals.origin.scenarioCreatedAt!==report.provenance?.scenarioCreatedAt||
  JSON.stringify(proposals.origin.scenarioBbox)!==JSON.stringify(report.provenance?.scenarioBbox))
  err('la clasificación espacial y su procedencia ya no coinciden');
 const entry=proposals.entries?.find(e=>e.recordId===entryId);
 if(!entry||entry.recordType!=='inspection'||entry.status!=='approved'||
  !entry.zoneId||!['A','B','C','D'].includes(entry.zoneId)||!entry.review?.reviewer)
  err('el registro requiere primero una revisión espacial de inspección aceptada para QA');
 if(!validId(inspectionId)||!validId(evidenceId)||!validId(data?.project?.id)||
  !Number.isSafeInteger(data?.revision)||!data.demo)err('identificadores o dominio no válidos');
 const inspection=data.inspections?.find(i=>i.id===inspectionId);
 if(!inspection)err('la inspección no existe en el expediente');
 const evidence=data.evidence?.find(e=>e.id===evidenceId);
 if(!evidence||evidence.inspectionId!==inspectionId||
  (evidence.measureId&&evidence.measureId!==inspection.measureId))
  err('la evidencia no referencia exactamente esta inspección y medida');
 const expected=parseRegisteredFingerprint(evidence.reference);
 if(!expected)err('la evidencia no posee huella SHA-256 registrada en el dominio');
 if(!SHA.test(entry.evidenceSha256||'')||
  entry.evidenceSha256!==expected.sha256)
  err('la huella declarada en la propuesta difiere de la evidencia del expediente');
 if(!fingerprint||!SHA.test(fingerprint.sha256||'')||
  !Number.isSafeInteger(fingerprint.bytes)||fingerprint.bytes<1||fingerprint.bytes>10485760)
  err('huella o tamaño del archivo local inválidos');
 if(fingerprint.sha256!==expected.sha256||fingerprint.bytes!==expected.bytes)
  err('el archivo NO coincide con el hash o tamaño registrados');
 if(!iso(checkedAt))err('falta fecha verificable de comparación');
 return {
  schema:'ambienta-local-file-match-v1',status:'FILE_BYTES_MATCH_REGISTERED_FINGERPRINT',
  checkedAt,projectId:data.project.id,domainRevision:data.revision,
  recordId:entry.recordId,pointRef:entry.pointRef,zoneId:entry.zoneId,
  inspectionId,inspectionMeasureId:inspection.measureId,evidenceId,
  evidenceStatusAtCheck:evidence.status,sha256:expected.sha256,bytes:expected.bytes,
  sourcePointSha256:proposals.origin.inputSha256,
  scenarioSha256:proposals.origin.scenarioSha256,
  scenarioCreatedAt:proposals.origin.scenarioCreatedAt,
  scenarioBbox:[...proposals.origin.scenarioBbox],
  limitation:'Solo cotejo local de bytes SHA-256 y enlace de IDs existentes. No verifica autoría, identidad del revisor, origen del instrumento, calidad del muestreo ni cumplimiento ambiental.'
 };
}
export function matchesEvidenceContext(match,proposals,report,data){
 if(match?.schema!=='ambienta-local-file-match-v1'||
  match.status!=='FILE_BYTES_MATCH_REGISTERED_FINGERPRINT')return false;
 try{
  const entry=proposals.entries.find(e=>e.recordId===match.recordId);
  const inspection=data.inspections.find(i=>i.id===match.inspectionId);
  const evidence=data.evidence.find(e=>e.id===match.evidenceId);
  const registered=parseRegisteredFingerprint(evidence?.reference);
  return Boolean(entry?.status==='approved'&&entry.recordType==='inspection'&&entry.zoneId===match.zoneId&&
   entry.evidenceSha256===match.sha256&&data.project.id===match.projectId&&data.revision===match.domainRevision&&
   inspection?.measureId===match.inspectionMeasureId&&evidence?.inspectionId===match.inspectionId&&
   (!evidence.measureId||evidence.measureId===inspection.measureId)&&
   evidence.status===match.evidenceStatusAtCheck&&registered?.sha256===match.sha256&&registered.bytes===match.bytes&&
   proposals.origin.inputSha256===match.sourcePointSha256&&
   proposals.origin.inputSha256===report.provenance.inputSha256&&
   proposals.origin.scenarioSha256===match.scenarioSha256&&
   proposals.origin.scenarioSha256===report.provenance.scenarioSha256&&
   proposals.origin.scenarioCreatedAt===match.scenarioCreatedAt&&
   proposals.origin.scenarioCreatedAt===report.provenance.scenarioCreatedAt&&
   JSON.stringify(proposals.origin.scenarioBbox)===JSON.stringify(match.scenarioBbox)&&
   JSON.stringify(proposals.origin.scenarioBbox)===JSON.stringify(report.provenance.scenarioBbox));
 }catch{return false;}
}
