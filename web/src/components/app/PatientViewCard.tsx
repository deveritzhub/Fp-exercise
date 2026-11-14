import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { describeError, useI18n } from '@/lib/i18n';
import { Card, useToast } from '@/components/ui';

/**
 * How this patient uses the app: as a game or plainly. The therapist can set it, for instance for
 * someone who wants no game; the patient can change it again under Settings.
 */
export function PatientViewCard({ patientId }: { patientId: string }) {
  const { t, locale } = useI18n();
  const toast = useToast();
  const qc = useQueryClient();
  const key = ['patient-view-staff', patientId];
  const q = useQuery({ queryKey: key, queryFn: () => api.get<{ simple: boolean | null }>(`/patients/${patientId}/view`) });
  if (!q.data) return null;
  const set = async (simple: boolean) => {
    try {
      qc.setQueryData(key, await api.put<{ simple: boolean }>(`/patients/${patientId}/view`, { simple }));
      toast(simple ? t('Eenvoudige weergave ingesteld.', 'Plain view set.') : t('Spelweergave ingesteld.', 'Game view set.'));
    } catch (e) {
      toast(describeError(e, locale), 'bad');
    }
  };
  const cls = 'min-h-[44px] flex-1 rounded-xl border border-line bg-white px-3 text-[14.5px] font-semibold text-ink-800 aria-pressed:border-accent aria-pressed:bg-accent aria-pressed:text-white';
  return (
    <Card className="p-5" data-testid="patient-view-card">
      <h2 className="t-section">{t('Weergave van de app', 'View of the app')}</h2>
      <p className="mt-1 text-[14.5px] text-ink-700">
        {q.data.simple === null ? t('Nog niet gekozen: de patiënt krijgt de vraag bij het openen.', 'Not chosen yet: the patient is asked on opening.') : t('De patiënt kan dit zelf wijzigen bij Instellingen.', 'The patient can change this under Settings.')}
      </p>
      <div className="mt-3 flex gap-2" role="group" aria-label={t('Weergave van de app', 'View of the app')}>
        <button type="button" data-view="simple" aria-pressed={q.data.simple === true} className={cls} onClick={() => void set(true)}>{t('Eenvoudig: alleen oefeningen', 'Plain: exercises only')}</button>
        <button type="button" data-view="game" aria-pressed={q.data.simple === false} className={cls} onClick={() => void set(false)}>{t('Als spel: dorp en held', 'As a game: village and hero')}</button>
      </div>
    </Card>
  );
}
