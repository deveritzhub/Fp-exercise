import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { fmtDate } from '@/lib/format';
import { BODY_AREAS, averagePain } from '@shared/hero';
import { Card, CardHeader, Notice } from '@/components/ui';
import { BodyMap, painWord } from './BodyMap';
import { HeroAvatar } from './HeroAvatar';
import type { HeroState } from '@/lib/types';

type StaffHero = Pick<HeroState, 'hero' | 'painMap'>;

/** Therapist: the patient's self-reported body map, first check-in versus latest. */
export function PainMapCard({ patientId }: { patientId: string }) {
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
      {!painMap.current ? (
        <p className="px-5 py-4 text-[14px] text-ink-600">{t('De patiënt heeft de pijnkaart nog niet ingevuld.', 'The patient has not filled in the body map yet.')}</p>
      ) : (
        <div className="grid gap-5 p-5 md:grid-cols-[240px_minmax(0,1fr)]">
          <BodyMap entries={now} compare={painMap.checkins > 1 ? start : undefined} />
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
          </div>
        </div>
      )}
    </Card>
  );
}
