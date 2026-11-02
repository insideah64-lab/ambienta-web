import type { SVGProps } from 'react';

/** Original SVG iconography for AMBIENTA V3, intentionally not an image.
 * One coherent 24×24 family with 1.7px strokes and restrained dual-tone fills.
 * Graphic-only; use adjacent visible labels for accessible navigation.
 * No loading, network, animation timers, or external icon fonts.
 */
export type AmbientaIconName =
 | 'brand' | 'dashboard' | 'folder' | 'territory' | 'impacts'
 | 'pga' | 'monitoring' | 'audits' | 'evidence' | 'gis'
 | 'reports' | 'satellite' | 'legal' | 'library' | 'history'
 | 'cloud' | 'vegetation' | 'water' | 'air' | 'noise'
 | 'measures' | 'inspections' | 'biodiversity'
 | 'calendar' | 'notice' | 'review' | 'export' | 'industry';

type Props = Omit<SVGProps<SVGSVGElement>,'name'> & {
  kind:AmbientaIconName;
  size?:number;
  strokeWidth?:number;
};

/* Every motif has recognizable geometry, including when rendered at 18px.
 * Colors belong to surrounding semantic UI, not to an icon's internal paths. */
function Glyph({kind}:{kind:AmbientaIconName}) {
 switch(kind){
  case 'brand': return <>
   <path d="M4.5 14.5C3.6 9.3 7 4.4 20 3.5c-.8 12-5.6 17-11.7 16.4"/>
   <path d="M4.8 19.8c3.6-5.6 7.2-7.8 13.7-12.1"/>
   <path d="M4.8 11.8 8.7 14M10.1 7.9l2 3.1"/>
  </>;
  case 'dashboard': return <>
   <path d="M3.5 10.3 12 3.8l8.5 6.5v9a1.5 1.5 0 0 1-1.5 1.5H5a1.5 1.5 0 0 1-1.5-1.5z"/>
   <path d="M9.4 20.8v-6h5.2v6"/>
   <path d="m16.4 6.1 2.9-2.3"/>
  </>;
  case 'folder': return <>
   <path d="M3 6.5h6l2 2H21v10.2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
   <path d="M3 11.5h18M8 15h8M8 18h5"/>
  </>;
  case 'territory': return <>
   <path d="m4 5.5 5-2 6 2 5-2v15l-5 2-6-2-5 2z"/>
   <path d="M9 3.5v15M15 5.5v15"/>
   <circle cx="12" cy="11.8" r="2.3"/>
   <path d="m12 14.1 0 2.3"/>
  </>;
  case 'impacts': return <>
   <path d="M12 20.8C4.6 19.9 3.6 13.1 6.9 9.2c3-3.7 8.3-5.2 12.3-5.5-.2 5.3-1.1 9.1-4.5 11.8"/>
   <path d="M5.1 20.6c3.3-4.7 7.9-7.5 12.3-10.5"/>
   <path d="m15.4 16.7 3.5 3.2M18.9 16.7l-3.5 3.2"/>
  </>;
  case 'pga': return <>
   <rect x="5" y="4.7" width="14" height="16.2" rx="2.1"/>
   <path d="M9 3.7h6v3H9zM8.3 11.8l1.4 1.5 2.6-2.7M14.2 12h2.3M8.3 17l1.4 1.5 2.6-2.8M14.2 17.3h2.3"/>
  </>;
  case 'monitoring': return <>
   <path d="M3.5 12h3l2.1-4.8 3.1 10 2.8-6 2 2H21"/>
   <path d="M5.4 6.4a9 9 0 0 1 13.2.3M18.8 17.5a9 9 0 0 1-13.5.1"/>
   <path d="m5.5 4.9-.1 1.8 2 .1M18.4 19l.2-1.8-1.9-.2"/>
  </>;
  case 'audits': return <>
   <path d="m12 2.8 8 3.4v5.7c0 4.5-2.9 7.4-8 9.3-5.1-1.9-8-4.8-8-9.3V6.2z"/>
   <circle cx="11" cy="11.3" r="3.1"/>
   <path d="m13.3 13.6 3 3M9.8 11.4l.9.9 1.6-2"/>
  </>;
  case 'evidence': return <>
   <path d="M6.2 3.2h8l3.6 3.6v13.6a1 1 0 0 1-1 1H6.2a1 1 0 0 1-1-1V4.2a1 1 0 0 1 1-1z"/>
   <path d="M14.2 3.4v3.5h3.5M8.3 10h6.4M8.3 13h4M8.3 16h3.5"/>
   <path d="m13.1 17.4 1.3 1.3 2.5-2.5"/>
  </>;
  case 'gis': return <>
   <path d="m3.1 7.2 8.8-4 8.9 4-8.9 4zM3.1 11.2l8.8 4 8.9-4M3.1 15.2l8.8 4 8.9-4"/>
   <path d="M12 11.2v3.8"/>
   <circle cx="12" cy="6.8" r="1.1"/>
  </>;
  case 'reports': return <>
   <path d="M5 3h9l5 5v12a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1z"/>
   <path d="M14 3v5h5M8.2 17.5v-4.2M11.4 17.5v-6.6M14.6 17.5v-3.1"/>
   <path d="M8 19h8.5"/>
  </>;
  case 'satellite': return <>
   <path d="m10 9 5 5-3.5 3.5-5-5zM7.3 9.9 4.7 7.3l2.6-2.6 2.8 2.7M13.9 16.6l2.8 2.8 2.7-2.7-2.9-2.7"/>
   <path d="m12.7 11.3 4.1-4.1M18.2 5.8l1.8-1.8M4.5 19.6l4.3-4.3"/>
   <circle cx="18" cy="6.8" r="1.5"/>
  </>;
  case 'legal': return <>
   <path d="M12 3v17.5M6.1 6.1h11.8M8 20.5h8"/>
   <path d="m6.1 6.1-3 5.7h6zM17.9 6.1l-3 5.7h6z"/>
   <path d="M3.1 11.8c0 2.5 6 2.5 6 0M14.9 11.8c0 2.5 6 2.5 6 0"/>
  </>;
  case 'library': return <>
   <path d="M4 5h5v15H4zM9.8 3.5h5v16.5h-5zM16 6.5h4v13.5h-4z"/>
   <path d="M4 16h5M9.8 17h5M16 15.5h4"/>
  </>;
  case 'history': return <>
   <path d="M4 8a8.8 8.8 0 1 1-.5 7.2M4 3.8v5h5"/>
   <path d="M12 7.2v5.2l3.8 2.3"/>
  </>;
  case 'cloud': return <>
   <path d="M7 18.6a5.2 5.2 0 0 1-1.7-10A6.5 6.5 0 0 1 17.8 9a4.8 4.8 0 0 1 .7 9.6z"/>
   <path d="M12 12.6v5.8M9.5 15l2.5-2.5 2.5 2.5"/>
  </>;
  case 'vegetation': return <>
   <path d="M12 21v-8M12 15C5 15 4 10 5 5c5 .6 8 2.2 8 8M12 12c0-5.6 2.5-8 7.5-8-.1 5-1.7 8.3-7.5 8"/>
   <path d="M9 21h6"/>
  </>;
  case 'water': return <>
   <path d="M12 2.7C9.1 7.7 5.4 11.5 5.4 15a6.6 6.6 0 0 0 13.2 0c0-3.5-3.7-7.3-6.6-12.3z"/>
   <path d="M8.6 15.4c.2 1.8 1.5 3 3.2 3.1"/>
  </>;
  case 'air': return <>
   <path d="M3.5 9.2h11c3.2 0 4.2-2 4.2-3.7a2.5 2.5 0 0 0-4.9-.5M2.9 13h15.7a2.5 2.5 0 1 1-2.5 2.5M3.7 17h7.5a2.5 2.5 0 1 1-2.5 2.5"/>
   <circle cx="5.3" cy="5.8" r="1"/>
  </>;
  case 'noise': return <>
   <path d="M4.5 9v6M7.5 5.8v12.4M10.5 3.5v17M13.5 7.6v8.8M16.5 5.5v13M19.5 9v6"/>
  </>;
  case 'measures': return <>
   <rect x="5" y="5" width="14" height="15.5" rx="2"/>
   <path d="m8.2 11 1.7 1.7 3-3.2M14.5 11h2M8 16h8"/>
   <path d="M9 3.5h6"/>
  </>;
  case 'inspections': return <>
   <path d="M4 7.2h12.2v12.4H4zM7 4.5h6M7.2 11.8h5.4M7.2 15.3h4"/>
   <circle cx="17.7" cy="15.8" r="3.3"/>
   <path d="m20.1 18.2 2 2"/>
  </>;
  case 'calendar': return <>
   <rect x="3.4" y="5.2" width="17.2" height="15.3" rx="2.1"/>
   <path d="M7.6 3v4.4M16.4 3v4.4M3.5 9.3h17"/>
   <path d="m8.2 14.6 2.3 2.2 5.3-5"/>
  </>;
  case 'notice': return <>
   <path d="M12 3.3 21 19H3z"/>
   <path d="M12 9v4.8M12 17.1h.01"/>
   <circle cx="12" cy="17.1" r=".5" fill="currentColor" stroke="none"/>
  </>;
  case 'review': return <>
   <path d="M5.4 3.8h8l3.6 3.6v6.4M13.4 3.8v3.8h3.5M8 10.6h5.6M8 14h3.3"/>
   <path d="M6.5 3.8h-1a1 1 0 0 0-1 1V19a1 1 0 0 0 1 1h6.3"/>
   <circle cx="16" cy="16.1" r="3.4"/>
   <path d="m18.5 18.6 2.6 2.6"/>
  </>;
  case 'export': return <>
   <path d="M12 3.3v11M8.2 10.8 12 14.6l3.8-3.8"/>
   <path d="M5 16.5v3.2c0 .8.5 1.3 1.3 1.3h11.4c.8 0 1.3-.5 1.3-1.3v-3.2"/>
   <path d="M6.2 4.1h11.6"/>
  </>;
  case 'industry': return <>
   <path d="M3 20.4V10.9l5.1 3.8 5.1-3.8v9.5zM13.2 20.4V6.9h6v13.5zM5.6 17.9h1.5M10.8 17.9h1.1M16 16h.9"/>
   <path d="M2.5 20.4h18.8M15.4 6.9V3.7h1.8v3.2"/>
  </>;
  case 'biodiversity': return <>
   <path d="M12 21v-9.5M12 11.5C5.7 12 5 7.7 5.3 4.5c4.5.5 6.6 2.5 6.7 7M12 13.5c.5-6 3.2-8.7 7-9-0 5.5-1.7 9.3-7 9"/>
   <path d="M5.7 18.1c3-.8 4.5-.1 6.3 2.9M18.1 18.1c-2.8-.8-4.5-.1-6.1 2.9"/>
  </>;
 }
}

export function AmbientaIcon({kind,size=20,strokeWidth=1.7,className='',...rest}:Props){
 const cls=['amb-icon','amb-icon--'+kind,className].filter(Boolean).join(' ');
 return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
   width={size} height={size} fill="none" stroke="currentColor"
   strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"
   className={cls} data-ambienta-icon={kind} aria-hidden="true" focusable="false" {...rest}>
   <Glyph kind={kind}/>
 </svg>;
}
