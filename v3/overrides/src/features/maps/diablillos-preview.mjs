// AMBIENTA V3.5.1 — Diablillos visual demonstration only.
// Preload an EXPLICITLY SYNTHETIC study perimeter in otherwise empty browsers.
// Never overwrite an AOI, a study scenario, or an imported GIS working layer.
import {createPointAoi,aoiKey} from './aoi-model.mjs';
import {syntheticStudyPolygon,createStudyScenario,studyAreaStorageKey} from './study-areas.mjs';

export const DIABLILLOS_PREVIEW={
 lat:-24.70,lon:-67.20,radiusKm:5,
 syntheticSourceSha256:'2bb79c7867a90a2529e42c1e8682b4fbcf816f9b09f119efe1db5dc6fe361835',
 marker:'diablillos-study-preview-synthetic-v1'
};
const GIS_KEY='ambienta-gis-diablillos-working-v3';
export function prepareDiablillosPreview(storage,createdAt){
 const aoiStorage=aoiKey(true),studyStorage=studyAreaStorageKey(true);
 // Treat even corrupted/partial saved values as user-owned; do not silently replace.
 if(storage.getItem(aoiStorage)!==null||
    storage.getItem(studyStorage)!==null||
    storage.getItem(GIS_KEY)!==null)return {status:'existing_preserved'};
 const aoi=createPointAoi(DIABLILLOS_PREVIEW.lat,
  DIABLILLOS_PREVIEW.lon,DIABLILLOS_PREVIEW.radiusKm);
 const parent={type:'FeatureCollection',features:[syntheticStudyPolygon(aoi.bbox)]};
 // Hash is precomputed from the exact JSON.stringify of the static source. Native
 // Node tests fail if the fixture or generator changes without updating the hash.
 const scenario=createStudyScenario({bbox:aoi.bbox,geojson:parent,
  sourceHash:DIABLILLOS_PREVIEW.syntheticSourceSha256,
  sourceKind:'synthetic',generatedAt:createdAt});
 const savedAoi={...aoi,savedAt:createdAt};
 const preview={...scenario,previewMarker:DIABLILLOS_PREVIEW.marker,
  caveat:'EJEMPLO GEOMÉTRICO SINTÉTICO de Diablillos: NO representa los límites, la tenencia, un permiso, la mina real ni áreas de influencia aprobadas.'};
 // A single-tab best-effort transaction: if the scenario write fails, do not
 // leave half an automatically assigned perimeter behind.
 storage.setItem(aoiStorage,JSON.stringify(savedAoi));
 try{storage.setItem(studyStorage,JSON.stringify(preview));}
 catch(error){try{storage.removeItem(aoiStorage);}catch{}throw error;}
 return {status:'seeded',aoi:savedAoi,scenario:preview};
}

export function retractSeededDiablillosPreview(storage){
 const studyKey=studyAreaStorageKey(true),aoiStorage=aoiKey(true);
 const raw=storage.getItem(studyKey);
 if(!raw)return {status:'no_auto_preview'};
 let current;
 try{current=JSON.parse(raw);}catch{return {status:'user_data_preserved'};}
 if(current?.previewMarker!==DIABLILLOS_PREVIEW.marker||
  current?.sourceHash!==DIABLILLOS_PREVIEW.syntheticSourceSha256||
  current?.sourceKind!=='synthetic')return {status:'user_data_preserved'};
 // Only the exact automatically generated marker can be retired.
 const source=storage.getItem(GIS_KEY);
 const aoiRaw=storage.getItem(aoiStorage);
 let matchesAoi=false;
 try{
  const aoi=JSON.parse(aoiRaw);
  matchesAoi=aoi?.center?.lat===DIABLILLOS_PREVIEW.lat&&
   aoi?.center?.lon===DIABLILLOS_PREVIEW.lon&&
   aoi?.radiusKm===DIABLILLOS_PREVIEW.radiusKm&&
   aoi?.savedAt===current.createdAt;
 }catch{}
 storage.removeItem(studyKey);
 if(!source&&matchesAoi)storage.removeItem(aoiStorage);
 return {status:'auto_preview_retired',aoiRetired:!source&&matchesAoi};
}
