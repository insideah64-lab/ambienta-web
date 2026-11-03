/**
 * Catálogo bibliográfico del Anejo 4 (Conesa Fernández-Vítora,
 * Guía metodológica para la evaluación del impacto ambiental, 3.ª ed.
 * 1997, reimpresión 2000), I. Atmósfera, II. Suelo y III. Agua, pp. impresas 254–267.
 *
 * Verificado visualmente contra las páginas de archivo PDF 245–258.
 *
 * IMPORTANTE: son metadatos de las gráficas. No contienen puntos, datos
 * medidos, funciones numéricas ni criterios normativos argentinos.
 */
export type Annex4Section='I. Atmósfera'|'II. Suelo'|'III. Agua';
export type Annex4GraphForm='continua'|'varias-series'|'categorica'|'discontinua';
export type Annex4CatalogEntry={
 id:string;section:Annex4Section;number:number;title:string;
 printedPage:number;pdfPage:number;indicator:string;unit:string;
 graphReading:string;graphForm:Annex4GraphForm;
 numericCurve:'pendiente-de-digitalizacion';
};
export const ANNEX4_SOURCE='Conesa Fernández-Vítora, Guía metodológica para la evaluación del impacto ambiental, 3.ª ed. (1997), reimp. 2000';
export const ANNEX4_ATMOSPHERE:readonly Annex4CatalogEntry[]=[
 {id:'atm-01-co-diario',section:'I. Atmósfera',number:1,
  title:'Monóxido de carbono (1)',printedPage:254,pdfPage:245,
  indicator:'Concentración media diaria',unit:'p.p.m.',
  graphReading:'Calidad decreciente, trazado curvo',
  graphForm:'continua',numericCurve:'pendiente-de-digitalizacion'},
 {id:'atm-02-co-poblacion',section:'I. Atmósfera',number:2,
  title:'Monóxido de carbono (2)',printedPage:254,pdfPage:245,
  indicator:'Nivel de inmisión ponderado por el número de personas afectadas',
  unit:'p.p.m.',graphReading:'Calidad decreciente, trazado curvo',
  graphForm:'continua',numericCurve:'pendiente-de-digitalizacion'},
 {id:'atm-03-hidrocarburos-3h',section:'I. Atmósfera',number:3,
  title:'Hidrocarburos (1)',printedPage:255,pdfPage:246,
  indicator:'Concentración media en 3 horas',unit:'p.p.m.',
  graphReading:'Calidad decreciente, trazado curvo',
  graphForm:'continua',numericCurve:'pendiente-de-digitalizacion'},
 {id:'atm-04-hidrocarburos-poblacion',section:'I. Atmósfera',number:4,
  title:'Hidrocarburos (2)',printedPage:255,pdfPage:246,
  indicator:'Nivel de inmisión ponderado por el número de personas afectadas',
  unit:'p.p.m.',graphReading:'Calidad decreciente, trazado curvo',
  graphForm:'continua',numericCurve:'pendiente-de-digitalizacion'},
 {id:'atm-05-particulas-solidas',section:'I. Atmósfera',number:5,
  title:'Partículas sólidas',printedPage:256,pdfPage:247,
  indicator:'Concentración media en 24 horas',unit:'mg/m³',
  graphReading:'Máximo de calidad interior visible, seguido de descenso',
  graphForm:'continua',numericCurve:'pendiente-de-digitalizacion'},
 {id:'atm-06-oxidantes-fotoquimicos',section:'I. Atmósfera',number:6,
  title:'Oxidantes fotoquímicos',printedPage:256,pdfPage:247,
  indicator:'Concentración media en 1 hora',unit:'p.p.m.',
  graphReading:'Calidad decreciente, trazado curvo',
  graphForm:'continua',numericCurve:'pendiente-de-digitalizacion'},
 {id:'atm-07-oxidos-nitrogeno-anual',section:'I. Atmósfera',number:7,
  title:'Óxidos de nitrógeno (1)',printedPage:257,pdfPage:248,
  indicator:'Concentración media anual',unit:'p.p.m.',
  graphReading:'Calidad decreciente, trazado curvo',
  graphForm:'continua',numericCurve:'pendiente-de-digitalizacion'},
 {id:'atm-08-oxidos-nitrogeno-poblacion',section:'I. Atmósfera',number:8,
  title:'Óxidos de nitrógeno (2)',printedPage:257,pdfPage:248,
  indicator:'Nivel de inmisión ponderado por el número de personas afectadas',
  unit:'µg/m³',graphReading:'Calidad decreciente, trazado curvo',
  graphForm:'continua',numericCurve:'pendiente-de-digitalizacion'},
 {id:'atm-09-oxidos-azufre-24h',section:'I. Atmósfera',number:9,
  title:'Óxidos de azufre',printedPage:258,pdfPage:249,
  indicator:'Concentración media en 24 horas',unit:'p.p.m.',
  graphReading:'Calidad decreciente, trazado curvo',
  graphForm:'continua',numericCurve:'pendiente-de-digitalizacion'},
 {id:'atm-10-calidad-aire-oraqi',section:'I. Atmósfera',number:10,
  title:'Calidad del aire',printedPage:258,pdfPage:249,
  indicator:'Índice ORAQI (OR)',unit:'escala 10 a 100',
  graphReading:'Calidad decreciente según el índice ORAQI',
  graphForm:'continua',numericCurve:'pendiente-de-digitalizacion'}
 ,{id:'atm-11-ruido-presion',section:'I. Atmósfera',number:11,
  title:'Ruido (1)',printedPage:259,pdfPage:250,
  indicator:'Nivel de presión acústica',unit:'dBA',
  graphReading:'Distintas curvas según frecuencia y número de lugares afectados; no es una curva única',
  graphForm:'varias-series',numericCurve:'pendiente-de-digitalizacion'},
 {id:'atm-12-ruido-leq-ponderado',section:'I. Atmósfera',number:12,
  title:'Ruido (2)',printedPage:259,pdfPage:250,
  indicator:'Leq diurno ponderado por número de personas afectadas',unit:'dBA',
  graphReading:'Calidad decreciente según nivel equivalente ponderado',
  graphForm:'continua',numericCurve:'pendiente-de-digitalizacion'},
 {id:'atm-13-sonido-agradabilidad',section:'I. Atmósfera',number:13,
  title:'Sonido',printedPage:260,pdfPage:251,
  indicator:'Frecuencia y agradabilidad de los sonidos',unit:'Adimensional',
  graphReading:'Categorías ordenadas de frecuente/ocasional y agradable/desagradable',
  graphForm:'categorica',numericCurve:'pendiente-de-digitalizacion'},
 {id:'atm-14-olor-visibilidad',section:'I. Atmósfera',number:14,
  title:'Olor y visibilidad',printedPage:260,pdfPage:251,
  indicator:'Combinación de olores y contaminación del aire',unit:'Adimensional',
  graphReading:'Varias series por tipo de olor sobre categorías cualitativas de contaminación',
  graphForm:'varias-series',numericCurve:'pendiente-de-digitalizacion'}
] as const;

