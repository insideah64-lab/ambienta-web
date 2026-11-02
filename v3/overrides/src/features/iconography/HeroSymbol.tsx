import {useId} from 'react';

/**
 * AMBIENTA's illustrated identity: deliberately pictorial rather than a
 * monochrome stroke-icon font. Shapes are local SVG (sharp at every density).
 * No fictional coordinates or geospatial boundary is drawn by these motifs.
 * Decorative: always pair with readable, meaningful text.
 */
export type HeroSymbolKind =
  'crest' | 'case' | 'document' | 'location' | 'phase'
  | 'verified' | 'mountain' | 'calendar' | 'industry';

type Props = {
  kind:HeroSymbolKind;
  size?:number;
  className?:string;
};

export function HeroSymbol({kind,size=24,className=''}:Props){
  const uid=useId().replaceAll(':','');
  const grad='amb-illust-'+uid;
  const paint='url(#'+grad+')';
  let drawing;
  switch(kind){
   case 'crest':
    drawing=<>
      <circle cx="45" cy="17" r="7" fill="#ffcb71"/>
      <path d="m5 42 16-22 10 12 10-19 18 29Z" fill="#1b8985" stroke="#a7f7e0" strokeWidth="1.6"/>
      <path d="m21 20 5.4 8.1 4.6 3.9 10-19 8 14-8-5.1-6 11-6-2-8-7-7 9Z" fill="#f6ba61"/>
      <path d="M5 43c15 6 31-2 54-4-11 13-27 14-43 9Z" fill={paint}/>
      <path d="M15 54c17-5 29-5 42-12" fill="none" stroke="#b6f6a5" strokeWidth="3" strokeLinecap="round"/>
      <path d="M23 50c6-7 9-8 16-10-3 7-7 11-16 10Z" fill="#70e2a5"/>
    </>;
    break;
   case 'case':
    drawing=<>
      <rect x="12" y="13" width="41" height="44" rx="7" fill="#d9be78" opacity=".28"/>
      <rect x="15" y="8" width="35" height="46" rx="5" fill={paint} stroke="#d6ffe2" strokeWidth="2"/>
      <path d="M26 7h13v6H26z" rx="2" fill="#ffcb75"/>
      <path d="M24 28h17M24 35h13M24 42h8" stroke="#0a4347" strokeWidth="3.4" strokeLinecap="round"/>
      <circle cx="45" cy="45" r="10" fill="#0b6657" stroke="#a6fac7" strokeWidth="2"/>
      <path d="m40.5 45 3 3.1 5-6.5" fill="none" stroke="#dfffc0" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"/>
    </>;
    break;
   case 'document':
    drawing=<>
      <path d="M14 6h26l11 12v37H14a4 4 0 0 1-4-4V10a4 4 0 0 1 4-4" fill={paint} stroke="#b9eeff" strokeWidth="1.6"/>
      <path d="M40 6v12h11" fill="#76bffa" stroke="#b9eeff" strokeWidth="1.5"/>
      <path d="M20 27h21M20 34h18M20 41h11" stroke="#113b63" strokeWidth="3" strokeLinecap="round"/>
      <circle cx="45" cy="46" r="10" fill="#0d766b" stroke="#a5ffe2" strokeWidth="1.7"/>
      <path d="m40 46 3 3 6-7" stroke="#e8ffe2" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
    </>;
    break;
   case 'location':
    drawing=<>
      <path d="M15 45 8 50l12 7 16-5 14 3 6-6-13-8-14 7Z" fill="#1c8386" opacity=".62"/>
      <path d="M20 50c7 2 13 1 19-3M14 54l8-4" stroke="#abf5df" strokeWidth="2" strokeLinecap="round" fill="none"/>
      <path d="M32 6c-12 0-21 9-21 21 0 15 21 30 21 30s21-15 21-30C53 15 44 6 32 6Z" fill={paint} stroke="#b9ffee" strokeWidth="1.6"/>
      <circle cx="32" cy="27" r="9" fill="#0d4855" stroke="#b5fcef" strokeWidth="2"/>
      <circle cx="32" cy="27" r="4.5" fill="#ffca69"/>
      <path d="M19 19c3-5 7-7 12-8" stroke="#d9fff3" strokeWidth="2" strokeLinecap="round" opacity=".75"/>
    </>;
    break;
   case 'phase':
    drawing=<>
      <path d="m7 23 25-13 25 13-25 14Z" fill="#7aa7ec" stroke="#d5e5ff" strokeWidth="1.6"/>
      <path d="m7 32 25 13 25-13-6-4-19 10-19-10Z" fill="#397dc2" stroke="#b5d9ff" strokeWidth="1.6"/>
      <path d="m7 40 25 13 25-13-6-4-19 10-19-10Z" fill={paint} stroke="#b5e6ff" strokeWidth="1.6"/>
      <path d="m20 23 10 6 13-7" stroke="#fff1c4" strokeWidth="2.7" strokeLinecap="round" fill="none"/>
      <circle cx="50" cy="15" r="7" fill="#ffcb73"/>
    </>;
    break;
   case 'verified':
    drawing=<>
      <path d="M32 5 53 12v20c0 13-10 21-21 27C21 53 11 45 11 32V12Z" fill={paint} stroke="#c6ffb5" strokeWidth="1.8"/>
      <path d="M17 17 32 12l15 5v15c0 9-7 15-15 19-8-4-15-10-15-19Z" fill="#064d50" opacity=".4"/>
      <path d="M22 33c3-9 10-11 20-10-2 13-11 17-18 14" fill="#9ef290"/>
      <path d="M22 43c7-8 12-10 20-17" stroke="#e3ffd4" strokeWidth="2.3" strokeLinecap="round" fill="none"/>
      <path d="m29 43 4 4 8-10" stroke="#fbd08b" strokeWidth="3.2" strokeLinecap="round" fill="none"/>
    </>;
    break;
   case 'mountain':
    drawing=<>
      <circle cx="48" cy="14" r="8" fill="#ffe3a0"/>
      <path d="M4 50 23 17l12 19 8-13 17 27Z" fill="#c98c5b" stroke="#ffdda6" strokeWidth="1.5"/>
      <path d="m23 17 6 10-7-3-4 9-3-2Z" fill="#fff1da"/>
      <path d="m43 23 6 10-7-4-4 11-3-4Z" fill="#ffd0a1"/>
      <path d="M4 50q20-9 34-4t22 4v7H4Z" fill={paint}/>
      <path d="M9 55q14-6 25-2t20-1" stroke="#fed67d" strokeWidth="2" fill="none" strokeLinecap="round"/>
    </>;
    break;
   case 'calendar':
    drawing=<>
      <rect x="8" y="13" width="48" height="43" rx="7" fill={paint} stroke="#aaf9fa" strokeWidth="1.8"/>
      <path d="M9 22h46" stroke="#b2ffff" strokeWidth="4"/>
      <path d="M20 8v11M44 8v11" stroke="#e3ffff" strokeWidth="5" strokeLinecap="round"/>
      <rect x="17" y="30" width="10" height="8" rx="2" fill="#bafbf0"/>
      <rect x="33" y="30" width="10" height="8" rx="2" fill="#70ccd0"/>
      <rect x="17" y="43" width="10" height="8" rx="2" fill="#70ccd0"/>
      <circle cx="42" cy="45" r="7.5" fill="#ffc979"/>
      <path d="m39 45 2 2.2 4-4" stroke="#17494b" strokeWidth="2" fill="none" strokeLinecap="round"/>
    </>;
    break;
   case 'industry':
    drawing=<>
      <path d="M7 52V31l14 8 11-9 7 7V20h13v32Z" fill={paint} stroke="#ead8ff" strokeWidth="1.5"/>
      <path d="M43 20V9h6v11" fill="#c5a4f5"/>
      <path d="M11 48h46" stroke="#ecdcff" strokeWidth="3" strokeLinecap="round"/>
      <path d="M15 43h5M27 43h5M40 43h5" stroke="#f2df98" strokeWidth="3" strokeLinecap="round"/>
      <path d="M43 13q-2-4 1-8M50 12q4-3 3-8" fill="none" stroke="#9acde7" strokeWidth="2" strokeLinecap="round"/>
      <path d="m7 53 7 5 41-1 5-5" fill="#a7a5f7" opacity=".65"/>
    </>;
    break;
  }
  return <svg data-ambienta-illustration={kind} viewBox="0 0 64 64"
    width={size} height={size} aria-hidden="true" focusable="false"
    className={'amb-illustration amb-illustration--'+kind+' '+className}>
    <defs>
      <linearGradient id={grad} x1="0" y1="0" x2="1" y2="1">
       <stop offset="0" stopColor={
         kind==='industry'?'#d6b6ff':kind==='mountain'?'#f4bd73':
         kind==='phase'||kind==='document'?'#8dceff':kind==='calendar'?'#75e0e3':'#95efb4'}/>
       <stop offset="1" stopColor={
         kind==='industry'?'#775fa8':kind==='mountain'?'#7a654a':
         kind==='phase'||kind==='document'?'#28658f':kind==='calendar'?'#198b9e':'#0b6d66'}/>
      </linearGradient>
    </defs>
    {drawing}
  </svg>;
}
