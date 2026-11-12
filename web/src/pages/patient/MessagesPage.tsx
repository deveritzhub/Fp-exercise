import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { BookOpen, Brain, ChevronRight, ClipboardList, MessageCircle, Ruler, Trophy, type LucideIcon } from 'lucide-react';
import { api } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { useDocumentMeta } from '@/lib/meta';
import { fmtRelative } from '@/lib/format';
import { Button, ErrorState, Spinner } from '@/components/ui';
import { cn } from '@/lib/cn';
import type { Notification } from '@/lib/types';

/** One icon per kind of message, so the list is easy to scan. */
const KIND_ICON: Record<string, LucideIcon> = {
  program_assigned: ClipboardList, program_updated: ClipboardList, complaint_explanation: BookOpen, mobility_measure: Ruler,
  phase_unlocked: Trophy, feedback_reply: MessageCircle, atlas_muscle: Brain,
};

/** Everything the practice sent: replies to workouts, muscle cards, requests to measure, new programmes. */
export function MessagesPage() {
  const { t, locale } = useI18n();
  useDocumentMeta(t('Berichten', 'Messages'));
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['notifications'], queryFn: () => api.get<{ items: Notification[]; unread: number }>('/me/notifications') });
  const read = async (id: string) => {
    await api.post(`/me/notifications/${id}/read`);
    void qc.invalidateQueries({ queryKey: ['notifications'] });
    void qc.invalidateQueries({ queryKey: ['patient-home'] });
  };
  if (q.isError) return <ErrorState error={q.error} onRetry={() => void q.refetch()} />;
  if (!q.data) return <Spinner className="min-h-[40vh]" />;
  const { items, unread } = q.data;
  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between gap-3">
        <h1 className="t-page">{t('Berichten', 'Messages')}</h1>
        {unread > 0 && (
          <Button variant="ghost" size="sm" onClick={async () => { await api.post('/me/notifications/read-all'); void qc.invalidateQueries({ queryKey: ['notifications'] }); void qc.invalidateQueries({ queryKey: ['patient-home'] }); }}>
            {t('Alles gelezen', 'Mark all read')}
          </Button>
        )}
      </div>
      {items.length === 0 ? (
        <p className="rounded-2xl border border-line bg-white p-5 text-[15px] text-ink-600 shadow-card">{t('Nog geen berichten. Reacties van je fysiotherapeut komen hier.', 'No messages yet. Replies from your physiotherapist appear here.')}</p>
      ) : (
        <ul className="space-y-2">
          {items.map((n) => (
            <li key={n.id} className={cn('rounded-2xl border bg-white p-4 shadow-card', n.readAt ? 'border-line' : 'border-accent/40')}>
              <div className="flex items-start justify-between gap-3">
                {(() => { const I = KIND_ICON[n.kind] ?? MessageCircle; return <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent"><I className="h-[18px] w-[18px]" aria-hidden /></span>; })()}
                <p className="min-w-0 flex-1 font-semibold text-ink-900">{!n.readAt && <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-accent align-middle" aria-hidden />}{!n.readAt && <span className="sr-only">{t('Nieuw: ', 'New: ')}</span>}{n.title}</p>
                <span className="shrink-0 text-[12.5px] text-ink-500">{fmtRelative(n.createdAt, locale)}</span>
              </div>
              {n.body && <p className="mt-1 whitespace-pre-line text-[15px] text-ink-800">{n.body}</p>}
              <div className="mt-1 flex flex-wrap gap-x-4">
                {/* Only when the message leads somewhere of its own: the home page is not a destination. */}
                {n.link && n.link.startsWith('/p/') && (
                  <Link to={n.link} onClick={() => { if (!n.readAt) void read(n.id); }} className="inline-flex min-h-[44px] items-center gap-1 text-[14.5px] font-semibold text-accent">{t('Bekijken', 'View')}<ChevronRight className="h-4 w-4" aria-hidden /></Link>
                )}
                {!n.readAt && <button type="button" onClick={() => void read(n.id)} className="inline-flex min-h-[44px] items-center text-[14px] font-medium text-ink-600 hover:text-ink-900">{t('Gelezen', 'Read')}</button>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
