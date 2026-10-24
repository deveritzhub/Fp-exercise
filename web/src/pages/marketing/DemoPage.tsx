import { useState } from 'react';
import { Check, Minus, Plus, Smartphone, Stethoscope, Trash2 } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { useDocumentMeta } from '@/lib/meta';
import { cn } from '@/lib/cn';
import { Badge, Button, ButtonLink, Notice, ProgressRing } from '@/components/ui';
import { DEMO_ACCOUNTS, DEMO_PASSWORD, showDemoAccounts } from '../auth/AuthPages';

/** Fully client-side interactive demo with synthetic data (no backend, no personal data). */
const LIB = [
  { id: 'a', nl: 'Bekkenbrug', en: 'Glute bridge', region: { nl: 'Heup', en: 'Hip' }, sets: 3, reps: 12 },
  { id: 'b', nl: 'Spaanse squat', en: 'Spanish squat', region: { nl: 'Knie', en: 'Knee' }, sets: 5, reps: 1, hold: 45 },
  { id: 'c', nl: 'Exorotatie met band', en: 'Band external rotation', region: { nl: 'Schouder', en: 'Shoulder' }, sets: 3, reps: 12 },
  { id: 'd', nl: 'Eenbeensstand', en: 'Single-leg stance', region: { nl: 'Enkel', en: 'Ankle' }, sets: 3, reps: 1, hold: 30 },
  { id: 'e', nl: 'Kinintrekking', en: 'Chin tuck', region: { nl: 'Nek', en: 'Neck' }, sets: 2, reps: 10 },
  { id: 'f', nl: 'Hielheffen staand', en: 'Standing calf raise', region: { nl: 'Enkel', en: 'Ankle' }, sets: 3, reps: 15 },
];
type Item = (typeof LIB)[number] & { key: number };

