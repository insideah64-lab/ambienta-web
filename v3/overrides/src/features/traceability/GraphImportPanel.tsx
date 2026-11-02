import {useState} from 'react';
import type {ChangeEvent} from 'react';
import type {DemoState} from '../../lib/demo';
// @ts-ignore: V3-only bounded validation of read-only graph JSON.
import {inspectDocumentGraphImport,MAX_GRAPH_IMPORT_BYTES} from './document-graph-import.mjs';

type Props={data:DemoState;measureId:string};
type Difference={kind:string;id:string;fields:string[]};
type Result={status:string;code:string;message:string;checksumVerified:boolean;
 comparable:boolean;changes:null|Record<string,number|boolean>;
 details:Difference[];imported?:Record<string,string|number>;current?:Record<string,number>;disclaimer?:string};

export function GraphImportPanel({data,measureId}:Props){
 const [result,setResult]=useState<Result|null>(null);
 const [filename,setFilename]=useState('');
 const [busy,setBusy]=useState(false);
 const handleFile=async(event:ChangeEvent<HTMLInputElement>)=>{
  const selected=event.currentTarget.files?.[0];
  event.currentTarget.value='';
  if(!selected)return;
  setFilename(selected.name);setBusy(true);setResult(null);
  try{
   if(selected.size>MAX_GRAPH_IMPORT_BYTES){
    setResult({status:'invalid',code:'too_large',message:'El archivo supera 1 MiB.',
     checksumVerified:false,comparable:false,changes:null,details:[]});
    return;
   }
   const text=await selected.text();
   const report=await inspectDocumentGraphImport(text,data,measureId);
   setResult(report);
  }catch{
   setResult({status:'invalid',code:'read_error',message:'No fue posible leer el archivo seleccionado.',
    checksumVerified:false,comparable:false,changes:null,details:[]});
  }finally{setBusy(false);}
 };
 const terms:Record<string,string>={
  addedNodes:'Registros nuevos en el expediente',
  removedNodes:'Registros presentes solo en el archivo',
  changedNodes:'Registros con campos diferentes',
  addedEdges:'Vínculos nuevos en el expediente',
  removedEdges:'Vínculos presentes solo en el archivo'
 };
 return <section className="ref-import-panel" aria-labelledby="ref-import-title" data-graph-import={measureId}>
   <div className="ref-import-heading">
    <div><p className="ref-trace-eyebrow">VERIFICACIÓN DOCUMENTAL · SOLO LECTURA</p>
     <h4 id="ref-import-title">Comprobar un JSON de trazabilidad</h4>
     <p>Seleccioná un extracto exportado anteriormente para verificar su huella y compararlo
      con esta medida, sin reemplazar ni añadir registros.</p>
    </div>
    <label className="ref-import-picker">
     <span>{busy?'Comprobando…':'Seleccionar archivo JSON'}</span>
     <input type="file" accept=".json,application/json" onChange={handleFile}
      disabled={busy} aria-label="Importar JSON para verificar, sin modificar expediente"
      data-graph-import-input="true"/>
    </label>
   </div>
   <p className="ref-import-caution">Máximo 1 MiB · Solo esquema <code>ambienta.document_trace.v1</code> ·
    No se guarda ni sincroniza el archivo. SHA-256 no prueba autenticidad ni cumplimiento.</p>
   {filename&&<p className="ref-import-filename">Archivo seleccionado: <strong>{filename}</strong></p>}
   {busy&&<p role="status">Comprobando estructura y huella…</p>}
   {result&&<div className={'ref-import-result ref-import-'+result.status}
     role="status" data-graph-import-result={result.code}>
     <div className="ref-import-result-head">
      <strong>{result.status==='identical'?'Huella válida · Sin diferencias':
       result.status==='different'?'Huella válida · Existen diferencias':
       result.checksumVerified?'Huella válida · Archivo no compatible':
       'El archivo no superó la verificación'}</strong>
      <p>{result.message}</p>
     </div>
     {result.comparable&&result.imported&&result.current&&<>
      <div className="ref-import-snapshots">
       <span><strong>Archivo</strong> Rev. {result.imported.revision} ·
        {result.imported.nodes} registros · {result.imported.edges} vínculos</span>
       <span><strong>Expediente actual</strong> Rev. {result.current.revision} ·
        {result.current.nodes} registros · {result.current.edges} vínculos</span>
      </div>
      {result.changes&&<div className="ref-import-diff-counts">
       {Object.entries(terms).map(([key,label])=>
        <span key={key}><strong>{result.changes?.[key]??0}</strong> {label}</span>)}
      </div>}
      {result.changes&&(result.changes.warningsChanged||result.changes.metadataChanged)&&
       <p className="ref-import-caution">
        {result.changes.warningsChanged?'Advertencias o exclusiones diferentes. ':''}
        {result.changes.metadataChanged?'Metadatos de origen o revisión diferentes.':''}
       </p>}
      {result.details.length>0&&<div className="ref-import-details">
       <h5>Registros que requieren revisión</h5>
       <ul>{result.details.map((d,i)=><li key={i}>
        <strong>{d.id}</strong> · {d.kind==='added'?'Nuevo en el expediente':
          d.kind==='removed'?'Solo en el archivo':'Campos diferentes'}
        {d.fields?.length>0?' ('+d.fields.join(', ')+')':''}
       </li>)}</ul>
      </div>}
     </>}
     <p className="ref-import-disclaimer">{result.disclaimer||
       'No se adoptó ningún registro del archivo. La huella no autentica la procedencia.'}</p>
    </div>}
  </section>;
}
