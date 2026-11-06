/** Historical EES profile, Dee et al. (1973), Fig.3 p.527, eq.1 p.526,
 * warning rules p.532. English parameter names preserve source identity.
 * No Conesa/Leopold imports, inferred measurements or renormalized weights. */
export const BATTELLE_SOURCE='https://ponce.sdsu.edu/dee_et_al_1973.pdf';
export const BATTELLE_PROFILE='battelle-ees-dee-1973-original';
export type Category='ecology'|'pollution'|'aesthetics'|'human';
export const BATTELLE_CATEGORIES:Record<Category,string>={ecology:'Ecología',pollution:'Contaminación ambiental',aesthetics:'Aspectos estéticos',human:'Interés humano'};
type Group={category:Category;name:string;items:readonly (readonly [string,number])[]};
const groups:Group[]=[
 {category:'ecology',name:'Especies y poblaciones',items:[['Terrestrial browsers and grazers',14],['Terrestrial crops',14],['Terrestrial natural vegetation',14],['Terrestrial pest species',14],['Terrestrial upland game birds',14],['Aquatic commercial fisheries',14],['Aquatic natural vegetation',14],['Aquatic pest species',14],['Sport fish',14],['Waterfowl',14]]},
 {category:'ecology',name:'Hábitats y comunidades',items:[['Terrestrial food web index',12],['Land use',12],['Terrestrial rare and endangered species',12],['Terrestrial species diversity',14],['Aquatic food web index',12],['Aquatic rare and endangered species',12],['River characteristics',12],['Aquatic species diversity',14]]},
 {category:'pollution',name:'Contaminación del agua',items:[['Basin hydrologic loss',20],['BOD',25],['Dissolved oxygen',31],['Fecal coliforms',18],['Inorganic carbon',22],['Inorganic nitrogen',25],['Inorganic phosphate',28],['Pesticides',16],['pH',18],['Stream flow variation',28],['Temperature',28],['Total dissolved solids',25],['Toxic substances',14],['Turbidity',20]]},
 {category:'pollution',name:'Contaminación del aire',items:[['Carbon monoxide',5],['Hydrocarbons',5],['Nitrogen oxides',10],['Particulate matter',12],['Photochemical oxidants',5],['Sulfur dioxide',10],['Other',5]]},
 {category:'pollution',name:'Contaminación del suelo',items:[['Land use',14],['Soil erosion',14]]},
 {category:'pollution',name:'Ruido',items:[['Noise',4]]},
 {category:'aesthetics',name:'Suelo',items:[['Geologic surface material',6],['Relief and topographic character',16],['Width and alignment',10]]},
 {category:'aesthetics',name:'Aire',items:[['Odor and visual',3],['Sounds',2]]},
 {category:'aesthetics',name:'Agua',items:[['Appearance of water',10],['Land and water interface',16],['Odor and floating materials',6],['Water surface area',10],['Wooded and geologic shoreline',10]]},
 {category:'aesthetics',name:'Biota',items:[['Animals domestic',5],['Animals wild',5],['Diversity of vegetation types',9],['Variety within vegetation types',5]]},
 {category:'aesthetics',name:'Objetos construidos',items:[['Man-made objects',10]]},
 {category:'aesthetics',name:'Composición',items:[['Composite effect',15],['Unique composition',15]]},
 {category:'human',name:'Valores educativos y científicos',items:[['Archaeological',13],['Ecological',13],['Geological',11],['Hydrological',11]]},
 {category:'human',name:'Valores históricos',items:[['Architecture and styles',11],['Events',11],['Persons',11],['Religions and cultures',11],['Western frontier',11]]},
 {category:'human',name:'Culturas (clasificación histórica)',items:[['Indians',14],['Other ethnic groups',7],['Religious groups',7]]},
 {category:'human',name:'Sensaciones y atmósfera',items:[['Awe-inspiration',11],['Isolation/solitude',11],['Mystery',4],['Oneness with nature',11]]},
 {category:'human',name:'Patrones de vida',items:[['Employment opportunities',13],['Housing',13],['Social interactions',11]]}
];
let index=0;
export const BATTELLE_PARAMETERS=groups.flatMap((g,component)=>g.items.map(([name,weight])=>({id:'bc-'+String(++index).padStart(2,'0'),number:index,name,weight,category:g.category,component:g.name,componentId:component+1})));
export type BattelleParameter=typeof BATTELLE_PARAMETERS[number];
export type BattelleEntry={indicator:string;unit:string;xWithout:number|null;xWith:number|null;
 kindWithout:''|'measured'|'estimated';kindWith:''|'measured'|'estimated';
 evidenceWithout:string;evidenceWith:string;curveText:string;curveSource:string;convention:string;evaluator:string};
