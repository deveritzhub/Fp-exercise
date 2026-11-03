import { ShieldCheck } from 'lucide-react';
import { accentVars } from '@/lib/accent';
import { useI18n } from '@/lib/i18n';

/** The current draft branding only; changing this preview never saves any settings. */
export function PracticeBrandPreview({ name, accent }: { name: string; accent: string }) {
  const { t } = useI18n();
  const safe = accentVars(accent);
  // accentVars is the same validated and contrast-adjusted colour logic used by the patient app.
  const rgb = safe?.['--accent'] ?? '41 72 60';
  return (
    <section aria-label={t('Voorbeeld van praktijkbranding', 'Practice branding preview')} className="rounded-2xl border border-line bg-canvas p-4">
      <div className="mb-3 flex items-center gap-2 text-[13px] font-semibold text-ink-800"><ShieldCheck className="h-4 w-4" aria-hidden="true" />
        {t('Voorbeeld patiëntenapp (niet opgeslagen)', 'Patient app preview (not saved)')}
      </div>
      <div className="overflow-hidden rounded-xl border border-line bg-white shadow-sm">
        <div className="flex min-h-[58px] items-center justify-between gap-3 border-b border-line px-4">
          <span className="min-w-0 truncate text-[14px] font-semibold text-ink-900" data-testid="preview-practice-name">{name.trim() || t('Jouw praktijk', 'Your practice')}</span>
          <span className="shrink-0 rounded-md border border-line px-2 py-1 text-[11px] text-ink-600">FP Flow</span>
        </div>
        <div className="space-y-3 p-4">
          <p className="text-[13px] text-ink-700">{t('Voorbeeld van het patiëntportaal', 'Patient portal preview')}</p>
          <span className="inline-flex min-h-[44px] items-center rounded-xl px-4 text-[13px] font-bold" style={{backgroundColor:`rgb(${rgb})`,color:'#ffffff'}} data-testid="preview-brand-button">
            {t('Mijn oefeningen', 'My exercises')}
          </span>
        </div>
      </div>
      <p className="mt-2 text-[12px] leading-relaxed text-ink-600">
        {t('Naam en accentkleur zijn al per praktijk instelbaar. Een eigen logo per praktijk vereist nog veilige upload- en opslagfunctionaliteit; deze preview wijzigt niets aan patiëntgegevens.', 'Each practice already has its own name and accent colour. A practice-specific logo still requires secure upload and storage; this preview changes no patient data.')}
      </p>
    </section>
  );
}
