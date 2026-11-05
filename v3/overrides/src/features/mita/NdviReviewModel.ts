export type ViewScale={domain:[number,number];legend:{value:number;color:string}[]};
export const ZOOM_LEVELS=[1,2,4,8];
export const nextRasterZoom=(value:number,direction:number)=>ZOOM_LEVELS[Math.max(0,Math.min(3,ZOOM_LEVELS.indexOf(value)+(direction>0?1:-1)))];
export type NdviAnalysis={jobId:string;sceneId:string;outputSha256:string;validPixels:number;p02:number|null;median:number|null;p98:number|null;histogram:{lo:number;hi:number;count:number}[];fixed:ViewScale;local:ViewScale|null;palettes?:Partial<Record<'viridis'|'cividis',{fixed:ViewScale;local:ViewScale|null}>>};
const finite=(x:unknown):x is number=>typeof x==='number'&&Number.isFinite(x);
export function viewGradient(scale:ViewScale){
 const [lo,hi]=scale?.domain||[];
 if(!finite(lo)||!finite(hi)||hi<=lo||!Array.isArray(scale.legend)||scale.legend.length<2||scale.legend.length>20||scale.legend.some((s,i)=>!finite(s.value)||s.value<lo-1e-9||s.value>hi+1e-9||!/^#[a-f0-9]{6}ff$/i.test(s.color)||(i>0&&s.value<=scale.legend[i-1].value))||Math.abs(scale.legend[0].value-lo)>1e-9||Math.abs(scale.legend[scale.legend.length-1].value-hi)>1e-9)throw Error('Escala visual incompatible.');
 return 'linear-gradient(to right,'+scale.legend.map(s=>s.color+' '+((s.value-lo)/(hi-lo)*100)+'%').join(',')+')';
}
export function parseNdviAnalysis(input:unknown,jobId:string,sceneId:string,validPixels:number):NdviAnalysis{
 const a=input as NdviAnalysis;
 if(!a||a.jobId!==jobId||a.sceneId!==sceneId||!(/^[a-f0-9]{64}$/i.test(a.outputSha256||''))||a.validPixels!==validPixels||!Number.isInteger(a.validPixels)||a.validPixels<0||a.validPixels>12000000)throw Error('La distribución no corresponde al resultado seleccionado.');
 viewGradient(a.fixed);if(a.fixed.domain[0]!==-1||a.fixed.domain[1]!==1)throw Error('La escala fija debe conservar −1 a +1.');
 if(!Array.isArray(a.histogram)||a.histogram.length>80||a.histogram.some((b,i)=>!finite(b.lo)||!finite(b.hi)||b.hi<=b.lo||!Number.isInteger(b.count)||b.count<0||(i>0&&Math.abs(b.lo-a.histogram[i-1].hi)>1e-6))||a.histogram.reduce((n,b)=>n+b.count,0)!==a.validPixels)throw Error('Histograma incompleto o inconsistente.');
 if(a.validPixels){if(!a.histogram.length||![a.p02,a.median,a.p98].every(x=>finite(x)&&Math.abs(x)<=1.00001)||a.p02!>a.median!||a.median!>a.p98!)throw Error('Percentiles inválidos.');}
 else if(a.p02!==null||a.median!==null||a.p98!==null||a.local!==null)throw Error('Un resultado sin datos no admite percentiles.');
 if(a.local){viewGradient(a.local);if(a.local.domain[0]!==a.p02||a.local.domain[1]!==a.p98)throw Error('Contraste local sin límites P02–P98 trazables.');}
 if(a.palettes){for(const [name,p] of Object.entries(a.palettes)){if(!['viridis','cividis'].includes(name)||!p)throw Error('Paleta no compatible.');viewGradient(p.fixed);if(p.fixed.domain[0]!==-1||p.fixed.domain[1]!==1)throw Error('Paleta fija sin escala completa.');if(p.local){viewGradient(p.local);if(p.local.domain[0]!==a.p02||p.local.domain[1]!==a.p98)throw Error('Paleta local sin límites trazables.');}else if(a.local)throw Error('Paleta local incompleta.');}}
 return a;
}
