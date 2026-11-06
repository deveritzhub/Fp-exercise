import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { fmtRelative } from '@/lib/format';
import { Popover } from '@/components/ui';
import { cn } from '@/lib/cn';
import type { Notification } from '@/lib/types';

export function NotificationBell() {
  const { t, locale } = useI18n();
  const qc = useQueryClient();
  const nav = useNavigate();
  const q = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.poll<{ items: Notification[]; unread: number }>('/me/notifications'),
    refetchInterval: 60_000,
  });
  const unread = q.data?.unread ?? 0;
  return (
    <Popover
      trigger={({ toggle }) => (
        <button type="button" onClick={toggle} className="relative inline-flex h-8 w-8 items-center justify-center rounded-lg text-ink-500 hover:bg-ink-100 hover:text-ink-900" aria-label={t(`Meldingen (${unread} ongelezen)`, `Notifications (${unread} unread)`)}>
          <Bell className="h-[18px] w-[18px]" />
          {unread > 0 && <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-bad ring-2 ring-white" />}
        </button>
      )}
      className="w-80"
    >
      {(close) => (
        <div>
          <div className="flex items-center justify-between px-2.5 py-2">
            <span className="text-[13px] font-semibold">{t('Meldingen', 'Notifications')}</span>
            {unread > 0 && (
              <button
                type="button"
                className="text-[12.5px] font-medium text-accent hover:underline"
                onClick={async () => {
                  await api.post('/me/notifications/read-all');
                  qc.invalidateQueries({ queryKey: ['notifications'] });
                }}
              >
                {t('Alles gelezen', 'Mark all read')}
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {!q.data?.items.length && <p className="px-2.5 py-6 text-center text-[13px] text-ink-500">{t('Geen meldingen', 'No notifications')}</p>}
            {q.data?.items.map((n) => (
              <button
                key={n.id}
                type="button"
                className="flex w-full gap-2.5 rounded-lg px-2.5 py-2 text-left hover:bg-ink-50"
                onClick={async () => {
                  close();
                  if (!n.readAt) await api.post(`/me/notifications/${n.id}/read`);
                  qc.invalidateQueries({ queryKey: ['notifications'] });
                  if (n.link) nav(n.link);
                }}
              >
                <span className={cn('mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full', n.readAt ? 'bg-transparent' : n.kind === 'feedback_received' && n.title.includes('pijn') ? 'bg-bad' : 'bg-accent')} />
                <span className="min-w-0">
                  <span className="block text-[13px] font-medium text-ink-900">{n.title}</span>
                  {n.body && <span className="block truncate text-[12.5px] text-ink-500">{n.body}</span>}
                  <span className="text-2xs text-ink-400">{fmtRelative(n.createdAt, locale)}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </Popover>
  );
}