export function DemoPage() {
  const { t, locale } = useI18n();
  useDocumentMeta(t('Interactieve demo', 'Interactive demo'), t('Probeer zelf hoe je een programma bouwt en hoe de patiënt het ziet — met fictieve gegevens.', 'Try building a programme and see how the patient sees it — with fictional data.'));
  const [items, setItems] = useState<Item[]>([{ ...LIB[1], key: 1 }, { ...LIB[0], key: 2 }]);
  const [done, setDone] = useState<Set<number>>(new Set());
  const [seq, setSeq] = useState(3);
  const name = (x: { nl: string; en: string }) => (locale === 'nl' ? x.nl : x.en);
  const rate = items.length ? done.size / items.length : 0;
  return (
    <>
      <section className="border-b border-line bg-canvas">
        <div className="mx-auto max-w-6xl px-5 py-14">
          <div className="text-[13px] font-semibold uppercase tracking-wider text-accent">Demo</div>
          <h1 className="mt-3 text-[36px] font-bold tracking-tight">{t('Probeer het zelf', 'Try it yourself')}</h1>
          <p className="mt-3 max-w-2xl text-[17px] text-ink-600">{t('Links bouw je als fysiotherapeut een programma; rechts zie je direct wat de patiënt ziet. Alle gegevens zijn fictief.', 'On the left you build a programme as a physiotherapist; on the right you instantly see what the patient sees. All data is fictional.')}</p>
        </div>
      </section>
      <section className="mx-auto grid max-w-6xl gap-10 px-5 py-14 lg:grid-cols-[1.2fr_1fr]">
        <div>
          <h2 className="mb-4 flex items-center gap-2 text-lg font-bold"><Stethoscope className="h-5 w-5 text-accent" />{t('Fysiotherapeut', 'Physiotherapist')}</h2>
          <div className="rounded-2xl border border-line bg-white p-4 shadow-card">
            <div className="mb-2 text-[13px] font-medium text-ink-500">{t('Bibliotheek — klik om toe te voegen', 'Library — click to add')}</div>
            <div className="grid gap-2 sm:grid-cols-2">
              {LIB.map((e) => (
                <button key={e.id} type="button" onClick={() => { setItems([...items, { ...e, key: seq }]); setSeq(seq + 1); }} className="flex items-center justify-between rounded-xl border border-line px-3 py-2.5 text-left hover:border-accent hover:bg-accent-soft/40">
                  <span><span className="block text-[14px] font-medium">{name(e)}</span><span className="text-[12.5px] text-ink-500">{name(e.region)}</span></span>
                  <Plus className="h-4 w-4 text-ink-400" />
                </button>
              ))}
            </div>
          </div>
          <div className="mt-4 space-y-2">
            {items.map((i, idx) => (
              <div key={i.key} className="flex items-center gap-3 rounded-xl border border-line bg-white p-3 shadow-xs">
                <span className="w-5 text-center text-[13px] font-semibold text-ink-400">{idx + 1}</span>
                <span className="min-w-0 flex-1 text-[14px] font-medium">{name(i)}</span>
                <div className="flex items-center rounded-lg border border-line">
                  <button type="button" aria-label={t('Minder sets', 'Fewer sets')} className="p-1.5 text-ink-500" onClick={() => setItems(items.map((x) => (x.key === i.key ? { ...x, sets: Math.max(1, x.sets - 1) } : x)))}><Minus className="h-3 w-3" /></button>
                  <span className="w-14 text-center text-[13px] tabular-nums">{i.sets} {t('sets', 'sets')}</span>
                  <button type="button" aria-label={t('Meer sets', 'More sets')} className="p-1.5 text-ink-500" onClick={() => setItems(items.map((x) => (x.key === i.key ? { ...x, sets: Math.min(10, x.sets + 1) } : x)))}><Plus className="h-3 w-3" /></button>
                </div>
                <button type="button" aria-label={t('Verwijderen', 'Remove')} className="rounded p-1.5 text-ink-400 hover:text-bad" onClick={() => setItems(items.filter((x) => x.key !== i.key))}><Trash2 className="h-4 w-4" /></button>
              </div>
            ))}
          </div>
        </div>
        <div>
          <h2 className="mb-4 flex items-center gap-2 text-lg font-bold"><Smartphone className="h-5 w-5 text-accent" />{t('Patiënt', 'Patient')}</h2>
          <div className="mx-auto max-w-[340px] rounded-[34px] border-[7px] border-ink-900 bg-canvas p-5 shadow-pop">
            <div className="text-[13px] text-ink-500">{t('Goedemorgen, Sam', 'Good morning, Sam')}</div>
            <div className="mt-3 flex items-center gap-4 rounded-2xl bg-white p-4 shadow-xs">
              <ProgressRing value={rate} size={64} stroke={7} label={t('Voortgang', 'Progress')}><span className="text-[13px] font-semibold">{Math.round(rate * 100)}%</span></ProgressRing>
              <div><div className="font-semibold">{t('Vandaag', 'Today')}</div><div className="text-[13px] text-ink-500">{done.size}/{items.length} {t('oefeningen', 'exercises')}</div></div>
            </div>
            <ul className="mt-3 space-y-2">
              {items.map((i) => {
                const on = done.has(i.key);
                return (
                  <li key={i.key}>
                    <button type="button" aria-pressed={on} onClick={() => { const n = new Set(done); if (on) n.delete(i.key); else n.add(i.key); setDone(n); }} className="flex w-full items-center gap-3 rounded-2xl bg-white p-3 text-left shadow-xs">
                      <span className={cn('flex h-8 w-8 items-center justify-center rounded-full border-2', on ? 'border-ok bg-ok text-white' : 'border-line')}>{on && <Check className="h-4 w-4" />}</span>
                      <span><span className={cn('block text-[15px] font-semibold', on && 'text-ink-400 line-through')}>{name(i)}</span><span className="text-[13px] text-ink-500">{i.sets} × {i.hold ? `${i.hold} s` : i.reps}</span></span>
                    </button>
                  </li>
                );
              })}
            </ul>
            {items.length > 0 && done.size === items.length && <div className="mt-3 rounded-xl bg-ok-soft p-3 text-center text-[14px] font-semibold text-ok">{t('Klaar voor vandaag!', 'Done for today!')}</div>}
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-6xl px-5 pb-20">
        {showDemoAccounts ? (
          <div className="rounded-2xl border border-line bg-canvas p-6">
            <h2 className="text-lg font-bold">{t('Volledige demo-omgeving', 'Full demo environment')}</h2>
            <p className="mt-1 text-[14.5px] text-ink-600">{t('Log in met een van deze fictieve accounts (wachtwoord:', 'Log in with one of these fictional accounts (password:')} <code className="rounded bg-white px-1.5 py-0.5 text-[13px]">{DEMO_PASSWORD}</code>).</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {DEMO_ACCOUNTS.map((a) => <Badge key={a.email} tone="outline" className="py-1 text-[13px]">{locale === 'nl' ? a.nl : a.en}: {a.email}</Badge>)}
            </div>
            <ButtonLink to="/login" className="mt-5">{t('Naar inloggen', 'Go to login')}</ButtonLink>
          </div>
        ) : (
          <Notice tone="info">{t('Wil je de volledige omgeving zien? Plan een persoonlijke demo.', 'Want to see the full environment? Book a personal demo.')} <Button size="sm" className="ml-2" onClick={() => (window.location.href = '/contact?onderwerp=demo')}>{t('Plan een demo', 'Book a demo')}</Button></Notice>
        )}
      </section>
    </>
  );
}
