/**
 * Catálogo bibliográfico del Anejo 4 (Conesa Fernández-Vítora,
 * Guía metodológica para la evaluación del impacto ambiental, 3.ª ed.
 * 1997, reimpresión 2000), I. Atmósfera, fichas 1–10, pp. impresas 254–258.
 *
 * Verificado visualmente contra las páginas de archivo PDF 245–249.
 *
 * IMPORTANTE: son metadatos de las gráficas. No contienen puntos, datos
 * medidos, funciones numéricas ni criterios normativos argentinos.
 */
export type Annex4CatalogEntry={
 id:string;section:'I. Atmósfera';number:number;title:string;
 printedPage:number;pdfPage:number;indicator:string;unit:string;
 graphReading:string;numericCurve:'pendiente-de-digitalizacion';
};
export const ANNEX4_SOURCE='Conesa Fernández-Vítora, Guía metodológica para la evaluación del impacto ambiental, 3.ª ed. (1997), reimp. 2000';
export const ANNEX4_ATMOSPHERE:readonly Annex4CatalogEntry[]=[
 {id:'atm-01-co-diario',section:'I. Atmósfera',number:1,
  title:'Monóxido de carbono (1)',printedPage:254,pdfPage:245,
  indicator:'Concentración media diaria',unit:'p.p.m.',
  graphReading:'Calidad decreciente, trazado curvo',
  numericCurve:'pendiente-de-digitalizacion'},
 {id:'atm-02-co-poblacion',section:'I. Atmósfera',number:2,
  title:'Monóxido de carbono (2)',printedPage:254,pdfPage:245,
  indicator:'Nivel de inmisión ponderado por el número de personas afectadas',
  unit:'p.p.m.',graphReading:'Calidad decreciente, trazado curvo',
  numericCurve:'pendiente-de-digitalizacion'},
 {id:'atm-03-hidrocarburos-3h',section:'I. Atmósfera',number:3,
  title:'Hidrocarburos (1)',printedPage:255,pdfPage:246,
  indicator:'Concentración media en 3 horas',unit:'p.p.m.',
  graphReading:'Calidad decreciente, trazado curvo',
  numericCurve:'pendiente-de-digitalizacion'},
 {id:'atm-04-hidrocarburos-poblacion',section:'I. Atmósfera',number:4,
  title:'Hidrocarburos (2)',printedPage:255,pdfPage:246,
  indicator:'Nivel de inmisión ponderado por el número de personas afectadas',
  unit:'p.p.m.',graphReading:'Calidad decreciente, trazado curvo',
  numericCurve:'pendiente-de-digitalizacion'},
 {id:'atm-05-particulas-solidas',section:'I. Atmósfera',number:5,
  title:'Partículas sólidas',printedPage:256,pdfPage:247,
  indicator:'Concentración media en 24 horas',unit:'mg/m³',
  graphReading:'Máximo de calidad interior visible, seguido de descenso',
  numericCurve:'pendiente-de-digitalizacion'},
 {id:'atm-06-oxidantes-fotoquimicos',section:'I. Atmósfera',number:6,
  title:'Oxidantes fotoquímicos',printedPage:256,pdfPage:247,
  indicator:'Concentración media en 1 hora',unit:'p.p.m.',
  graphReading:'Calidad decreciente, trazado curvo',
  numericCurve:'pendiente-de-digitalizacion'},
 {id:'atm-07-oxidos-nitrogeno-anual',section:'I. Atmósfera',number:7,
  title:'Óxidos de nitrógeno (1)',printedPage:257,pdfPage:248,
  indicator:'Concentración media anual',unit:'p.p.m.',
  graphReading:'Calidad decreciente, trazado curvo',
  numericCurve:'pendiente-de-digitalizacion'},
 {id:'atm-08-oxidos-nitrogeno-poblacion',section:'I. Atmósfera',number:8,
  title:'Óxidos de nitrógeno (2)',printedPage:257,pdfPage:248,
  indicator:'Nivel de inmisión ponderado por el número de personas afectadas',
  unit:'µg/m³',graphReading:'Calidad decreciente, trazado curvo',
  numericCurve:'pendiente-de-digitalizacion'},
 {id:'atm-09-oxidos-azufre-24h',section:'I. Atmósfera',number:9,
  title:'Óxidos de azufre',printedPage:258,pdfPage:249,
  indicator:'Concentración media en 24 horas',unit:'p.p.m.',
  graphReading:'Calidad decreciente, trazado curvo',
  numericCurve:'pendiente-de-digitalizacion'},
 {id:'atm-10-calidad-aire-oraqi',section:'I. Atmósfera',number:10,
  title:'Calidad del aire',printedPage:258,pdfPage:249,
  indicator:'Índice ORAQI (OR)',unit:'escala 10 a 100',
  graphReading:'Calidad decreciente según el índice ORAQI',
  numericCurve:'pendiente-de-digitalizacion'}
] as const;
export function annex4Citation(entry:Annex4CatalogEntry):string{
 return ANNEX4_SOURCE+', Anejo 4, '+entry.section+', ficha '+entry.number+
  ' («'+entry.title+'»), p. '+entry.printedPage+'.';
}
export function searchAnnex4(query:string):Annex4CatalogEntry[]{
 const normalize=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'')
  .toLocaleLowerCase('es').trim();
 const term=normalize(query);
 return ANNEX4_ATMOSPHERE.filter(x=>normalize([
  x.title,x.indicator,x.unit,x.number.toString(),x.section
 ].join(' ')).includes(term));
}
