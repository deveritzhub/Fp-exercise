import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { useDocumentMeta } from '@/lib/meta';
import { useSession } from '@/lib/session';
import { ErrorState, Spinner } from '@/components/ui';
import { ProgramHandout } from '@/components/app/ProgramHandout';
import type { Program } from '@/lib/types';

/** Therapist: print a patient's programme (or a template) to hand over on paper. */
export function ProgramPrintPage() {
  const { id = '' } = useParams();
  const { t } = useI18n();
  const { practice } = useSession();
  const q = useQuery({ queryKey: ['program', id], queryFn: () => api.get<Program>(`/programs/${id}`) });
  useDocumentMeta(q.data ? `${q.data.title} — ${t('afdrukken', 'print')}` : t('Afdrukken', 'Print'));
  if (q.isError) return <ErrorState error={q.error} />;
  if (!q.data) return <Spinner />;
  const p = q.data;
  return (
    <ProgramHandout
      program={{ title: p.title, patientInstructions: p.patientInstructions, startDate: p.startDate, endDate: p.endDate, redFlags: p.redFlags, items: p.items }}
      patientName={p.patient ? `${p.patient.firstName} ${p.patient.lastName}` : undefined}
      practiceName={practice?.practiceName}
      backTo={`/app/programmas/${id}`}
    />
  );
}

/** Patient: their own programme on paper. */
export function PatientProgramPrintPage() {
  const { id = '' } = useParams();
  const { t } = useI18n();
  const { user } = useSession();
  const q = useQuery({ queryKey: ['patient-program', id], queryFn: () => api.get<Program & { therapistName: string | null }>(`/patient/programs/${id}`) });
  useDocumentMeta(q.data ? `${q.data.title} — ${t('afdrukken', 'print')}` : t('Afdrukken', 'Print'));
  if (q.isError) return <ErrorState error={q.error} />;
  if (!q.data) return <Spinner />;
  const p = q.data;
  return (
    <ProgramHandout
      program={{ title: p.title, patientInstructions: p.patientInstructions, startDate: p.startDate, endDate: p.endDate, redFlags: p.redFlags, items: p.items }}
      therapistName={p.therapistName}
      practiceName={user?.patient?.practiceName}
      backTo={`/p/programma/${id}`}
    />
  );
}
