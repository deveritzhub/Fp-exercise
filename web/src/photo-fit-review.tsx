import {createRoot} from 'react-dom/client';
import {HeroPhoto} from './components/hero/HeroPhoto';
import {I18nProvider} from './lib/i18n';
import './index.css';
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
const matrix=new URLSearchParams(location.search).has('matrix');
const examples=matrix?variants.map(v=>({...v,outfit:'forest',gear:['cap']})):[[],['cap','wristbands','gold_shoes'],['crown','medal','champion','gloves','gold_shoes']].map(gear=>({...variants[0],outfit:'forest',gear}));
createRoot(document.getElementById('root')!).render(<I18nProvider><div style={{display:'grid',gridTemplateColumns:`repeat(${matrix?4:3},1fr)`,gap:12,padding:20}}>{examples.map((look,i)=><div key={i}><h2 style={{color:'white',textAlign:'center'}}>{matrix?`${look.frame} · ${look.build} · ${look.hair}`:['Bestaande avatar','Accessoires','Kampioensoutfit'][i]}</h2><HeroPhoto fittedGear look={look} className={matrix?'h-[480px] w-[360px]':'h-[640px] w-[480px]'}/></div>)}</div></I18nProvider>);
