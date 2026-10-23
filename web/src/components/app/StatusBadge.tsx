import { Badge } from '@/components/ui';
import { useI18n } from '@/lib/i18n';
import type { ProgramStatus } from '@/lib/types';

export function ProgramStatusBadge({ status }: { status: ProgramStatus }) {
  const { t } = useI18n();
  const map = {
    draft: <Badge tone="outline">{t('Concept', 'Draft')}</Badge>,
    active: <Badge tone="ok" dot>{t('Actief', 'Active')}</Badge>,
    completed: <Badge tone="info">{t('Afgerond', 'Completed')}</Badge>,
    archived: <Badge tone="neutral">{t('Gearchiveerd', 'Archived')}</Badge>,
  } as const;
  return map[status];
}

export function useReasonLabel() {
  const { t } = useI18n();
  return (r: string): { text: string; tone: 'bad' | 'warn' | 'info' | 'neutral' } => {
    switch (r) {
      case 'high_pain': return { text: t('Hoge pijnscore', 'High pain score'), tone: 'bad' };
      case 'new_feedback': return { text: t('Nieuwe feedback', 'New feedback'), tone: 'info' };
      case 'low_adherence': return { text: t('Lage therapietrouw', 'Low adherence'), tone: 'warn' };
      case 'no_registration': return { text: t('Geen registratie', 'Nothing registered'), tone: 'warn' };
      case 'program_ending': return { text: t('Programma eindigt binnenkort', 'Programme ending soon'), tone: 'neutral' };
      case 'not_activated': return { text: t('Account niet geactiveerd', 'Account not activated'), tone: 'neutral' };
      case 'no_active_program': return { text: t('Geen actief programma', 'No active programme'), tone: 'neutral' };
      default: return { text: r, tone: 'neutral' };
    }
  };
}

export function Difficulty({ value }: { value: number }) {
  const { t } = useI18n();
  return (
    <span className="inline-flex items-center gap-0.5" role="img" aria-label={`${t('Niveau', 'Level')} ${value}/5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={i <= value ? 'h-2.5 w-1 rounded-full bg-accent' : 'h-2.5 w-1 rounded-full bg-ink-200'} />
      ))}
    </span>
  );
}