export const ANNEX4_SOIL:readonly Annex4CatalogEntry[]=[
 {id:'soil-01-erosion-sedimentos',section:'II. Suelo',number:1,
  title:'Erosión del suelo (1)',printedPage:261,pdfPage:252,
  indicator:'Sedimentos aportados',unit:'m³/ha/año',
  graphReading:'Calidad decreciente según sedimentos aportados',
  graphForm:'continua',numericCurve:'pendiente-de-digitalizacion'},
 {id:'soil-02-erosion-pendiente',section:'II. Suelo',number:2,
  title:'Erosión del suelo (2)',printedPage:261,pdfPage:252,
  indicator:'Porcentaje de pendiente ponderado por superficie afectada',unit:'%',
  graphReading:'Calidad decreciente de forma no lineal según pendiente ponderada',
  graphForm:'continua',numericCurve:'pendiente-de-digitalizacion'},
 {id:'soil-03-parcelas-erosionadas',section:'II. Suelo',number:3,
  title:'Erosión del suelo (3)',printedPage:262,pdfPage:253,
  indicator:'Parcelas agrarias erosionadas (proporción de superficie afectada)',unit:'%',
  graphReading:'Calidad decreciente según proporción afectada',
  graphForm:'continua',numericCurve:'pendiente-de-digitalizacion'},
 {id:'soil-04-estructura-parcelas',section:'II. Suelo',number:4,
  title:'Estructuras de las parcelas',printedPage:262,pdfPage:253,
  indicator:'Reducción del tamaño de las parcelas',unit:'%',
  graphReading:'Calidad decreciente en función del porcentaje de concentración',
  graphForm:'continua',numericCurve:'pendiente-de-digitalizacion'},
 {id:'soil-05-margenes-geologicos',section:'II. Suelo',number:5,
  title:'Márgenes arbolados y geológicos',printedPage:263,pdfPage:254,
  indicator:'Material geológico y cubierta arbolada de márgenes de 50 a 125 metros desde la orilla del agua',
  unit:'%',graphReading:'Varias curvas según cobertura arbolada y clases de material geológico',
  graphForm:'varias-series',numericCurve:'pendiente-de-digitalizacion'}
] as const;

