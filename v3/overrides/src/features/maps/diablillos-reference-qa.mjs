// AMBIENTA V3.5.3 — audit-only Diablillos regional perimeter fixture.
// Only the geographic centre and 2025 reported area are grounded in AbraSilver PFS.
// The vertices are explicitly SYNTHETIC. They are not cadastral, EIA, project, or mine limits.
import {aoiKey} from './aoi-model.mjs';
import {perimeterKey,readPerimeter,buildPerimeterRecord,savePerimeter,
 suggestWindowForBounds,perimeterHistoryKey} from './perimeter-source.mjs';

export const DIABLILLOS_REFERENCE_2025={
 centre:[-66.83333333333333,-25.3],
 centreSource:'2025 NI 43-101 PFS, Section 4, Diablillos',
 referenceAreaHa:11403,
 reportDate:'2025-01-17',
 reportUrl:'https://www.abrasilver.com/_resources/tech-reports/NI-43-101-Technical-Report-PFS-Diablillos-Project.pdf?v=040611',
 shapeMethod:'Synthetic 15-vertex irregular polygon, scaled from cited 2025 area solely for GIS QA; not surveyed nor digitized from claims.',
 sha256:'ee12f2761020d689c325deb3b29ce5d44e3c9daf1ef70f4e82dc65da2341abb1',
 marker:'ambienta-diablillos-reference-QA-v1'
};

export const DIABLILLOS_QA_GEOJSON={
 type:'FeatureCollection',
 features:[{type:'Feature',
  properties:{name:'Diablillos — contorno ilustrativo QA, NO catastral'},
  geometry:{type:'Polygon',coordinates:[[
   [-66.770979,-25.3],[-66.780167,-25.278599],[-66.789226,-25.255712],
   [-66.815353,-25.252789],[-66.840037,-25.242333],[-66.867895,-25.247997],
   [-66.878087,-25.271669],[-66.895487,-25.288056],[-66.889678,-25.310828],
   [-66.884809,-25.33636],[-66.859245,-25.342262],[-66.837973,-25.359985],
   [-66.813806,-25.351272],[-66.795263,-25.33691],[-66.774296,-25.322656],
   [-66.770979,-25.3]
  ]]}}
 ]};

export const DIABLILLOS_QA_SOURCE_DESCRIPTION=
 'QA ILUSTRATIVO: centro y superficie reportados por AbraSilver, PFS 2025. '+
 'Vértices generados por IA; NO es límite oficial, concesión ni área de influencia.';

export function seedDiablillosQaReference(storage,createdAt){
 const key=perimeterKey(true),aoiStorage=aoiKey(true);
 // This is an explicitly selected fixture; user-provided geometries always win.
 if(storage.getItem(key)!==null)return {status:'existing_preserved'};
 const src=JSON.stringify(DIABLILLOS_QA_GEOJSON);
 const record=buildPerimeterRecord({
  geojson:DIABLILLOS_QA_GEOJSON,
  sha256:DIABLILLOS_REFERENCE_2025.sha256,
  sourceName:'DIABLILLOS-REFERENCIA-ILUSTRATIVA-NO-OFICIAL.geojson',
  sourceType:'geojson',
  description:DIABLILLOS_QA_SOURCE_DESCRIPTION,
  createdAt,
  rawText:src
 });
 const tagged={...record,qaMarker:DIABLILLOS_REFERENCE_2025.marker,
  referenceSourceUrl:DIABLILLOS_REFERENCE_2025.reportUrl,
  geometricStatus:'SYNTHETIC_QA_ONLY'};
 const saved=savePerimeter(storage,key,perimeterHistoryKey(true),tagged);
 // The synthetic view uses a local query window, not a claimed real perimeter.
 // Never override a user-defined previous query window.
 if(storage.getItem(aoiStorage)===null){
  try{storage.setItem(aoiStorage,JSON.stringify(suggestWindowForBounds(tagged.bounds)));}
  catch{/* the perimeter remains valid and can be displayed without an AOI */}
 }
 return {...saved,status:'seeded_illustrative_qa',record:tagged};
}
export function readDiablillosQaReference(storage){
 const existing=readPerimeter(storage,perimeterKey(true));
 return existing?.qaMarker===DIABLILLOS_REFERENCE_2025.marker?existing:null;
}
