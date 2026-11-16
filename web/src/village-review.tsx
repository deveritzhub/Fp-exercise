/** Synthetic town: the production renderer and layout, with no patient API access. */
import { createRoot } from 'react-dom/client';
import { useRef, useState, type ComponentProps } from 'react';
import { DEFAULT_LOOK } from '@shared/hero';
import WalkVillage3D, { type WorldApi } from './components/patient/WalkVillage3D';
import { SITES, TOWN_HOUSES, placeAt } from './components/patient/townPlan';
import { I18nProvider } from './lib/i18n';
import './index.css';

if (!import.meta.env.DEV) throw new Error('Development scene only');
type Building = ComponentProps<typeof WalkVillage3D>['buildings'][number];
const labels:Record<string,string>={hall:'Gildehal',board:'Missiebord',dojo:'Dojo',kracht:'Krachthonk',smithy:'Smederij',library:'Bibliotheek',mobiliteit:'Mobiliteitsstudio',guild:'Gilde'};
const buildings:Building[]=[
  ...Object.entries(SITES).map(([key,site]):Building=>{
    const b:Building={key,site,label:labels[key]??key};
    if(key==='kracht'||key==='mobiliteit')b.kind=key;
    if(key==='dojo')b.model={url:'/village/buildings/dojo.glb?v=1',scale:.8};
    return b;
  }),
  ...TOWN_HOUSES.map((h):Building=>({key:h.key,label:h.nl,site:placeAt(h.at.x,h.at.z,2.1*(h.scale??1)),roof:h.roof,
    model:{url:'/village/buildings/huis_vakwerk_'+((h.scale??1)>=1.2?'groot':(h.scale??1)>=1.1?'middel':'klein')+'.glb?v=1',scale:(h.scale??1)>=1.2?.72:(h.scale??1)>=1.1?.8:.85}})),
];
function Review(){
  const api=useRef<WorldApi|null>(null);
  const [arrival,setArrival]=useState(''),[zone,setZone]=useState('village');
  // An open stretch by the stables keeps the street furniture in view, clear of the houses.
  const startAt=new URLSearchParams(window.location.search).get('view')==='stables'
    ? {x:8.2,z:12.8} : {x:0,z:4.5};
  return <main className="h-dvh w-full bg-[#e9e2d2]"><h1 className="sr-only">Dorpscontrole met synthetische avatar</h1>
    <WalkVillage3D buildings={buildings} plan startAt={startAt} home={{stage:3,label:'Testhuis'}} well people={false}
      look={{...DEFAULT_LOOK,frame:'f',build:'average',hair:'bun',gear:['tracksuit','balance_shoes']}}
      tvLabel="Oefenzaal" tvTitle="Synthetische controle" tvLines={[]} onNear={()=>{}} onArrive={setArrival} onZone={setZone}
      api={api} className="h-full w-full !rounded-none !border-0"/>
    <output className="sr-only" data-testid="review-zone">{zone}</output>
    <output className="sr-only" data-testid="review-arrival">{arrival}</output>
    <div className="absolute bottom-3 left-3 flex gap-2">
      <button className="min-h-[44px] rounded bg-white px-3 py-2 text-[#203e32]" onClick={()=>api.current?.goTo('well')}>Naar de put</button>
      <button className="min-h-[44px] rounded bg-white px-3 py-2 text-[#203e32]" onClick={()=>api.current?.goTo('practice')}>Naar de praktijk</button>
    </div>
  </main>;
}
createRoot(document.getElementById('root')!).render(<I18nProvider><Review/></I18nProvider>);
