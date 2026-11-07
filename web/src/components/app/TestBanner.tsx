import { useQuery } from '@tanstack/react-query';
import { FlaskConical } from 'lucide-react';
import { api } from '@/lib/api';
import { useI18n } from '@/lib/i18n';

/**
 * On the test version (family and colleagues trying the app): a slim reminder that this is not
 * the place for real medical details. Hidden on the real production setup.
 */
export function TestBanner() {
  const { t } = useI18n();
  const q = useQuery({ queryKey: ['public-demo-info'], queryFn: () => api.get<{ testVersion?: boolean }>('/public/demo'), staleTime: 10 * 60_000 });
  if (!q.data?.testVersion) return null;
  return (
    <div className="flex items-center justify-center gap-1.5 bg-sand-soft px-3 py-1 text-center text-[12.5px] font-medium text-sand-ink print:hidden" role="note">
      <FlaskConical className="h-3.5 w-3.5 shrink-0" aria-hidden />
      {t('Testversie: gebruik geen echte medische gegevens. Tips? Gebruik de feedbackknop.', 'Test version: do not enter real medical details. Tips? Use the feedback button.')}
    </div>
  );
}
