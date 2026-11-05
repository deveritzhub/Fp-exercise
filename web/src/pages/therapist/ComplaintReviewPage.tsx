import { Link } from 'react-router-dom';
import { ArrowLeft, Printer } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { useDocumentMeta } from '@/lib/meta';
import { Button } from '@/components/ui';
import { MUSCLES } from '@shared/muscleAtlas';
import { CHAINS, COMPENSATIONS, COMPLAINTS, REGIONS, complaintsIn } from '@shared/complaints';
import { MOBILITY_TESTS } from '@shared/mobilityTests';

type Fn = readonly [string, string];

/**
 * Every text of the complaint guide on one page (printable), so a physiotherapist can review it in
 * one go before patients see the results. Dutch, the language the texts were written in.
 */
export function ComplaintReviewPage() {
  const { t } = useI18n();
  useDocumentMeta(t('Klachtwijzer: klinische controle', 'Complaint guide: clinical review'));
  const nl = (f: Fn) => f[0];
  const m = (k: string) => MUSCLES.find((x) => x.key === k)?.nl ?? k;
  return (
    <div className="mx-auto max-w-3xl space-y-8 print:max-w-none">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link to="/app/klachtwijzer" className="inline-flex min-h-[44px] items-center gap-1 text-[15px] font-medium text-ink-700"><ArrowLeft className="h-4 w-4" aria-hidden />{t('Klachtwijzer', 'Complaint guide')}</Link>
        <Button variant="secondary" onClick={() => window.print()} icon={<Printer className="h-4 w-4" />}>{t('Printen of PDF', 'Print or PDF')}</Button>
      </div>
      <header>
        <h1 className="t-page">Klachtwijzer: klinische controle</h1>
        <p className="mt-1 text-[15px] text-ink-700">Alle teksten van de klachtwijzer, de compensatiepatronen en de mobiliteitstests op één pagina. Loop ze na en noteer per onderdeel akkoord of wijziging. {COMPLAINTS.length} klachten, {COMPENSATIONS.length} compensatiepatronen, {CHAINS.length} ketens, {MOBILITY_TESTS.length} mobiliteitstests.</p>
      </header>

      <section aria-labelledby="rv-comp" className="space-y-4">
        <h2 id="rv-comp" className="t-section">Compensatiepatronen</h2>
        {COMPENSATIONS.map((c) => (
          <article key={c.key} className="break-inside-avoid rounded-xl border border-line bg-white p-4">
            <h3 className="font-semibold text-ink-900">{nl(c.name)}</h3>
            <p className="text-[13px] text-ink-600">Zwak: {c.weak.map(m).join(', ')} → neemt over: {c.over.map(m).join(', ')} · keten: {nl(CHAINS.find((x) => x.key === c.chain)!.name)}</p>
            <dl className="mt-2 grid gap-1 text-[14px] sm:grid-cols-[9rem_1fr]">
              {([['Wat zie je', c.see], ['Snelle test', c.test], ['Aanpak', c.approach], ['Cue', c.cue], ['Even aanpassen', c.adjust], ['Voor de patiënt', c.patientWhy]] as [string, Fn][]).map(([label, f]) => (
                <div key={label} className="contents"><dt className="font-medium text-ink-600">{label}</dt><dd className="text-ink-900">{nl(f)}</dd></div>
              ))}
              {c.avoid && <div className="contents"><dt className="font-medium text-ink-600">Niet voorstellen</dt><dd className="text-ink-900">oefeningen met “{c.avoid.join('”, “')}” in de naam</dd></div>}
            </dl>
            <p className="mt-2 text-[13px] text-ink-500">Akkoord ☐ · Wijziging: ______________________________</p>
          </article>
        ))}
      </section>

      <section aria-labelledby="rv-regions" className="space-y-4">
        <h2 id="rv-regions" className="t-section">Regio's, rode vlaggen en klachten</h2>
        {REGIONS.map((r) => (
          <article key={r.key} className="break-inside-avoid rounded-xl border border-line bg-white p-4">
            <h3 className="font-semibold text-ink-900">{nl(r.name)}</h3>
            <p className="mt-1 text-[13px] font-medium text-ink-600">Rode vlaggen</p>
            <ul className="list-disc pl-5 text-[14px] text-ink-900">{r.redFlags.map((f, i) => <li key={i}>{nl(f)}</li>)}</ul>
            <ul className="mt-2 space-y-2">
              {complaintsIn(r.key).map((c) => (
                <li key={c.key} className="text-[14px]">
                  <span className="font-medium text-ink-900">{nl(c.name)}</span> <span className="text-ink-500">({c.synonyms.join(', ')})</span>
                  <span className="block text-ink-800">{nl(c.what)}</span>
                  <span className="block text-[13px] text-ink-600">Compensaties: {c.compensations.map((k) => nl(COMPENSATIONS.find((x) => x.key === k)!.name)).join('; ') || '–'}{c.nerves ? ` · sliders: ${c.nerves.join(', ')}` : ''}</span>
                  {c.avoid && <span className="block text-[13px] text-ink-800">Let op: {nl(c.avoid.why)}</span>}
                </li>
              ))}
            </ul>
            <p className="mt-2 text-[13px] text-ink-500">Akkoord ☐ · Wijziging: ______________________________</p>
          </article>
        ))}
      </section>

      <section aria-labelledby="rv-mob" className="space-y-4">
        <h2 id="rv-mob" className="t-section">Mobiliteitstests (patiënt meet zelf)</h2>
        {MOBILITY_TESTS.map((x) => (
          <article key={x.key} className="break-inside-avoid rounded-xl border border-line bg-white p-4 text-[14px]">
            <h3 className="font-semibold text-ink-900">{nl(x.name)}</h3>
            <ol className="mt-1 list-decimal pl-5 text-ink-900">{x.steps.map((s, i) => <li key={i}>{nl(s)}</li>)}</ol>
            <p className="mt-1 text-ink-800">Let op: {nl(x.caution)}</p>
            <p className="text-[13px] text-ink-600">Bron: {x.source}{x.realChange ? ` · meetfout ±${x.realChange} cm` : ''}</p>
            <p className="mt-2 text-[13px] text-ink-500">Akkoord ☐ · Wijziging: ______________________________</p>
          </article>
        ))}
      </section>
    </div>
  );
}
