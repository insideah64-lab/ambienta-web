import {useState} from 'react';
import {AmbientaIcon, type AmbientaIconName} from './AmbientaIcon';
import artBrand from '../../assets/ai/icon-brand.webp';
import artDashboard from '../../assets/ai/icon-dashboard.webp';
import artFolder from '../../assets/ai/icon-folder.webp';
import artTerritory from '../../assets/ai/icon-territory.webp';
import artImpacts from '../../assets/ai/icon-impacts.webp';
import artPga from '../../assets/ai/icon-pga.webp';
import artMonitoring from '../../assets/ai/icon-monitoring.webp';
import artAudits from '../../assets/ai/icon-audits.webp';
import artEvidence from '../../assets/ai/icon-evidence.webp';
import artGis from '../../assets/ai/icon-gis.webp';
import artReports from '../../assets/ai/icon-reports.webp';
import artSatellite from '../../assets/ai/icon-satellite.webp';
import artLegal from '../../assets/ai/icon-legal.webp';
import artLibrary from '../../assets/ai/icon-library.webp';
import artHistory from '../../assets/ai/icon-history.webp';
import artCloud from '../../assets/ai/icon-cloud.webp';
import artVegetation from '../../assets/ai/icon-vegetation.webp';
import artWater from '../../assets/ai/icon-water.webp';
import artAir from '../../assets/ai/icon-air.webp';
import artNoise from '../../assets/ai/icon-noise.webp';
import artMeasures from '../../assets/ai/icon-measures.webp';
import artInspections from '../../assets/ai/icon-inspections.webp';
import artBiodiversity from '../../assets/ai/icon-biodiversity.webp';
import artCalendar from '../../assets/ai/icon-calendar.webp';
import artNotice from '../../assets/ai/icon-notice.webp';
import artReview from '../../assets/ai/icon-review.webp';
import artExport from '../../assets/ai/icon-export.webp';
import artIndustry from '../../assets/ai/icon-industry.webp';

/**
 * Actual generated raster artwork, bundled by Vite and hosted locally by
 * GitHub Pages. SVG remains an invisible-to-the-eye fallback if an image fails;
 * it is NOT the primary icon design. No CDN, font service or model dependency.
 */
const art:Partial<Record<AmbientaIconName,string>>={
 brand:artBrand,dashboard:artDashboard,folder:artFolder,
 territory:artTerritory,impacts:artImpacts,pga:artPga,
 monitoring:artMonitoring,audits:artAudits,evidence:artEvidence,
 gis:artGis,reports:artReports,satellite:artSatellite,
 legal:artLegal,library:artLibrary,history:artHistory,cloud:artCloud,
 vegetation:artVegetation,water:artWater,air:artAir,noise:artNoise,
 measures:artMeasures,inspections:artInspections,biodiversity:artBiodiversity,
 calendar:artCalendar,notice:artNotice,review:artReview,export:artExport,
 industry:artIndustry
};
export function ArtworkIcon({kind,size=27,className=''}:{
 kind:AmbientaIconName;size?:number;className?:string
}){
 const [loaded,setLoaded]=useState(false);
 const src=art[kind];
 return <span data-ambienta-artwork={kind}
   className={'amb-art-icon '+(loaded?'amb-art-loaded ':'')+className}
   style={{width:size,height:size}} aria-hidden="true">
   <AmbientaIcon kind={kind} size={size} className="amb-art-fallback"/>
   {src&&<img src={src} width={size} height={size} alt=""
     loading="eager" decoding="async" draggable={false}
     onLoad={()=>setLoaded(true)} onError={()=>setLoaded(false)}/>}
 </span>;
}
