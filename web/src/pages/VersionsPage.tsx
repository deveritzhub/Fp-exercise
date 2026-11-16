import { Link } from 'react-router-dom';
import { ArrowLeft, Sparkles } from 'lucide-react';
import { releasesFor } from '@shared/changelog';
import { isClinical } from '@shared/accountKind';
import { useI18n } from '@/lib/i18n';
import { useSession } from '@/lib/session';
import { useDocumentMeta } from '@/lib/meta';

/** Every version of FP Flow since the first, newest first, with its date and what changed. */
export function VersionsPage({ audience }: { audience: 'patient' | 'staff' }) {
  const { t, locale } = useI18n();
  const nl = locale === 'nl';
  useDocumentMeta(t('Versiegeschiedenis', 'Version history'));
  const { user, practice } = useSession();
  const clinical = audience === 'patient' ? isClinical(user?.patient?.kind) : isClinical(practice?.kind);
  const releases = releasesFor(audience, clinical);
  const fmt = (d: string) => new Date(d + 'T12:00:00').toLocaleDateString(nl ? 'nl-NL' : 'en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  return (
    <div className="space-y-5">
      {audience === 'patient' && (
        <Link to="/p/instellingen" className="inline-flex min-h-[44px] items-center gap-1 text-[15px] font-medium text-ink-700">
          <ArrowLeft className="h-4 w-4" aria-hidden />{t('Instellingen', 'Settings')}
        </Link>
      )}
      <header>
        <p className="t-label flex items-center gap-1.5"><Sparkles className="h-4 w-4 text-accent" aria-hidden />FP Flow</p>
        <h1 className="t-page mt-1">{t('Versiegeschiedenis', 'Version history')}</h1>
        <p className="mt-1.5 text-[15px] text-ink-700">{t(`Alles wat er sinds de eerste versie is verbeterd. ${releases.length} versies.`, `Everything that improved since the first version. ${releases.length} versions.`)}</p>
      </header>
      <ol className="relative space-y-4 border-l-2 border-line pl-5" aria-label={t('Versies, nieuwste eerst', 'Versions, newest first')}>
        {releases.map((r, i) => (
          <li key={r.date} className="relative">
            <span aria-hidden className={i === 0 ? 'absolute -left-[29px] top-1.5 h-4 w-4 rounded-full border-2 border-surface bg-accent' : 'absolute -left-[27px] top-2 h-3 w-3 rounded-full border-2 border-surface bg-ink-300'} />
            <section className="rounded-2xl border border-line bg-white p-4 shadow-card" aria-labelledby={`v-${r.date}`}>
              <p className="text-[13px] font-semibold capitalize text-ink-600"><time dateTime={r.date}>{fmt(r.date)}</time>{i === 0 && <span className="ml-2 rounded-full bg-accent px-2 py-0.5 text-[11.5px] font-semibold normal-case text-accent-ink">{t('Nieuwste', 'Latest')}</span>}</p>
              <h2 id={`v-${r.date}`} className="t-card mt-0.5">{nl ? r.titleNl : r.titleEn}</h2>
              <ul className="mt-2 space-y-1.5">
                {r.items.map((x, k) => (
                  <li key={k} className="flex gap-2 text-[14.5px] leading-snug text-ink-800">
                    <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-accent" aria-hidden />
                    <span>{nl ? x.nl : x.en}</span>
                  </li>
                ))}
              </ul>
            </section>
          </li>
        ))}
      </ol>
    </div>
  );
}
