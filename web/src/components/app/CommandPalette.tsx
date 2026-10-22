import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, BookOpen, CornerDownLeft, LayoutDashboard, Layers, Plus, Search, UserPlus, Users } from 'lucide-react';
import { api, qs } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { useLabels } from '@/lib/meta';
import { cn } from '@/lib/cn';
import { Avatar, useDebounced } from '@/components/ui';
import { ExerciseThumb } from './ExerciseThumb';
import type { Exercise, PatientListItem } from '@/lib/types';

type Item = { id: string; group: string; label: string; sub?: string; icon: React.ReactNode; to: string };

/** Ctrl/⌘+K quick search: patients, exercises and actions — keyboard first. */
export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t, locale } = useI18n();
  const L = useLabels();
  const nav = useNavigate();
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const dq = useDebounced(q.trim(), 150);

  useEffect(() => {
    if (open) {
      setQ('');
      setActive(0);
    }
  }, [open]);

  const patients = useQuery({
    queryKey: ['palette-patients', dq],
    queryFn: () => api.get<{ items: PatientListItem[] }>(`/patients${qs({ q: dq })}`),
    enabled: open && dq.length > 0,
  });
  const exercises = useQuery({
    queryKey: ['palette-exercises', dq],
    queryFn: () => api.get<{ items: Exercise[] }>(`/exercises${qs({ q: dq, limit: 6 })}`),
    enabled: open && dq.length > 1,
  });

  const items = useMemo<Item[]>(() => {
    const actions: Item[] = [
      { id: 'a-program', group: t('Acties', 'Actions'), label: t('Nieuw programma', 'New programme'), icon: <Plus className="h-4 w-4" />, to: '/app/programmas/nieuw' },
      { id: 'a-patient', group: t('Acties', 'Actions'), label: t('Nieuwe patiënt', 'New patient'), icon: <UserPlus className="h-4 w-4" />, to: '/app/patienten?nieuw=1' },
      { id: 'a-exercise', group: t('Acties', 'Actions'), label: t('Eigen oefening maken', 'Create exercise'), icon: <BookOpen className="h-4 w-4" />, to: '/app/oefeningen/nieuw' },
      { id: 'n-dash', group: t('Ga naar', 'Go to'), label: t('Dashboard', 'Dashboard'), icon: <LayoutDashboard className="h-4 w-4" />, to: '/app' },
      { id: 'n-patients', group: t('Ga naar', 'Go to'), label: t('Patiënten', 'Patients'), icon: <Users className="h-4 w-4" />, to: '/app/patienten' },
      { id: 'n-templates', group: t('Ga naar', 'Go to'), label: t('Sjablonen', 'Templates'), icon: <Layers className="h-4 w-4" />, to: '/app/programmas' },
    ];
    const ql = dq.toLowerCase();
    const out: Item[] = [];
    for (const p of patients.data?.items.slice(0, 5) ?? []) {
      const name = `${p.firstName} ${p.lastName}`;
      out.push({ id: `p-${p.id}`, group: t('Patiënten', 'Patients'), label: name, sub: p.email ?? undefined, icon: <Avatar name={name} size={24} />, to: `/app/patienten/${p.id}` });
    }
    for (const e of exercises.data?.items ?? []) {
      out.push({
        id: `e-${e.id}`,
        group: t('Oefeningen', 'Exercises'),
        label: locale === 'nl' ? e.nameNl : e.nameEn,
        sub: L.region(e.bodyRegion),
        icon: <ExerciseThumb thumbnailId={e.thumbnailMediaId} region={e.bodyRegion} className="h-6 w-6" rounded="rounded-md" />,
        to: `/app/oefeningen/${e.id}`,
      });
    }
    return [...out, ...actions.filter((a) => !ql || a.label.toLowerCase().includes(ql))];
  }, [patients.data, exercises.data, dq, locale, t, L]);

  useEffect(() => setActive(0), [items.length]);
  if (!open) return null;

  const go = (it?: Item) => {
    if (!it) return;
    onClose();
    nav(it.to);
  };
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(items.length - 1, a + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      go(items[active]);
    } else if (e.key === 'Escape') onClose();
  };

  let lastGroup = '';
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-ink-950/30 px-4 pt-[12vh] backdrop-blur-[2px] animate-fade-in" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('Snel zoeken', 'Quick search')}
        className="w-full max-w-xl animate-scale-in overflow-hidden rounded-2xl border border-line bg-white shadow-pop"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-line px-4">
          <Search className="h-4 w-4 shrink-0 text-ink-400" />
          <input
            ref={input}
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={onKey}
            placeholder={t('Zoek patiënt, oefening of actie…', 'Search patient, exercise or action…')}
            className="h-14 w-full border-0 bg-transparent text-[15px] text-ink-900 placeholder:text-ink-400 focus:outline-none focus:ring-0"
            role="combobox"
            aria-expanded="true"
            aria-controls="palette-list"
            aria-activedescendant={items[active] ? `pal-${items[active].id}` : undefined}
          />
          <kbd className="hidden rounded border border-line bg-ink-50 px-1.5 py-0.5 text-2xs text-ink-500 sm:block">Esc</kbd>
        </div>
        <ul id="palette-list" role="listbox" className="max-h-[50vh] overflow-y-auto p-2">
          {items.length === 0 && <li className="px-3 py-8 text-center text-[13.5px] text-ink-500">{t('Niets gevonden', 'Nothing found')}</li>}
          {items.map((it, i) => {
            const header = it.group !== lastGroup ? it.group : null;
            lastGroup = it.group;
            return (
              <li key={it.id} role="presentation">
                {header && <div className="px-3 pb-1 pt-3 text-2xs font-semibold uppercase tracking-wider text-ink-400">{header}</div>}
                <div
                  id={`pal-${it.id}`}
                  role="option"
                  aria-selected={i === active}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => go(it)}
                  className={cn('flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2', i === active ? 'bg-accent-soft' : '')}
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center text-ink-500">{it.icon}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-medium text-ink-900">{it.label}</span>
                    {it.sub && <span className="block truncate text-[12px] text-ink-500">{it.sub}</span>}
                  </span>
                  {i === active ? <CornerDownLeft className="h-3.5 w-3.5 text-ink-400" /> : <ArrowRight className="h-3.5 w-3.5 text-transparent" />}
                </div>
              </li>
            );
          })}
        </ul>
        <div className="flex items-center gap-4 border-t border-line bg-ink-50/60 px-4 py-2 text-2xs text-ink-500">
          <span>↑↓ {t('navigeren', 'navigate')}</span>
          <span>↵ {t('openen', 'open')}</span>
        </div>
      </div>
    </div>
  );
}
