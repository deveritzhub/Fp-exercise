import { Activity, AlertTriangle, ClipboardList } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import type { Progress } from '@/lib/types';
import { clinicalTimeline } from '@shared/clinicalTimeline';

/**
 * Private, therapist-only view. Uses the existing tenant-filtered /patients/:id/progress
 * response, not the patient-facing hero API. Clinical outcomes not actually recorded
 * remain explicitly empty; there is no inferred "recovery %" or automated diagnosis.
 */
export function ClinicalTimeline({ sessions }: { sessions: Progress['sessions'] }) {
  const { t, locale } = useI18n();
  const data = clinicalTimeline(sessions);
  const labels = [
    [t('Pijn (NRS)', 'Pain (NRS)'), data.available.pain],
    [t('Ervaren trainingszwaarte', 'Perceived workout difficulty'), data.available.perceivedExertion],
    ['ROM', data.available.rom],
    [t('Krachtmeting', 'Strength test'), data.available.strength],
    [t('Functie', 'Function'), data.available.function],
    [t('Vertrouwen', 'Confidence'), data.available.confidence],
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
      <div className="grid gap-2 p-4 sm:grid-cols-3">
        {labels.map(([label, available])=>(
          <div key={label} className="rounded-xl border border-line bg-canvas p-3">
            <p className="text-[13px] font-semibold text-ink-900">{label}</p>
            <p className="mt-1 text-[12px] text-ink-600">{available ? t('Gegevens beschikbaar', 'Data available') : t('Niet geregistreerd', 'Not recorded')}</p>
          </div>
        ))}
      </div>
      {data.points.length===0 ? (
        <p className="border-t border-line p-5 text-[14px] text-ink-600">{t('Nog geen afgeronde sessies met een tijdstempel.', 'No completed, dated sessions yet.')}</p>
      ) : (
        <div className="border-t border-line px-4 py-4 sm:px-5">
          <p className="mb-3 flex items-center gap-2 text-[13px] font-medium text-ink-700"><ClipboardList className="h-4 w-4" aria-hidden="true"/>{t('Laatste sessies: pijn en ervaren zwaarte (0–10)', 'Recent sessions: pain and perceived difficulty (0–10)')}</p>
          <div className="max-h-[300px] space-y-2 overflow-y-auto">
            {data.points.map(p=>(
              <div key={p.id} className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2 rounded-xl border border-line px-3 py-2 text-[13px]">
                <span className="min-w-0 text-ink-700">{new Date(p.day+'T12:00:00').toLocaleDateString(locale==='nl'?'nl-NL':'en-GB',{day:'numeric',month:'short',year:'numeric'})}</span>
                <span className="whitespace-nowrap font-medium tabular-nums text-ink-900">{t('Pijn', 'Pain')}: {p.pain===null?'—':`${p.pain}/10`}</span>
                <span className="whitespace-nowrap font-medium tabular-nums text-ink-900">{t('Zwaarte', 'Effort')}: {p.exertion===null?'—':`${p.exertion}/10`}</span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[12px] leading-relaxed text-ink-600">{t('Dit zijn patiëntgerapporteerde sessiescores. Voor ROM, kracht, functie en vertrouwen zijn aparte gevalideerde meetmomenten nodig; deze waarden worden niet geschat.', 'These are self-reported session scores. ROM, strength, function and confidence require separately recorded assessments; none are inferred.')}</p>
        </div>
      )}
    </section>
  );
}
