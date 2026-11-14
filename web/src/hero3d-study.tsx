import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { DEFAULT_LOOK } from '@shared/hero';
import Hero3D from './components/hero/Hero3D';
import { I18nProvider } from './lib/i18n';
import './index.css';
import './components/hero/rpg.css';

const look = { ...DEFAULT_LOOK, frame: 'f', build: 'average', hair: 'bun', skin: 's5', hairColor: 'darkbrown', beard: 'none', glasses: 'none', gear: [] };
const palette = { main: '#606852', dark: '#343b35', soft: '#eee5d2' };
function Study() {
  const [before, setBefore] = useState(false);
  const [portrait, setPortrait] = useState(false);
  return <main className="mx-auto max-w-5xl px-5 py-8 text-[#353d32] sm:py-12">
    <a href="/" className="text-sm font-semibold underline underline-offset-4">FP Flow</a>
    <p className="mt-8 text-xs font-bold uppercase tracking-[.2em] text-[#62684f]">Karakterstudie · 01</p>
    <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Een natuurlijkere sportheld</h1>
    <p className="mt-4 max-w-xl leading-relaxed text-[#5c6257]">Eén proefpersonage met zachtere gezichtsdetails, ontspannen handen en afgewerkte sportkleding. Sleep om het van alle kanten te bekijken.</p>
    <div className="mt-7 flex flex-wrap gap-2" role="group" aria-label="Vergelijk de modellen">
      {([[false, 'Nieuw personage'], [true, 'Vorige versie']] as const).map(([value, label]) => <button key={String(value)} type="button" aria-pressed={before === value} onClick={() => setBefore(value)} className={`min-h-11 rounded-full border px-5 text-sm font-semibold ${before === value ? 'border-[#45523c] bg-[#45523c] text-white' : 'border-[#b7b4a4] bg-[#fffdf8] text-[#353d32]'}`}>{label}</button>)}
      <button type="button" aria-pressed={portrait} onClick={() => setPortrait(!portrait)} className="min-h-11 rounded-full border border-[#b7b4a4] bg-[#fffdf8] px-5 text-sm font-semibold">{portrait ? 'Hele personage' : 'Gezicht van dichtbij'}</button>
    </div>
    <div className="mt-5 rounded-[2rem] border border-[#d8d1bf] bg-[radial-gradient(ellipse_at_50%_35%,#fffdf6_0%,#eee7d8_75%)] p-2 sm:p-5">
      <Hero3D key={`${before}-${portrait}`} look={look} studio portrait={portrait} palette={palette} modelUrl={before ? undefined : '/hero3d/study/hero_f_average.glb?v=1'} className="h-[600px] w-full sm:h-[720px]"/>
    </div>
    <p className="mt-4 text-sm leading-relaxed text-[#5c6257]">Dit is een stijlproef. De andere lichaamsbouwen en kapsels worden pas na de beoordeling in deze stijl uitgewerkt. Beide versies gebruiken hier hetzelfde licht en dezelfde kleuren.</p>
  </main>;
}
document.body.style.background = '#f5f1e7';
createRoot(document.getElementById('root')!).render(<I18nProvider><Study/></I18nProvider>);
