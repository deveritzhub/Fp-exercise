import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { useDocumentMeta } from '@/lib/meta';
import { MobilityTests } from '@/components/MobilityTests';

/** Measure your mobility with simple published tests and follow your own trend. */
export function MobilityTestsPage() {
  const { t } = useI18n();
  useDocumentMeta(t('Mobiliteit meten', 'Measure mobility'));
  return (
    <div className="space-y-5">
      <Link to="/p/mobiliteit" className="inline-flex min-h-[44px] items-center gap-1 text-[15px] font-medium text-ink-700"><ArrowLeft className="h-4 w-4" aria-hidden />{t('Mobiliteit', 'Mobility')}</Link>
      <div>
        <h1 className="t-page">{t('Mobiliteit meten', 'Measure mobility')}</h1>
        <p className="mt-1 text-[15px] text-ink-600">{t('Vier eenvoudige tests met een meetlint, uit onderzoek naar betrouwbare metingen. Zo zie je of je soepeler wordt.', 'Four simple tests with a tape measure, taken from research on reliable measurements. So you can see whether you are getting more supple.')}</p>
      </div>
      <MobilityTests base="/patient" />
    </div>
  );
}