export const ANNEX4_WATER:readonly Annex4CatalogEntry[]=[
 {id:'water-01-caracteristicas-fluviales',section:'III. Agua',number:1,
  title:'Características fluviales',printedPage:264,pdfPage:255,
  indicator:'Área ponderada por índice de calidad del tipo de corriente, respecto de la superficie total',
  unit:'%',graphReading:'Calidad creciente según áreas ponderadas',
  graphForm:'continua',numericCurve:'pendiente-de-digitalizacion'},
 {id:'water-02-perdida-cuenca',section:'III. Agua',number:2,
  title:'Pérdida de agua en las cuencas hidrológicas',printedPage:264,pdfPage:255,
  indicator:'Pérdidas por actividad humana respecto de descarga natural anual',
  unit:'%',graphReading:'Calidad decreciente no lineal según pérdidas',
  graphForm:'continua',numericCurve:'pendiente-de-digitalizacion'},
 {id:'water-03-oxigeno-fluido',section:'III. Agua',number:3,
  title:'Oxígeno fluido',printedPage:265,pdfPage:256,
  indicator:'Cantidad de oxígeno disuelto en agua',unit:'mg/l',
  graphReading:'Calidad creciente de forma no lineal; el libro señala saturación de 9 mg/l',
  graphForm:'continua',numericCurve:'pendiente-de-digitalizacion'},
 {id:'water-04-olor-materiales-flotantes',section:'III. Agua',number:4,
  title:'Olor y materiales flotantes',printedPage:265,pdfPage:256,
  indicator:'Cantidad de materiales flotantes y percepción del olor',unit:'Estimativa',
  graphReading:'Varias series por condición de olor sobre categorías de materiales flotantes',
  graphForm:'varias-series',numericCurve:'pendiente-de-digitalizacion'},
 {id:'water-05-plaguicidas',section:'III. Agua',number:5,
  title:'Plaguicidas en el agua',printedPage:266,pdfPage:257,
  indicator:'Relación entre concentración máxima y concentración permisible',unit:'Adimensional',
  graphReading:'Calidad decreciente con la relación de concentraciones; valor permisible del libro no es norma vigente',
  graphForm:'continua',numericCurve:'pendiente-de-digitalizacion'},
 {id:'water-06-temperatura',section:'III. Agua',number:6,
  title:'Temperatura',printedPage:266,pdfPage:257,
  indicator:'Desviación térmica respecto de temperatura de equilibrio natural',unit:'°C',
  graphReading:'Máximo de calidad alrededor del equilibrio; aparece además una curva alternativa',
  graphForm:'varias-series',numericCurve:'pendiente-de-digitalizacion'},
 {id:'water-07-sustancias-toxicas',section:'III. Agua',number:7,
  title:'Sustancias tóxicas (excepto plaguicidas)',printedPage:267,pdfPage:258,
  indicator:'Detección o no detección mediante medios analíticos',unit:'Estimativa',
  graphReading:'Umbral con salto entre las categorías no detectable y detectable',
  graphForm:'discontinua',numericCurve:'pendiente-de-digitalizacion'},
 {id:'water-08-dbo',section:'III. Agua',number:8,
  title:'Demanda biológica de oxígeno',printedPage:267,pdfPage:258,
  indicator:'Demanda biológica de oxígeno según carácter del medio acuático',unit:'mg/l',
  graphReading:'Varias curvas según corriente lenta o embalse y corriente rápida',
  graphForm:'varias-series',numericCurve:'pendiente-de-digitalizacion'}
] as const;

export const ANNEX4_CATALOG:readonly Annex4CatalogEntry[]=[
 ...ANNEX4_ATMOSPHERE,...ANNEX4_SOIL,...ANNEX4_WATER
] as const;
export const ANNEX4_SECTIONS:readonly Annex4Section[]=['I. Atmósfera','II. Suelo','III. Agua'];
export function annex4SectionCounts():{section:Annex4Section;count:number}[]{
 return ANNEX4_SECTIONS.map(section=>({section,
  count:ANNEX4_CATALOG.filter(e=>e.section===section).length}));
}

export function annex4Citation(entry:Annex4CatalogEntry):string{
 return ANNEX4_SOURCE+', Anejo 4, '+entry.section+', ficha '+entry.number+
  ' («'+entry.title+'»), p. '+entry.printedPage+'.';
}
export function searchAnnex4(query:string,section:Annex4Section|'todas'='todas'):Annex4CatalogEntry[]{
 const normalize=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'')
  .toLocaleLowerCase('es').trim();
 const term=normalize(query);
 return ANNEX4_CATALOG.filter(x=>(section==='todas'||x.section===section)&&normalize([
  x.title,x.indicator,x.unit,x.number.toString(),x.section
 ].join(' ')).includes(term));
}
