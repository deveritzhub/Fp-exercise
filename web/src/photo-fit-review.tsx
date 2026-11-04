import {GEAR,HAIR_PRESETS} from '@shared/hero';
import {createRoot} from 'react-dom/client';
import {HeroPhoto} from './components/hero/HeroPhoto';
import {I18nProvider} from './lib/i18n';
import './index.css';
import './components/hero/rpg.css';
import {photoFitProfiles} from './components/hero/photoFit';
import type {FigureLook} from './components/hero/HumanFigure';
if (!import.meta.env.DEV) throw new Error('Development visual review only');
const variants=[
 {skin:'s5',hair:'ponytail',frame:'f',build:'average'},
 {skin:'s5',hair:'long',frame:'f',build:'average'},
 {skin:'s1',hair:'ponytail',frame:'f',build:'slim'},
 {skin:'s7',hair:'curly',frame:'f',build:'full'},
 {skin:'s3',hair:'short',frame:'m',build:'athletic'},
 {skin:'s9',hair:'short',beard:'beard',frame:'m',build:'full'},
 {skin:'s1',hair:'buzz',frame:'m',build:'slim'},
];
const params=new URLSearchParams(location.search);
const allKeys=Object.keys(photoFitProfiles).filter(k=>!k.includes('__')).sort();
const fromKey=(key:string):FigureLook=>{
 const [frame,skin,kind,h='h1']=key.split('_');
 const preset=HAIR_PRESETS[frame as 'f'|'m'][h as 'h1'|'h2'|'h3'|'h4'];
 return {frame,skin,build:kind==='lean'?'slim':kind,...preset,outfit:'forest',body:{kind} as FigureLook['body']};
};
const full=['crown','medal','pin','yoga_mat','captain','watch','gloves','belt','shin_guards','gold_shoes','sport_item'];
if(params.has('fitcase')){
 const key=params.get('fitcase') || 'f_s5_full_h2';
 const gear=['cap','headphones','pin','wristbands','belt','sleeve','crew_socks'];
 createRoot(document.getElementById('root')!).render(<I18nProvider><div style={{padding:12}}><HeroPhoto fittedGear look={{...fromKey(key),gear}} className="h-[640px] w-[360px]"/></div></I18nProvider>);
}else if(params.has('headwear')){
 const base=['f_s1_lean','f_s9_full','m_s1_lean','m_s9_full'][Number(params.get('headwear'))];
 const examples=['','_h2','_h3','_h4'].flatMap(h=>['cap','visor','headband','crown','headphones'].map(item=>({key:base+h,item,look:{...fromKey(base+h),gear:[item]}})));
 createRoot(document.getElementById('root')!).render(<I18nProvider><div style={{display:'grid',gridTemplateColumns:'repeat(5,190px)',gap:12,padding:12}}>{examples.map(({key,item,look})=><div key={key+item}><h2 style={{color:'#29483c',fontSize:11,textAlign:'center'}}>{key} · {item}</h2><HeroPhoto fittedGear look={look} className="h-[254px] w-[190px]"/></div>)}</div></I18nProvider>);
}else if(params.has('all') || params.has('identity')){
 const identity=params.has('identity');
 const page=Number(params.get(identity?'identity':'all'));
 const keys=identity ? allKeys.filter(k=>k.includes('s5_average')).slice(page*2,page*2+2) : allKeys.slice(page*12,page*12+12);
 const examples=keys.flatMap(key=>identity ? ['', 'tracksuit','team_kit','champion'].map(outfit=>({key,look:{...fromKey(key),gear:outfit?[outfit]:[]},label:key+' '+(outfit||'origineel')})) : [{key,look:{...fromKey(key),gear:[...full,...(params.get('outfit')?[params.get('outfit')!]:[])]},label:key}]);
 createRoot(document.getElementById('root')!).render(<I18nProvider><div style={{display:'grid',gridTemplateColumns:'repeat(4,240px)',gap:12,padding:12}}>{examples.map(({key,look,label},i)=><div key={i} data-review-key={key}><h2 style={{color:'#29483c',textAlign:'center',fontSize:12}}>{label}</h2><HeroPhoto fittedGear look={look} className="h-[320px] w-[240px]"/></div>)}</div></I18nProvider>);
}else{
const catalog=params.has('catalog') ? GEAR.slice(Number(params.get('catalog'))*8,Number(params.get('catalog'))*8+8) : null;
const matrix=params.has('matrix') || !!catalog;
const examples=catalog ? catalog.map(g=>({...variants[0],outfit:'forest',gear:[g.key]})) : matrix?variants.map(v=>({...v,outfit:'forest',gear:['cap']})):[[],['cap','wristbands','gold_shoes'],['crown','medal','champion','gloves','gold_shoes']].map(gear=>({...variants[0],outfit:'forest',gear}));
createRoot(document.getElementById('root')!).render(<I18nProvider><div style={{display:'grid',gridTemplateColumns:`repeat(${matrix?4:3},1fr)`,gap:12,padding:20}}>{examples.map((look,i)=><div key={i}><h2 style={{color:'#294b40',textAlign:'center'}}>{catalog?catalog[i].nl:matrix?`${look.frame} · ${look.build} · ${look.hair}`:['Bestaande avatar','Accessoires','Kampioensoutfit'][i]}</h2><HeroPhoto fittedGear look={look} className={matrix?'h-[480px] w-[360px]':'h-[640px] w-[480px]'}/></div>)}</div></I18nProvider>);

}
