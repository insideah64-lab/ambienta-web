import {useState} from 'react';
import {
 ANNEX4_CATALOG,ANNEX4_SECTIONS,annex4SectionCounts,searchAnnex4,
 type Annex4CatalogEntry,type Annex4Section
} from './ConesaAnnex4Catalog';
import './ConesaAnnex4Library.css';

type Props={
 indicator:string;unit:string;disabled:boolean;hasNumericPoints:boolean;
 onUseReference:(entry:Annex4CatalogEntry)=>void
};

/**
 * Ayuda bibliográfica: "Citar" no importa nudos ni certifica la curva.
 * La valoración sigue bajo las validaciones independientes de F3b.
 */
export function ConesaAnnex4Library({indicator,unit,disabled,hasNumericPoints,onUseReference}:Props){
 const [query,setQuery]=useState('');
 const [selected,setSelected]=useState('');
 const [section,setSection]=useState<Annex4Section|'todas'>('todas');
 const matches=searchAnnex4(query,section);
 const counts=annex4SectionCounts();
 const maxCount=Math.max(...counts.map(x=>x.count),1);
 const entry=ANNEX4_CATALOG.find(item=>item.id===selected);
 return <details className="amb-f3b-library" data-f3b-library>
  <summary>Consultar catálogo del Anejo 4 · {ANNEX4_CATALOG.length} fichas documentadas</summary>
  <p className="amb-f3b-library-intro">
   Revisión bibliográfica de las páginas impresas 254–267 (atmósfera, suelo y agua).
   Las fichas se cotejaron con el ejemplar aportado; las curvas no están digitalizadas
   ni autorizadas para el cálculo.
  </p>
  <div className="amb-f3b-library-coverage" data-annex4-coverage>
   <strong>Distribución de las fichas revisadas · no representa todo el Anejo 4</strong>
   {counts.map(({section:sectionName,count})=><div key={sectionName}
    className="amb-f3b-library-coverage-row">
    <span>{sectionName}</span>
    <div className="amb-f3b-library-coverage-track" aria-hidden="true">
     <i style={{width:(100*count/maxCount)+'%'}}/>
    </div>
    <strong>{count}</strong>
   </div>)}
   <p>Fichas con curva numérica validada: <strong>0</strong> de {ANNEX4_CATALOG.length}.
    Esta vista indica documentación bibliográfica, no calidad ambiental.</p>
  </div>
  <div className="amb-f3b-library-filters">
   <label>Sección del Anejo 4
    <select aria-label="Sección Anejo 4" value={section} onChange={e=>{
     setSection(e.target.value as Annex4Section|'todas');setSelected('');
    }}>
     <option value="todas">Todas las secciones revisadas</option>
     {ANNEX4_SECTIONS.map(item=><option key={item} value={item}>{item}</option>)}
    </select>
   </label>
   <label>Buscar por indicador, contaminante o número de ficha
   <input aria-label="Buscar fichas Anejo 4" value={query} maxLength={100}
    onChange={e=>{setQuery(e.target.value);setSelected('')}}
    placeholder="Ej.: monóxido, erosión, oxígeno, DBO"/>
   </label>
  </div>
  <div className="amb-f3b-library-layout">
   <div className="amb-f3b-library-results" aria-label="Fichas bibliográficas">
    {matches.length===0?<p role="status">No hay fichas coincidentes en esta sección o búsqueda.</p>:
     matches.map(item=><button key={item.id} type="button" className="amb-f3b-library-result"
      data-annex4-id={item.id} aria-pressed={selected===item.id}
      onClick={()=>setSelected(item.id)}>
      <strong>{item.section} · {item.number}. {item.title}</strong>
      <span>Pág. {item.printedPage} · {item.indicator}</span>
     </button>)}
   </div>
   <div className="amb-f3b-library-detail" data-f3b-library-detail>
    {entry?<>
     <strong>Ficha {entry.number} · {entry.title}</strong>
     <dl>
      <div><dt>Indicador original</dt><dd>{entry.indicator}</dd></div>
      <div><dt>Unidad consignada</dt><dd>{entry.unit}</dd></div>
      <div><dt>Libro / ejemplar</dt>
       <dd>p. {entry.printedPage} · página {entry.pdfPage} del PDF</dd></div>
      <div><dt>Lectura visual de la figura</dt><dd>{entry.graphReading}</dd></div>
      <div><dt>Representación</dt><dd>{
       entry.graphForm==='continua'?'Trazado continuo':
       entry.graphForm==='varias-series'?'Varias series / condiciones':
       entry.graphForm==='categorica'?'Variable categórica':
       'Discontinuidad / umbral'
      }</dd></div>
     </dl>
     <p><strong>Estado:</strong> ficha bibliográfica revisada; valores CA(M)
      pendientes de reconstrucción y validación técnica.</p>
     {entry.graphForm!=='continua'&&
      <p className="amb-f3b-library-caution" data-annex4-nonlinear-warning>
       La figura no representa una sola función continua de una magnitud:
       necesita seleccionar series, codificar categorías o representar saltos.
       El interpolador F3b actual no reproduce esta estructura automáticamente.
      </p>}
     {indicator.trim()&&<p className="amb-f3b-library-compare">
      En el factor actual se declara «{indicator}» ({unit||'unidad sin definir'}).
      Comprobá expresamente que el indicador, período de promedio, unidad y ámbito
      correspondan a esta ficha antes de adoptarla.
     </p>}
     <button type="button" disabled={disabled||hasNumericPoints}
      onClick={()=>onUseReference(entry)}>
      Cargar únicamente cita y página en F3b
     </button>
     {hasNumericPoints&&<p role="note" className="amb-f3b-library-caution">
      Ya existen nudos cargados: para evitar atribuirlos a otra fuente, la copia
      bibliográfica queda bloqueada. Conservá o exportá la curva antes de revisarla.
     </p>}
     <p className="amb-f3b-library-fine">
      Este botón no importa magnitudes, nudos, calidad ambiental ni valores
      de escenarios. No demuestra compatibilidad con la normativa argentina.
     </p>
    </>:<p>Seleccioná una ficha para ver su indicador, unidad,
      páginas y estado de revisión.</p>}
   </div>
  </div>
 </details>;
}
