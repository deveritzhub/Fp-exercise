import { useMemo } from 'react';
import { AlertCircle, Activity, ClipboardList } from 'lucide-react';
import { clinicalTimeline, reviewSignals } from '@shared/clinicalTimeline';
import type { Progress } from '@/lib/types';
import { useI18n } from '@/lib/i18n';
import { fmtDateTime } from '@/lib/format';
import { Card, CardHeader } from '@/components/ui';

/** Therapist-only view; no writes, phase approvals or new patient-visible fields. */
export function ClinicalTimeline({ sessions }: { sessions: Progress['sessions'] }) {
  const { t, locale } = useI18n();
  const points = useMemo(() => clinicalTimeline(sessions), [sessions]);
  const signals = useMemo(() => reviewSignals(points), [points]);
  const domains = [
    { nl: 'Pijn', en: 'Pain', value: signals.latestPain === null ? '—' : `${signals.latestPain}/10`, available: signals.latestPain !== null },
    { nl: 'ROM', en: 'ROM', value: '—', available: false },
    { nl: 'Kracht', en: 'Strength', value: '—', available: false },
    { nl: 'Functie', en: 'Function', value: '—', available: false },
    { nl: 'Vertrouwen', en: 'Confidence', value: '—', available: false },
  ];
  return (
    <Card>
      <CardHeader
        title={t('Klinische voortgangstijdlijn', 'Clinical progress timeline')}
        description={t('Bestaande sessiemetingen. ROM, kracht, functie en vertrouwen verschijnen pas zodra daarvoor gevalideerde meetgegevens beschikbaar zijn.', 'Existing session measurements. ROM, strength, function and confidence remain unavailable until validated measurements are connected.')}
      />
      <div className="space-y-4 p-5">
        <dl className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {domains.map(d => (
            <div key={d.en} className="rounded-xl border border-line bg-canvas p-3">
              <dt className="text-[12px] text-ink-600">{t(d.nl,d.en)}</dt>
              <dd className="mt-1 text-[18px] font-bold tabular-nums text-ink-900">
                {d.value}
                {!d.available && <span className="block text-[11px] font-normal text-ink-500">{t('Geen meting', 'No measurement')}</span>}
              </dd>
            </div>
          ))}
        </dl>
        {signals.unreviewedCount > 0 && (
          <div role="status" className="flex items-start gap-2 rounded-xl border border-warn/30 bg-warn-soft p-3 text-[13px] text-ink-900">
            <AlertCircle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{t(`${signals.unreviewedCount} sessie(s) met pijn ≥6 of feedback nog niet beoordeeld. Controleer de sessies; dit is geen automatische medische diagnose.`, `${signals.unreviewedCount} session(s) with pain ≥6 or feedback awaiting review. Check sessions; this is not an automated diagnosis.`)}</span>
          </div>
        )}
        {signals.painChange !== null && (
          <p className="flex items-center gap-2 text-[13px] text-ink-700">
            <Activity aria-hidden="true" className="h-4 w-4 shrink-0" />
            {t('Verschil laatste twee pijnscores:', 'Difference between the last two pain scores:')}
            <strong className="tabular-nums">{signals.painChange > 0 ? '+' : ''}{signals.painChange}</strong>
            <span>{t('(beschrijvend, geen herstelconclusie)', '(descriptive, not a recovery conclusion)')}</span>
          </p>
        )}
        {!points.length ? (
          <p className="flex items-center gap-2 text-[13px] text-ink-600"><ClipboardList className="h-4 w-4" />{t('Nog geen afgeronde sessies met meetgegevens.', 'No completed sessions with measurements yet.')}</p>
        ) : (
          <ol tabIndex={0} className="max-h-80 space-y-2 overflow-y-auto focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2" aria-label={t('Sessiemetingen op datum', 'Session observations by date')}>
            {[...points].reverse().slice(0, 30).map(p => (
              <li key={p.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl border border-line px-3 py-2 text-[13px]">
                <time className="min-w-32 font-semibold text-ink-900" dateTime={p.at}>{fmtDateTime(p.at, locale)}</time>
                <span>{t('Pijn', 'Pain')}: <strong className="tabular-nums">{p.pain === null ? '—' : `${p.pain}/10`}</strong></span>
                <span>{t('Ervaren zwaarte', 'Perceived difficulty')}: <strong className="tabular-nums">{p.difficulty === null ? '—' : `${p.difficulty}/10`}</strong></span>
                {p.reviewed ? <span className="text-ink-600">{t('Beoordeeld', 'Reviewed')}</span> : p.feedback || (p.pain !== null && p.pain >= 6) ? <span className="font-semibold text-warn">{t('Te beoordelen', 'Review needed')}</span> : null}
              </li>
            ))}
          </ol>
        )}
        <p className="text-[12px] text-ink-600">{t('Geen automatische fasevrijgave. Beoordeel signalen altijd in klinische context.', 'No automatic phase clearance. Always assess signals in clinical context.')}</p>
      </div>
    </Card>
  );
}
