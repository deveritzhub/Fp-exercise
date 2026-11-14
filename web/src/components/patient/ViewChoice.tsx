import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Gamepad2, ListChecks } from 'lucide-react';
import { api } from '@/lib/api';
import { describeError, useI18n } from '@/lib/i18n';
import { useSession } from '@/lib/session';
import { Card, useToast } from '@/components/ui';

/**
 * Game or plain. As a game the app has a village, a hero and XP; plainly it shows the exercises and
 * little else. `simple` is null until someone chose. XP keeps counting either way, so switching later
 * loses nothing.
 */
export function useView() {
  const { user } = useSession();
  const { locale } = useI18n();
  const toast = useToast();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['patient-view'], queryFn: () => api.get<{ simple: boolean | null }>('/patient/view'), enabled: !!user?.patient, staleTime: 10 * 60_000 });
  const set = async (simple: boolean) => {
    const before = qc.getQueryData(['patient-view']);
    qc.setQueryData(['patient-view'], { simple });
    try {
      await api.put('/patient/view', { simple });
    } catch (e) {
      qc.setQueryData(['patient-view'], before);
      toast(describeError(e, locale), 'bad');
    }
  };
  return { simple: q.data?.simple ?? null, chosen: q.data ? q.data.simple !== null : true, set };
}

const OPTION = 'tap flex min-h-[96px] flex-col items-start gap-1 rounded-2xl border-2 border-line bg-white p-4 text-left hover:border-accent aria-pressed:border-accent aria-pressed:bg-accent-soft';

/** The two ways to use the app, as two large buttons. */
function Options({ simple, onPick }: { simple: boolean | null; onPick: (simple: boolean) => void }) {
  const { t } = useI18n();
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <button type="button" data-view="simple" aria-pressed={simple === true} onClick={() => onPick(true)} className={OPTION}>
        <span className="flex items-center gap-2 text-[17px] font-bold text-ink-950"><ListChecks className="h-6 w-6 text-accent" aria-hidden />{t('Eenvoudig', 'Plain')}</span>
        <span className="text-[14.5px] text-ink-700">{t('Alleen je oefeningen, met grote knoppen. Geen spel.', 'Only your exercises, with large buttons. No game.')}</span>
      </button>
      <button type="button" data-view="game" aria-pressed={simple === false} onClick={() => onPick(false)} className={OPTION}>
        <span className="flex items-center gap-2 text-[17px] font-bold text-ink-950"><Gamepad2 className="h-6 w-6 text-accent" aria-hidden />{t('Als spel', 'As a game')}</span>
        <span className="text-[14.5px] text-ink-700">{t('Met een dorp, een held en punten voor elke training.', 'With a village, a hero and points for every workout.')}</span>
      </button>
    </div>
  );
}

/** On Vandaag, once: how do you want to use the app? Gone as soon as a choice is made. */
export function ViewChoiceCard() {
  const { t } = useI18n();
  const v = useView();
  if (v.chosen) return null;
  return (
    <section aria-labelledby="view-choice" data-testid="view-choice" className="rounded-2xl border-2 border-accent/40 bg-accent-soft p-4">
      <h2 id="view-choice" className="text-[18px] font-bold text-ink-950">{t('Hoe wil je de app gebruiken?', 'How would you like to use the app?')}</h2>
      <p className="mb-3 mt-1 text-[14.5px] text-ink-700">{t('Je kunt dit later altijd wijzigen bij Instellingen.', 'You can always change this later under Settings.')}</p>
      <Options simple={null} onPick={(s) => void v.set(s)} />
    </section>
  );
}

/** Under Settings: the same choice, to change at any time. */
export function ViewCard() {
  const { t } = useI18n();
  const v = useView();
  return (
    <Card className="p-4" data-testid="view-card">
      <p className="mb-1 text-[15.5px] font-semibold text-ink-950">{t('Weergave', 'View')}</p>
      <p className="mb-3 text-[14px] text-ink-700">{t('Je punten en levels tellen in beide weergaven door, dus wisselen kost niets.', 'Your points and levels keep counting in both views, so switching costs nothing.')}</p>
      <Options simple={v.simple} onPick={(s) => void v.set(s)} />
    </Card>
  );
}
