import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Trophy } from 'lucide-react';
import { api } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { Button, Dialog } from '@/components/ui';
import type { Notification } from '@/lib/types';

/**
 * "Chapter completed": once, when the therapist released the next rehabilitation phase. Closing it
 * marks the message read (it stays under Messages). The game never releases a phase itself.
 */
export function PhaseCelebration() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const nav = useNavigate();
  const [closed, setClosed] = useState<string | null>(null);
  const q = useQuery({ queryKey: ['notifications'], queryFn: () => api.get<{ items: Notification[]; unread: number }>('/me/notifications'), staleTime: 60_000 });
  const n = q.data?.items.find((x) => x.kind === 'phase_unlocked' && !x.readAt);
  if (!n || closed === n.id) return null;
  const done = async (go: boolean) => {
    setClosed(n.id);
    await api.post(`/me/notifications/${n.id}/read`).catch(() => undefined);
    void qc.invalidateQueries({ queryKey: ['notifications'] });
    if (go) nav('/p/revalidatie');
  };
  return (
    <Dialog open onClose={() => void done(false)} title={n.title} size="sm"
      footer={<Button className="w-full" onClick={() => void done(true)}>{t('Naar je nieuwe fase', 'To your new phase')}</Button>}>
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="flex h-20 w-20 items-center justify-center rounded-full bg-[radial-gradient(circle,#fde68a_0%,#f59e0b_100%)] shadow-card motion-safe:animate-[bounce_1s_ease-in-out_2]" aria-hidden>
          <Trophy className="h-10 w-10 text-white" />
        </span>
        <p className="text-[16px] text-ink-800">{n.body}</p>
        <p className="rounded-full bg-accent-soft px-3 py-1 text-[13.5px] font-semibold text-accent">{t('Medaille: Fase voltooid', 'Medal: Phase complete')}</p>
        <p className="text-[14px] text-ink-600">{t('Knap werk. Je fysiotherapeut heeft gezien dat je klaar bent voor de volgende stap.', 'Well done. Your physiotherapist has seen that you are ready for the next step.')}</p>
      </div>
    </Dialog>
  );
}
