import {useEffect,useRef,useState} from 'react';
import maplibregl,{type Map as MapLibreMap} from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
type Props={vertices:number[][];onAdd:(p:number[])=>void;bounds?:number[]|null;
 center?:{lat:number;lon:number}|null;enabled:boolean};
const STYLE:maplibregl.StyleSpecification={
 version:8,sources:{base:{type:'raster',tiles:['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
 tileSize:256,attribution:'© OpenStreetMap contributors'}},
 layers:[{id:'base',type:'raster',source:'base'}]
};
export function PerimeterDrawMap({vertices,onAdd,bounds,center,enabled}:Props){
 const root=useRef<HTMLDivElement|null>(null),mapRef=useRef<MapLibreMap|null>(null);
 const addRef=useRef(onAdd),allowRef=useRef(enabled);
 const [ready,setReady]=useState(false);
 useEffect(()=>{addRef.current=onAdd;allowRef.current=enabled;},[onAdd,enabled]);
 useEffect(()=>{
  if(!root.current)return;
  const map=new maplibregl.Map({container:root.current,style:STYLE,
   center:[center?.lon??-67.2,center?.lat??-24.7],zoom:11,
   minZoom:3,maxZoom:18,attributionControl:false,dragRotate:false});
  mapRef.current=map;map.doubleClickZoom.disable();
  map.addControl(new maplibregl.NavigationControl({showCompass:false}),'top-right');
  map.addControl(new maplibregl.AttributionControl({compact:true}),'bottom-right');
  map.on('click',e=>{if(allowRef.current)addRef.current([
   Number(e.lngLat.lng.toFixed(8)),Number(e.lngLat.lat.toFixed(8))]);});
  map.on('load',()=>{
   map.addSource('draft-perimeter',{type:'geojson',data:{type:'FeatureCollection',features:[]}});
   map.addLayer({id:'draft-line',source:'draft-perimeter',type:'line',
    paint:{'line-color':'#ffd89b','line-width':3.5}});
   map.addLayer({id:'draft-vertices',source:'draft-perimeter',type:'circle',
    filter:['==',['geometry-type'],'Point'],
    paint:{'circle-color':'#fff5cf','circle-radius':6,'circle-stroke-color':'#0a3030','circle-stroke-width':2}});
   if(bounds?.length===4)map.fitBounds([[bounds[0],bounds[1]],[bounds[2],bounds[3]]],{
    duration:0,padding:60,maxZoom:14});
   setReady(true);
  });
  const observer=new ResizeObserver(()=>map.resize());observer.observe(root.current);
  return ()=>{observer.disconnect();map.remove();mapRef.current=null;};
 },[]);
 useEffect(()=>{
  const map=mapRef.current;if(!ready||!map)return;
  const features:any[]=[];
  if(vertices.length>=2)features.push({type:'Feature',properties:{},
   geometry:{type:'LineString',coordinates:vertices}});
  if(vertices.length>=3)features.push({type:'Feature',properties:{},
   geometry:{type:'LineString',coordinates:[vertices.at(-1),vertices[0]]}});
  vertices.forEach((p,i)=>features.push({type:'Feature',properties:{index:i},
   geometry:{type:'Point',coordinates:p}}));
  const source=map.getSource('draft-perimeter') as maplibregl.GeoJSONSource|undefined;
  source?.setData({type:'FeatureCollection',features});
 },[vertices,ready]);
 return <div className="geo-perimeter-editor-map" data-perimeter-draw-map="true">
  <div className={'geo-perimeter-map-canvas'+(enabled?' is-drawing':'')} ref={root}
   role="region" aria-label="Mapa para dibujar el perímetro"/>
  <div className="geo-perimeter-map-hint">{enabled?
   'Modo dibujo activo · tocá el mapa para añadir vértices':
   'Modo navegación · activá dibujo para trazar el perímetro'}</div>
 </div>;
}
