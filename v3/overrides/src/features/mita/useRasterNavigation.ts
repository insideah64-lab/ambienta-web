import {useEffect,useLayoutEffect,useRef,useState} from 'react';
import {nextRasterZoom} from './NdviReviewModel';
export {ZOOM_LEVELS,nextRasterZoom} from './NdviReviewModel';
export function useRasterNavigation(zoom:number,ratio:number,ready:boolean,choose:(value:string)=>void){
 const viewport=useRef<HTMLDivElement>(null),img=useRef<HTMLImageElement>(null),[fitWidth,setFitWidth]=useState(560*ratio),anchor=useRef<{x:number;y:number;dx:number;dy:number}|null>(null),drag=useRef<{id:number;x:number;y:number;left:number;top:number}|null>(null),moved=useRef(false),latest=useRef({zoom,choose});latest.current={zoom,choose};
 const change=(next:number,x?:number,y?:number)=>{const v=viewport.current,b=img.current?.getBoundingClientRect();if(v&&b){const r=v.getBoundingClientRect(),cx=x??r.left+v.clientWidth/2,cy=y??r.top+v.clientHeight/2;anchor.current=next===1?null:{x:Math.max(0,Math.min(1,(cx-b.left)/b.width)),y:Math.max(0,Math.min(1,(cy-b.top)/b.height)),dx:cx-r.left,dy:cy-r.top};}latest.current.choose(String(next));};
 const changeRef=useRef(change);changeRef.current=change;
 useEffect(()=>{const v=viewport.current;if(!v)return;const resize=()=>setFitWidth(Math.min(v.clientWidth,560*ratio));resize();const o=new ResizeObserver(resize);o.observe(v);const wheel=(e:WheelEvent)=>{if(e.ctrlKey||!e.deltaY)return;e.preventDefault();e.stopPropagation();changeRef.current(nextRasterZoom(latest.current.zoom,e.deltaY<0?1:-1),e.clientX,e.clientY);};v.addEventListener('wheel',wheel,{passive:false});return()=>{o.disconnect();v.removeEventListener('wheel',wheel);};},[ready,ratio]);
 useLayoutEffect(()=>{const v=viewport.current,b=img.current?.getBoundingClientRect();if(!v||!b)return;if(zoom===1){v.scrollLeft=0;v.scrollTop=0;return;}const a=anchor.current;if(a){const r=v.getBoundingClientRect();v.scrollLeft+=b.left-r.left+a.x*b.width-a.dx;v.scrollTop+=b.top-r.top+a.y*b.height-a.dy;anchor.current=null;}},[zoom,fitWidth]);
 return {viewport,img,fitWidth,change,
  pointerDown:(e:React.PointerEvent<HTMLDivElement>)=>{moved.current=false;if(e.button!==0||zoom===1)return;const v=e.currentTarget;drag.current={id:e.pointerId,x:e.clientX,y:e.clientY,left:v.scrollLeft,top:v.scrollTop};v.setPointerCapture(e.pointerId);},
  pointerMove:(e:React.PointerEvent<HTMLDivElement>)=>{const d=drag.current;if(!d)return;const dx=e.clientX-d.x,dy=e.clientY-d.y;if(Math.hypot(dx,dy)>4)moved.current=true;if(moved.current){e.currentTarget.scrollLeft=d.left-dx;e.currentTarget.scrollTop=d.top-dy;}},
  pointerEnd:(e:React.PointerEvent<HTMLDivElement>)=>{drag.current=null;if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);},
  dragged:()=>moved.current};
}
