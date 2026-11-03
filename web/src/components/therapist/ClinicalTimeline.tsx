import { Activity, AlertTriangle, ClipboardList, Plus } from 'lucide-react';
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { PatientOutcome } from '@/lib/types';
import { useI18n } from '@/lib/i18n';
import type { Progress } from '@/lib/types';
import { clinicalTimeline } from '@shared/clinicalTimeline';
const DOMAINS=['rom','strength','function','confidence'] as const;
type Domain = (typeof DOMAINS)[number];
const unitFor=(d:Domain)=>d==='rom'?'degrees':d==='strength'?'kg':'score_0_10';
const displayUnit=(u:PatientOutcome['unit'])=>({degrees:'°',kg:'kg',N:'N',score_0_10:'/10',percent:'%'})[u];

/**
 * Private, therapist-only view. Uses the existing tenant-filtered /patients/:id/progress
 * response, not the patient-facing hero API. Clinical outcomes not actually recorded
 * remain explicitly empty; there is no inferred "recovery %" or automated diagnosis.
 */
export function ClinicalTimeline({ patientId, sessions, outcomes }: { patientId:string; sessions:Progress['sessions']; outcomes: PatientOutcome[] }) {
  const { t, locale } = useI18n();
  const qc=useQueryClient();
  const [open,setOpen]=useState(false);
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState('');
  const [domain,setDomain]=useState<Domain>('rom');
  const [metric,setMetric]=useState('');
  const [value,setValue]=useState('');
  const [unit,setUnit]=useState<PatientOutcome['unit']>('degrees');
  const [side,setSide]=useState<PatientOutcome['side']>('not_applicable');
  const [measuredOn,setMeasuredOn]=useState(()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Amsterdam',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()));
  const [note,setNote]=useState('');
  const record=async()=>{
    const n=Number(value);
    if(!metric.trim()||!value.trim()||!Number.isFinite(n)||n<0){setError(t('Vul een geldige meetwaarde en meetnaam in.','Enter a valid measurement and name.'));return;}
    setSaving(true);setError('');
    try{
      await api.post(`/patients/${patientId}/outcomes`,{domain,metric:metric.trim(),value:n,unit,side,measuredOn,note});
      await qc.invalidateQueries({queryKey:['patient',patientId,'progress']});
      setOpen(false);setMetric('');setValue('');setNote('');
    }catch(e){setError(t('Opslaan mislukt. Controleer waarde en bevoegdheid.','Could not save. Check the value and access rights.'));}
    finally{setSaving(false);}
  };
  const domainOutcomes=(key:Domain)=>outcomes.some(o=>o.domain===key);
  const data = clinicalTimeline(sessions);
  const labels = [
    [t('Pijn (NRS)', 'Pain (NRS)'), data.available.pain],
    [t('Ervaren trainingszwaarte', 'Perceived workout difficulty'), data.available.perceivedExertion],
    ['ROM', domainOutcomes('rom')],
    [t('Krachtmeting', 'Strength test'), domainOutcomes('strength')],
    [t('Functie', 'Function'), domainOutcomes('function')],
    [t('Vertrouwen', 'Confidence'), domainOutcomes('confidence')],
  ] as const;
  return (
    <section aria-labelledby="clinical-timeline-title" className="overflow-hidden rounded-2xl border border-line bg-white shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line p-5">
        <div>
          <h2 id="clinical-timeline-title" className="flex items-center gap-2 font-display text-[17px] font-bold text-ink-950">
            <Activity className="h-5 w-5 text-accent" aria-hidden="true" />
            {t('Klinische voortgangstijdlijn', 'Clinical progress timeline')}
          </h2>
          <p className="mt-1 text-[13px] text-ink-600">{t('Werkelijke sessieregistraties, geen automatisch herstelpercentage.', 'Actual session reports; no calculated recovery percentage.')}</p>
        </div>
        {data.reviewCount>0 && <span className="inline-flex items-center gap-1.5 rounded-full bg-sand-soft px-3 py-1.5 text-[12px] font-semibold text-sand-ink"><AlertTriangle className="h-4 w-4" aria-hidden="true" />{t(`${data.reviewCount} meldingen te bekijken`, `${data.reviewCount} entries to review`)}</span>}
      </div>
      <div className="border-b border-line px-4 py-3 sm:px-5">
        <button type="button" aria-expanded={open} onClick={()=>setOpen(v=>!v)} className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-accent px-4 text-[13px] font-semibold text-accent-ink">
          <Plus className="h-4 w-4" aria-hidden="true" />{t('Meetmoment vastleggen','Record assessment')}
        </button>
        {open&&<form className="mt-4 grid gap-3 rounded-xl bg-canvas p-3 sm:grid-cols-2" onSubmit={(e)=>{e.preventDefault();void record();}}>
          <label className="grid gap-1 text-[13px] font-medium">{t('Meetdomein','Domain')}
            <select className="min-h-[44px] rounded-lg border border-line bg-white p-2" value={domain} onChange={e=>{const v=e.target.value as Domain;setDomain(v);setUnit(unitFor(v));}}>
              <option value="rom">ROM</option><option value="strength">{t('Kracht','Strength')}</option><option value="function">{t('Functie','Function')}</option><option value="confidence">{t('Vertrouwen','Confidence')}</option>
            </select>
          </label>
          <label className="grid gap-1 text-[13px] font-medium">{t('Testnaam / schaal','Test name / scale')}
            <input required maxLength={80} className="min-h-[44px] rounded-lg border border-line p-2" value={metric} onChange={e=>setMetric(e.target.value)} placeholder={t('Bijv. knie flexie, PSFS','E.g. knee flexion, PSFS')}/>
          </label>
          <label className="grid gap-1 text-[13px] font-medium">{t('Gemeten waarde','Measured value')}
            <input type="number" required min={0} max={unit==='degrees'?360:unit==='score_0_10'?10:unit==='percent'?100:100000} step="any" className="min-h-[44px] rounded-lg border border-line p-2" value={value} onChange={e=>setValue(e.target.value)} />
          </label>
          <label className="grid gap-1 text-[13px] font-medium">{t('Eenheid','Unit')}
            <select className="min-h-[44px] rounded-lg border border-line bg-white p-2" value={unit} onChange={e=>setUnit(e.target.value as PatientOutcome['unit'])}>
              {domain==='rom'?<option value="degrees">°</option>:domain==='strength'?<><option value="kg">kg</option><option value="N">N</option></>:<><option value="score_0_10">0–10</option><option value="percent">%</option></>}
            </select>
          </label>
          <label className="grid gap-1 text-[13px] font-medium">{t('Meetdatum','Measurement date')}
            <input required type="date" className="min-h-[44px] rounded-lg border border-line p-2" value={measuredOn} onChange={e=>setMeasuredOn(e.target.value)}/>
          </label>
          <label className="grid gap-1 text-[13px] font-medium">{t('Zijde','Side')}
            <select className="min-h-[44px] rounded-lg border border-line bg-white p-2" value={side} onChange={e=>setSide(e.target.value as PatientOutcome['side'])}>
              <option value="not_applicable">{t('Niet van toepassing','Not applicable')}</option><option value="left">{t('Links','Left')}</option><option value="right">{t('Rechts','Right')}</option><option value="bilateral">{t('Bilateraal','Bilateral')}</option>
            </select>
          </label>
          <label className="grid gap-1 text-[13px] font-medium sm:col-span-2">{t('Korte context (optioneel)','Short note (optional)')}
            <input maxLength={300} className="min-h-[44px] rounded-lg border border-line p-2" value={note} onChange={e=>setNote(e.target.value)}/>
          </label>
          {error&&<p role="alert" className="text-[13px] text-bad sm:col-span-2">{error}</p>}
          <button type="submit" disabled={saving} className="min-h-[44px] rounded-xl bg-accent px-4 font-semibold text-accent-ink disabled:opacity-50">{saving?t('Opslaan…','Saving…'):t('Meetmoment opslaan','Save assessment')}</button>
          <p className="self-center text-[12px] text-ink-600">{t('Controleer de meting: na opslaan kan dit record niet worden gewijzigd.','Verify the measurement: this record cannot yet be edited after saving.')}</p>
        </form>}
      </div>
      <div className="grid gap-2 p-4 sm:grid-cols-3">
        {labels.map(([label, available])=>(
          <div key={label} className="rounded-xl border border-line bg-canvas p-3">
            <p className="text-[13px] font-semibold text-ink-900">{label}</p>
            <p className="mt-1 text-[12px] text-ink-600">{available ? t('Gegevens beschikbaar', 'Data available') : t('Niet geregistreerd', 'Not recorded')}</p>
          </div>
        ))}
      </div>
      {outcomes.length>0&&<div className="border-t border-line p-4 sm:p-5">
        <h3 className="mb-3 text-[14px] font-semibold text-ink-900">{t('Objectieve en patiëntgerapporteerde meetmomenten','Recorded clinical assessments')}</h3>
        <ul className="space-y-2">{outcomes.slice(0,30).map(o=>(
          <li key={o.id} className="flex flex-wrap justify-between gap-2 rounded-xl border border-line px-3 py-2 text-[13px]">
            <span><strong>{o.metric}</strong> · {o.domain.toUpperCase()}{o.side!=='not_applicable'?` · ${o.side}`:''}<span className="block text-[12px] text-ink-600">{o.measuredOn}</span></span>
            <span className="font-semibold tabular-nums">{o.value} {displayUnit(o.unit)}</span>
          </li>
        ))}</ul>
      </div>}
      {data.points.length===0 ? (
        <p className="border-t border-line p-5 text-[14px] text-ink-600">{t('Nog geen afgeronde sessies met een tijdstempel.', 'No completed, dated sessions yet.')}</p>
      ) : (
        <div className="border-t border-line px-4 py-4 sm:px-5">
          <p className="mb-3 flex items-center gap-2 text-[13px] font-medium text-ink-700"><ClipboardList className="h-4 w-4" aria-hidden="true"/>{t('Laatste sessies: pijn en ervaren zwaarte (0–10)', 'Recent sessions: pain and perceived difficulty (0–10)')}</p>
          <div className="max-h-[300px] space-y-2 overflow-y-auto" tabIndex={0} role="region" aria-label={t('Sessietijdlijn, scrollbaar met toetsenbord', 'Session timeline, keyboard scrollable')}>
            {data.points.map(p=>(
              <div key={p.id} className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2 rounded-xl border border-line px-3 py-2 text-[13px]">
                <span className="min-w-0 text-ink-700">{new Date(p.day+'T12:00:00').toLocaleDateString(locale==='nl'?'nl-NL':'en-GB',{day:'numeric',month:'short',year:'numeric'})}</span>
                <span className="whitespace-nowrap font-medium tabular-nums text-ink-900">{t('Pijn', 'Pain')}: {p.pain===null?'—':`${p.pain}/10`}</span>
                <span className="whitespace-nowrap font-medium tabular-nums text-ink-900">{t('Zwaarte', 'Effort')}: {p.exertion===null?'—':`${p.exertion}/10`}</span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[12px] leading-relaxed text-ink-600">{t('Sessiescores zijn zelfgerapporteerd. ROM, kracht, functie en vertrouwen worden alleen uit expliciet geregistreerde meetmomenten getoond.', 'Session scores are self-reported. ROM, strength, function and confidence are shown only from recorded assessments.')}</p>
        </div>
      )}
    </section>
  );
}
