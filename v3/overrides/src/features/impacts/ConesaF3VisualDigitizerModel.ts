/**
 * Conesa F3b-QA2: coordinate mapping for a local raster image.
 * All pixel coordinates use original image dimensions (not CSS pixels).
 * Only linear continuous axes; no automatic curve detection or extrapolation.
 */
import {auditNumber,parseIndependentReading,type F3BAudit} from './ConesaF3DigitizationModel';
import type {F3BCurvePoint} from './ConesaF3CurveModel';
import {f3bPointProblems} from './ConesaF3CurveModel';

export type ImagePixel={x:number;y:number};
export type AxisCalibration={p0:number;p1:number;v0:number;v1:number};
export type VisualCalibration={x:AxisCalibration;y:AxisCalibration};
export type VisualPoint={pixel:ImagePixel;m:number;ca:number};
const finite=(n:number)=>Number.isFinite(n);
const imageSizeValid=(width:number,height:number)=>finite(width)&&finite(height)&&
 width>=32&&height>=32&&width<=12000&&height<=12000;
function axis(p0:string,v0:string,p1:string,v1:string,upper:number):AxisCalibration|null{
 const pixel0=auditNumber(p0),pixel1=auditNumber(p1);
 const value0=auditNumber(v0),value1=auditNumber(v1);
 if(pixel0===null||pixel1===null||value0===null||value1===null||
  pixel0===pixel1||value0===value1||
  pixel0<0||pixel1<0||pixel0>upper||pixel1>upper)return null;
 return {p0:pixel0,p1:pixel1,v0:value0,v1:value1};
}
export function visualCalibration(a:Pick<F3BAudit,
 'xPixelA'|'xPixelB'|'xValueA'|'xValueB'|
 'yPixelA'|'yPixelB'|'yValueA'|'yValueB'>,width:number,height:number
):{calibration:VisualCalibration|null;problems:string[]}{
 if(!imageSizeValid(width,height))
  return {calibration:null,problems:['Imagen sin dimensiones válidas (32–12000 px por eje)']};
 const x=axis(a.xPixelA,a.xValueA,a.xPixelB,a.xValueB,width);
 const y=axis(a.yPixelA,a.yValueA,a.yPixelB,a.yValueB,height);
 const problems:string[]=[];
 if(!x)problems.push('Faltan dos marcas X distintas dentro de la imagen y sus magnitudes');
 if(!y)problems.push('Faltan dos marcas Y distintas dentro de la imagen y sus CA');
 if(y&&(Math.min(y.v0,y.v1)<0||Math.max(y.v0,y.v1)>1))
  problems.push('Las referencias del eje CA deben estar entre 0 y 1');
 return {calibration:!problems.length&&x&&y?{x,y}:null,problems};
}
export function imageToMagnitude(pixel:ImagePixel,c:VisualCalibration,
 width:number,height:number):F3BCurvePoint|null{
 if(!imageSizeValid(width,height)||!finite(pixel.x)||!finite(pixel.y)||
  pixel.x<0||pixel.x>width||pixel.y<0||pixel.y>height)return null;
 // Permit clicks only between the two calibration marks on each axis.
 if(pixel.x<Math.min(c.x.p0,c.x.p1)||pixel.x>Math.max(c.x.p0,c.x.p1)||
  pixel.y<Math.min(c.y.p0,c.y.p1)||pixel.y>Math.max(c.y.p0,c.y.p1))return null;
 const m=c.x.v0+(pixel.x-c.x.p0)*(c.x.v1-c.x.v0)/(c.x.p1-c.x.p0);
 const ca=c.y.v0+(pixel.y-c.y.p0)*(c.y.v1-c.y.v0)/(c.y.p1-c.y.p0);
 if(!finite(m)||!finite(ca)||ca<0||ca>1)return null;
 return {m,ca};
}
export function usableVisualPoints(points:readonly VisualPoint[]):{
 points:F3BCurvePoint[];problems:string[]
}{
 const sorted=points.map(p=>({m:p.m,ca:p.ca})).sort((a,b)=>a.m-b.m);
 const problems= f3bPointProblems(sorted);
 return {points:sorted,problems};
}
/** No rounding of the internal coordinates; export precision is only display formatting. */
export function asIndependentReading(points:readonly VisualPoint[]):string|null{
 const result=usableVisualPoints(points);
 if(result.problems.length)return null;
 return result.points.map(p=>String(p.m)+';'+String(p.ca)).join('\n');
}
export function proposedReadingProblems(text:string):string[]{
 return parseIndependentReading(text).problems;
}
