import { useClinicalPractice } from '@/lib/session';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { regionForArea, regionOf } from '@shared/complaints';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { describeError, useI18n } from '@/lib/i18n';
import { fmtDate } from '@/lib/format';
import { BODY_AREAS, SKILLS, averagePain, type SkillKey } from '@shared/hero';
import { Card, CardHeader, Notice, Select, useToast } from '@/components/ui';
import { BodyMap, painWord } from './BodyMap';
import { HeroAvatar } from './HeroAvatar';
import { PainTrendList } from './PainTrend';
import type { HeroState } from '@/lib/types';

type StaffHero = Pick<HeroState, 'hero' | 'painMap' | 'trends'> & { aids?: string[]; suggestCrutches?: boolean; questFocus?: { skill: SkillKey; byTherapist: boolean; programmeSkills: SkillKey[] } } & { weekly: { weekStart: string; planned: number; completed: number; rate: number | null }[] };

/** Therapist: the patient's self-reported body map, first check-in versus latest. */
export function PainMapCard({ patientId }: { patientId: string }) {
  const clinical = useClinicalPractice();
  const { t, locale } = useI18n();
  const nl = locale === 'nl';
  const q = useQuery({ queryKey: ['patient', patientId, 'hero'], queryFn: () => api.get<StaffHero>(`/patients/${patientId}/hero`) });
  if (!q.data) return null;
  const { hero, painMap } = q.data;
  const toMap = (c: StaffHero['painMap']['current']) => Object.fromEntries((c?.entries ?? []).map((e) => [e.area, e.score]));
  const start = toMap(painMap.baseline);
  const now = toMap(painMap.current);
  const areas = BODY_AREAS.filter((a) => start[a.key] !== undefined || now[a.key] !== undefined);
  const avg = (c: StaffHero['painMap']['current']) => (c ? averagePain(c.entries.map((e) => e.score)) ?? 0 : null);
  return (
    <Card>
      <CardHeader
        title={t('Pijnkaart (door patiënt ingevuld)', 'Body map (filled in by the patient)')}
        description={t('Zelfrapportage, indicatief: geen diagnose. Eerste meting tegenover de laatste.', 'Self-report, indicative: not a diagnosis. First check-in versus the latest.')}
        action={hero ? <HeroAvatar look={hero} size={40} /> : undefined}
      />
      {hero && <AidsToggle patientId={patientId} on={(q.data.aids ?? []).includes('crutches')} suggest={!!q.data.suggestCrutches} />}
      {hero && q.data.questFocus && <QuestFocus patientId={patientId} focus={q.data.questFocus} />}
      {!painMap.current ? (
        <p className="px-5 py-4 text-[14px] text-ink-600">{t('De patiënt heeft de pijnkaart nog niet ingevuld.', 'The patient has not filled in the body map yet.')}</p>
      ) : (
        <div className="grid gap-5 p-5 md:grid-cols-[240px_minmax(0,1fr)]">
          <BodyMap entries={now} compare={painMap.checkins > 1 ? start : undefined} look={hero ?? undefined} />
          <div className="min-w-0 space-y-3">
            <dl className="grid grid-cols-2 gap-3 text-[14px]">
              <div className="rounded-lg border border-line p-3">
                <dt className="text-ink-600">{t('Start', 'Start')} · {fmtDate(painMap.baseline!.recordedAt, locale)}</dt>
                <dd className="font-display text-[20px] font-bold tabular-nums">{avg(painMap.baseline) ?? '—'}<span className="text-[13px] font-normal text-ink-600"> {t('gem.', 'avg')}</span></dd>
              </div>
              <div className="rounded-lg border border-line p-3">
                <dt className="text-ink-600">{t('Nu', 'Now')} · {fmtDate(painMap.current.recordedAt, locale)}</dt>
                <dd className="font-display text-[20px] font-bold tabular-nums">{avg(painMap.current) ?? '—'}<span className="text-[13px] font-normal text-ink-600"> {t('gem.', 'avg')}</span></dd>
              </div>
            </dl>
            {areas.length === 0 ? (
              <Notice tone="ok">{t('Geen pijn aangegeven.', 'No pain reported.')}</Notice>
            ) : (
              <table className="w-full text-left text-[14px]">
                <thead className="text-[12.5px] text-ink-600"><tr className="border-b border-line"><th className="py-1.5 pr-3 font-semibold">{t('Plek', 'Area')}</th><th className="py-1.5 pr-3 font-semibold">{t('Start', 'Start')}</th><th className="py-1.5 font-semibold">{t('Nu', 'Now')}</th></tr></thead>
                <tbody>
                  {areas.map((a) => (
                    <tr key={a.key} className="border-b border-line/70">
                      <td className="py-1.5 pr-3">{nl ? a.nl : a.en}</td>
                      <td className="py-1.5 pr-3 tabular-nums">{start[a.key] ?? '—'}</td>
                      <td className="py-1.5 tabular-nums">{now[a.key] !== undefined ? `${now[a.key]} · ${painWord(now[a.key], nl)}` : t('weg', 'gone')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <p className="text-[13px] text-ink-600">{t(`${painMap.checkins} ${painMap.checkins === 1 ? 'meting' : 'metingen'}`, `${painMap.checkins} check-in(s)`)}</p>
            {/* Straight to the complaint guide for the painful regions, with this patient. */}
            {clinical && (() => {
              const regions = [...new Set(areas.filter((a) => now[a.key] !== undefined).map((a) => regionForArea(a.key)).filter((r): r is NonNullable<typeof r> => !!r))];
              if (!regions.length) return null;
              return (
                <p className="flex flex-wrap items-center gap-2 text-[13.5px] text-ink-700">
                  <Compass className="h-4 w-4 text-accent" aria-hidden />{t('Klachtwijzer', 'Complaint guide')}:
                  {regions.map((r) => <Link key={r} to={`/app/klachtwijzer?regio=${r}&patient=${patientId}`} className="inline-flex min-h-[40px] items-center rounded-full bg-accent-soft px-3 font-medium text-accent hover:underline">{nl ? regionOf(r)!.name[0] : regionOf(r)!.name[1]}</Link>)}
                </p>
              );
            })()}
            {q.data.trends.some((tr) => tr.points.length > 1) && (
              <div className="border-t border-line pt-3">
                <h3 className="t-card mb-2">{t('Pijnverloop per plek', 'Pain trend per area')}</h3>
                <PainTrendList trends={q.data.trends.filter((tr) => tr.points.length > 1)} />
                <p className="mt-3 text-[13px] font-semibold text-ink-800">{t('Therapietrouw per week (laatste 12 weken)', 'Adherence per week (last 12 weeks)')}</p>
                <div className="mt-1 flex items-end gap-1" role="list" aria-label={t('Therapietrouw per week', 'Adherence per week')}>
                  {q.data.weekly.map((w) => (
                    <div key={w.weekStart} role="listitem" className="flex h-12 flex-1 flex-col justify-end" aria-label={t(`Week van ${w.weekStart}: ${w.planned ? `${w.completed} van ${w.planned}` : 'niets gepland'}`, `Week of ${w.weekStart}: ${w.planned ? `${w.completed} of ${w.planned}` : 'nothing planned'}`)}>
                      <div className={w.rate === null ? 'h-1 rounded-sm bg-ink-100' : 'rounded-sm bg-accent/70'} style={w.rate === null ? undefined : { height: `${Math.max(6, w.rate * 100)}%` }} />
                    </div>
                  ))}
                </div>
                <p className="mt-1 text-[12.5px] text-ink-600">{t('Zelfde weken als de lijnen hierboven: zo zie je of de pijn daalt terwijl de belasting stijgt.', 'Same weeks as the lines above: see whether pain goes down while the load goes up.')}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}

/** The therapist chooses the skill of the weekly skill quest (from this week on), or leaves it automatic. */
function QuestFocus({ patientId, focus }: { patientId: string; focus: NonNullable<StaffHero['questFocus']> }) {
  const { t, locale } = useI18n();
  const qc = useQueryClient();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const nl = locale === 'nl';
  const name = (k: SkillKey) => { const s = SKILLS.find((x) => x.key === k)!; return nl ? s.nl : s.en; };
  const change = async (v: string) => {
    setBusy(true);
    try {
      await api.put(`/patients/${patientId}/hero/focus`, { skill: v || null });
      await qc.invalidateQueries({ queryKey: ['patient', patientId, 'hero'] });
      toast(v ? t(`Weekquest deze week: ${name(v as SkillKey)}`, `Weekly quest this week: ${name(v as SkillKey)}`) : t('Weekquest weer automatisch', 'Weekly quest automatic again'), 'ok');
    } catch (e) {
      toast(describeError(e, locale), 'bad');
    } finally {
      setBusy(false);
    }
  };
  // Skills the programme trains first: only those can be completed with its exercises.
  const ordered = [...focus.programmeSkills, ...SKILLS.map((s) => s.key).filter((k) => !focus.programmeSkills.includes(k))];
  return (
    <div className="mx-5 mb-1 mt-2 flex flex-wrap items-center gap-3 rounded-xl border border-line bg-canvas px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="text-[14.5px] font-semibold text-ink-900">{t('Skill van de weekquest', 'Skill of the weekly quest')}</p>
        <p className="text-[13px] text-ink-600">{focus.byTherapist ? t(`Door jou gekozen: ${name(focus.skill)}.`, `Chosen by you: ${name(focus.skill)}.`) : t(`Automatisch deze week: ${name(focus.skill)}.`, `Automatic this week: ${name(focus.skill)}.`)} {t('Kies een skill die het programma traint.', 'Pick a skill the programme trains.')}</p>
      </div>
      <Select aria-label={t('Skill van de weekquest kiezen', 'Choose the skill of the weekly quest')} value={focus.byTherapist ? focus.skill : ''} disabled={busy} onChange={(e) => void change(e.target.value)} className="w-auto">
        <option value="">{t('Automatisch (wisselt per week)', 'Automatic (rotates weekly)')}</option>
        {ordered.map((k) => <option key={k} value={k}>{name(k)}{focus.programmeSkills.includes(k) ? '' : t(' (niet in programma)', ' (not in programme)')}</option>)}
      </Select>
    </div>
  );
}

/** The professional switches crutches on the patient's hero (e.g. the first weeks after ACL surgery). */
function AidsToggle({ patientId, on, suggest }: { patientId: string; on: boolean; suggest: boolean }) {
  const { t, locale } = useI18n();
  const qc = useQueryClient();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const toggle = async () => {
    setBusy(true);
    try {
      await api.put(`/patients/${patientId}/hero/aids`, { crutches: !on });
      await qc.invalidateQueries({ queryKey: ['patient', patientId, 'hero'] });
      toast(!on ? t('Krukken staan aan op de held', 'Crutches are on the hero') : t('Krukken uitgezet', 'Crutches switched off'), 'ok');
    } catch (e) {
      toast(describeError(e, locale), 'bad');
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="mx-5 mb-1 flex flex-wrap items-center gap-3 rounded-xl border border-line bg-canvas px-4 py-3">
      <div className="min-w-0 flex-1">
        <p id={`aids-${patientId}`} className="text-[14.5px] font-semibold text-ink-900">{t('Krukken op de held', 'Crutches on the hero')}</p>
        <p className="text-[13px] text-ink-600">
          {suggest && !on
            ? t('Voorstel: deze patiënt zit in een vroege fase na een knie-operatie.', 'Suggestion: this patient is in an early phase after knee surgery.')
            : t('Zichtbaar voor de patiënt, niet voor vrienden.', 'Visible to the patient, not to friends.')}
        </p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-labelledby={`aids-${patientId}`}
        disabled={busy}
        onClick={toggle}
        className={`relative h-8 w-14 shrink-0 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 ${on ? 'bg-accent' : 'bg-ink-300'}`}
      >
        <span className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow-xs transition-[left] ${on ? 'left-7' : 'left-1'}`} />
      </button>
    </div>
  );
}
