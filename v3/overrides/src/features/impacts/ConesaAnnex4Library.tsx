import {useState} from 'react';
import {
 ANNEX4_ATMOSPHERE,annex4Citation,searchAnnex4,
 type Annex4CatalogEntry
} from './ConesaAnnex4Catalog';
import './ConesaAnnex4Library.css';

type Props={
 indicator:string;unit:string;disabled:boolean;
 onUseReference:(entry:Annex4CatalogEntry)=>void
};

/**
 * Ayuda bibliográfica: "Citar" no importa nudos ni certifica la curva.
 * La valoración sigue bajo las validaciones independientes de F3b.
 */
export function ConesaAnnex4Library({indicator,unit,disabled,onUseReference}:Props){
 const [query,setQuery]=useState('');
 const [selected,setSelected]=useState('');
 const matches=searchAnnex4(query);
 const entry=ANNEX4_ATMOSPHERE.find(item=>item.id===selected);
 return <details className="amb-f3b-library" data-f3b-library>
  <summary>Consultar catálogo del Anejo 4 · Atmósfera ({ANNEX4_ATMOSPHERE.length} fichas)</summary>
  <p className="amb-f3b-library-intro">
   Revisión bibliográfica de las fichas 1–10 (págs. impresas 254–258).
   Se verificaron títulos, indicadores y unidades contra el ejemplar aportado;
   las curvas no están digitalizadas ni autorizadas para el cálculo.
  </p>
  <label>Buscar por indicador, contaminante o número de ficha
   <input aria-label="Buscar fichas Anejo 4" value={query} maxLength={100}
    onChange={e=>setQuery(e.target.value)} placeholder="Ej.: monóxido, partículas, ORAQI"/>
  </label>
  <div className="amb-f3b-library-layout">
   <div className="amb-f3b-library-results" aria-label="Fichas bibliográficas">
    {matches.length===0?<p role="status">No hay fichas coincidentes en este bloque de atmósfera.</p>:
     matches.map(item=><button key={item.id} type="button" className="amb-f3b-library-result"
      data-annex4-id={item.id} aria-pressed={selected===item.id}
      onClick={()=>setSelected(item.id)}>
      <strong>{item.number}. {item.title}</strong>
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
     </dl>
     <p><strong>Estado:</strong> ficha bibliográfica revisada; valores de CA(M)
      pendientes de reconstrucción y validación técnica.</p>
     {indicator.trim()&&<p className="amb-f3b-library-compare">
      En el factor actual se declara «{indicator}» ({unit||'unidad sin definir'}).
      Comprobá expresamente que el indicador, período de promedio, unidad y ámbito
      correspondan a esta ficha antes de adoptarla.
     </p>}
     <button type="button" disabled={disabled}
      onClick={()=>onUseReference(entry)}>
      Cargar únicamente cita y página en F3b
     </button>
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
