/**
 * Conesa F3b-QA3 — source-pixel view and picking sensitivity.
 * The image view is reversible. No scientific/statistical uncertainty is inferred.
 */
import type {ImagePixel,VisualCalibration,VisualPoint} from './ConesaF3VisualDigitizerModel';
import {usableVisualPoints} from './ConesaF3VisualDigitizerModel';

export const ZOOM_LEVELS=[1,2,4,8] as const;
export type PrecisionZoom=typeof ZOOM_LEVELS[number];
export type PrecisionView={zoom:PrecisionZoom;center:ImagePixel};
export type SourceViewport={x:number;y:number;width:number;height:number};
export type SessionSeries={label:string;points:VisualPoint[];radiusPixels:number};
export function precisionViewport(
 width:number,height:number,view:PrecisionView
):SourceViewport|null{
 if(!Number.isFinite(width)||!Number.isFinite(height)||width<=0||height<=0||
  !ZOOM_LEVELS.includes(view.zoom)||!Number.isFinite(view.center.x)||
  !Number.isFinite(view.center.y))return null;
 const w=width/view.zoom,h=height/view.zoom;
 const x=Math.max(0,Math.min(width-w,view.center.x-w/2));
 const y=Math.max(0,Math.min(height-h,view.center.y-h/2));
 return {x,y,width:w,height:h};
}
export function movePrecisionView(
 width:number,height:number,view:PrecisionView,
 dx:number,dy:number
):PrecisionView{
 const viewport=precisionViewport(width,height,view);
 if(!viewport||!Number.isFinite(dx)||!Number.isFinite(dy))return view;
 const desired={zoom:view.zoom,center:{
  x:Math.max(viewport.width/2,Math.min(width-viewport.width/2,
   viewport.x+viewport.width/2+dx*viewport.width)),
  y:Math.max(viewport.height/2,Math.min(height-viewport.height/2,
   viewport.y+viewport.height/2+dy*viewport.height))
 }};
 return desired;
}
export type PixelSensitivity={
 radiusPixels:number;maxAbsM:number;maxAbsCA:number;
};
export function pixelSensitivity(
 calibration:VisualCalibration,radiusPixels:number
):PixelSensitivity|null{
 if(!Number.isFinite(radiusPixels)||radiusPixels<=0||radiusPixels>10)return null;
 const {x,y}=calibration;
 const m=Math.abs((x.v1-x.v0)/(x.p1-x.p0))*radiusPixels;
 const ca=Math.abs((y.v1-y.v0)/(y.p1-y.p0))*radiusPixels;
 if(!Number.isFinite(m)||!Number.isFinite(ca))return null;
 return {radiusPixels,maxAbsM:m,maxAbsCA:ca};
}
export function validSessionSeries(series:SessionSeries):boolean{
 return series.label.trim().length>=3&&series.label.length<=120&&
 Number.isFinite(series.radiusPixels)&&series.radiusPixels>0&&
 usableVisualPoints(series.points).problems.length===0;
}
/** JSON is supporting evidence, not approval; the bitmap is never included. */
export function seriesSessionExport(args:{
 sourceName:string;width:number;height:number;calibration:VisualCalibration;
 series:SessionSeries[]
}){
 if(!args.sourceName.trim()||args.width<=0||args.height<=0||
  !args.series.length||!args.series.every(validSessionSeries))
  return null;
 return {
  schema:'ambienta.conesa.f3b.qa3.multiserie-sesion.v1',
  qualification:'Lecturas locales no certificadas; no importables en F3b monoserie',
  sourceName:args.sourceName,dimensions:{width:args.width,height:args.height},
  calibration:args.calibration,
  series:args.series.map(s=>{
   const ordered=[...s.points].sort((a,b)=>a.m-b.m);
   return {
    label:s.label,assumedClickRadiusPx:s.radiusPixels,
    sensitivity:pixelSensitivity(args.calibration,s.radiusPixels),
    points:ordered.map(p=>({m:p.m,ca:p.ca})),
    sourcePixels:ordered.map(p=>p.pixel)
   };
  })
 };
}