export type BattelleDocument={schema:'ambienta.battelle.v1';profile:typeof BATTELLE_PROFILE;projectId:string;projectName:string;updatedAt:string;
 alternative:string;horizon:string;boundary:string;ecosystems:string;entries:Record<string,BattelleEntry>};
export const emptyBattelleEntry=():BattelleEntry=>({indicator:'',unit:'',xWithout:null,xWith:null,kindWithout:'',kindWith:'',evidenceWithout:'',evidenceWith:'',curveText:'',curveSource:'',convention:'',evaluator:''});
export const emptyBattelle=(projectId:string,projectName:string):BattelleDocument=>({schema:'ambienta.battelle.v1',profile:BATTELLE_PROFILE,projectId,projectName,updatedAt:new Date().toISOString(),alternative:'',horizon:'',boundary:'',ecosystems:'',entries:{}});
const text=(s:unknown,max=5000):s is string=>typeof s==='string'&&s.length<=max;
const finite=(v:unknown):v is number=>typeof v==='number'&&Number.isFinite(v);
export function validBattelle(value:unknown,projectId:string):value is BattelleDocument{
 if(!value||typeof value!=='object'||Array.isArray(value))return false;
 const d=value as BattelleDocument;
 if(d.schema!=='ambienta.battelle.v1'||d.profile!==BATTELLE_PROFILE||d.projectId!==projectId||!text(d.projectName,500)||!text(d.updatedAt,100)||!['alternative','horizon','boundary','ecosystems'].every(k=>text(d[k as keyof BattelleDocument])))return false;
 if(!d.entries||typeof d.entries!=='object'||Array.isArray(d.entries)||Object.keys(d.entries).length>78)return false;
 return Object.entries(d.entries).every(([id,e])=>BATTELLE_PARAMETERS.some(p=>p.id===id)&&!!e&&typeof e==='object'&&!Array.isArray(e)&&
  ['indicator','unit','evidenceWithout','evidenceWith','curveText','curveSource','convention','evaluator'].every(k=>text(e[k as keyof BattelleEntry]))&&
  (e.xWithout===null||finite(e.xWithout))&&(e.xWith===null||finite(e.xWith))&&
  ['','measured','estimated'].includes(e.kindWithout)&&['','measured','estimated'].includes(e.kindWith));
}
export type Knot={x:number;y:number};
export function battelleCurve(raw:string):{nodes:Knot[];error:string}{
 const lines=raw.trim().split('\n');
 if(!raw.trim()||lines.length<2||lines.length>100)return {nodes:[],error:'Ingresá entre 2 y 100 nudos, uno por línea: indicador;CA.'};
 const nodes:Knot[]=[];
 for(const line of lines){
  const parts=line.trim().split(';').map(s=>s.trim());
  if(parts.length!==2||parts.some(s=>!s||!/^[-+]?(?:\d+(?:[.,]\d*)?|[.,]\d+)(?:e[-+]?\d+)?$/i.test(s)))return {nodes:[],error:'Cada línea debe contener dos números separados por punto y coma.'};
  const [x,y]=parts.map(s=>Number(s.replace(',','.')));
  if(!finite(x)||!finite(y)||y<0||y>1||nodes.length&&x<=nodes[nodes.length-1].x)return {nodes:[],error:'CA debe estar entre 0 y 1; los indicadores deben crecer sin duplicados. No se admiten saltos discontinuos.'};
  nodes.push({x,y});
 }
 return {nodes,error:''};
}
export function battelleQuality(nodes:Knot[],x:number|null):number|null{
 if(x===null||!finite(x)||nodes.length<2||x<nodes[0].x||x>nodes[nodes.length-1].x)return null;
 for(let i=1;i<nodes.length;i++)if(x<=nodes[i].x){const a=nodes[i-1],b=nodes[i];return a.y+(b.y-a.y)*(x-a.x)/(b.x-a.x);}
 return null;
}
export type BattelleFlag='gap'|'none'|'minor'|'major';
export function battelleFlag(category:Category,without:number|null,withProject:number|null):BattelleFlag{
 if(without===null||withProject===null)return 'gap';
 const loss=without-withProject,epsilon=1e-10;
 if(loss<=epsilon||without===0)return 'none';
 const percent=100*loss/without;
 if(category==='ecology')return percent>10+epsilon?'major':percent>=5-epsilon?'minor':'none';
 if(loss<0.1-epsilon)return 'none';
 return percent>=30-epsilon?'major':'minor';
}
export function evaluateBattelle(doc:BattelleDocument,param:BattelleParameter){
 const e=doc.entries[param.id],reasons:string[]=[];
 if(!doc.alternative.trim()||!doc.horizon.trim()||!doc.boundary.trim())reasons.push('Definí alternativa, horizonte común y ámbito del estudio.');
 if(!e)return {ready:false,reasons:[...reasons,'Faltan mediciones y función documentada.'],nodes:[] as Knot[],without:null,withProject:null,delta:null,uiaWithout:null,uiaWith:null,flag:'gap' as BattelleFlag};
 for(const [field,label] of Object.entries({indicator:'indicador',unit:'unidad',evidenceWithout:'fuente SIN',evidenceWith:'fuente CON',curveSource:'fuente y ámbito de la función',convention:'convención de calidad',evaluator:'evaluador'}))if(!(e[field as keyof BattelleEntry] as string).trim())reasons.push('Falta '+label+'.');
 if(!e.kindWithout||!e.kindWith)reasons.push('Identificá cada escenario como medido o estimado.');
 const curve=battelleCurve(e.curveText);if(curve.error)reasons.push(curve.error);
 const without=battelleQuality(curve.nodes,e.xWithout),withProject=battelleQuality(curve.nodes,e.xWith);
 if(without===null||withProject===null)reasons.push('Faltan valores SIN/CON o están fuera de la curva. No se extrapola.');
 const ready=reasons.length===0;
 return {ready,reasons,nodes:curve.nodes,without:ready?without:null,withProject:ready?withProject:null,
  delta:ready?(withProject!-without!)*param.weight:null,uiaWithout:ready?without!*param.weight:null,uiaWith:ready?withProject!*param.weight:null,
  flag:ready?battelleFlag(param.category,without,withProject):'gap' as BattelleFlag};
}
export function summarizeBattelle(doc:BattelleDocument){
 const rows=BATTELLE_PARAMETERS.map(p=>({parameter:p,...evaluateBattelle(doc,p)})),ready=rows.filter(r=>r.ready);
 return {rows,ready:ready.length,coveredWeight:ready.reduce((s,r)=>s+r.parameter.weight,0),
  without:ready.length?ready.reduce((s,r)=>s+r.uiaWithout!,0):null,
  withProject:ready.length?ready.reduce((s,r)=>s+r.uiaWith!,0):null,
  delta:ready.length?ready.reduce((s,r)=>s+r.delta!,0):null,
  complete:ready.length===78&&!!doc.ecosystems.trim()};
}
export function battelleCsv(doc:BattelleDocument){
 const field=(v:unknown)=>{const s=String(v??'');return '"'+(/^\s*[=+\-@\t\r]/.test(s)?"'":'')+s.replaceAll('"','""')+'"';};
 const rows:unknown[][]=[['Proyecto','Perfil','Alternativa','Horizonte','Ámbito','ID','Categoría','Componente','Parámetro','UIP','Indicador','Unidad','X SIN','Tipo SIN','Fuente SIN','X CON','Tipo CON','Fuente CON','Nudos indicador;CA','Fuente función','Convención','Evaluador','CA SIN','CA CON','UIA SIN','UIA CON','ΔUIA','Alerta','Estado']];
 for(const p of BATTELLE_PARAMETERS){const e=doc.entries[p.id],r=evaluateBattelle(doc,p);rows.push([doc.projectId,doc.profile,doc.alternative,doc.horizon,doc.boundary,p.id,BATTELLE_CATEGORIES[p.category],p.component,p.name,p.weight,e?.indicator,e?.unit,e?.xWithout,e?.kindWithout,e?.evidenceWithout,e?.xWith,e?.kindWith,e?.evidenceWith,e?.curveText,e?.curveSource,e?.convention,e?.evaluator,r.without,r.withProject,r.uiaWithout,r.uiaWith,r.delta,r.flag,r.ready?'Calculable':r.reasons.join(' ')]);}
 rows.push(['Ecosistemas (solo descriptivo)',doc.ecosystems]);
 return '\uFEFF'+rows.map(r=>r.map(field).join(';')).join('\r\n');
}
