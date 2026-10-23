import { lazy, Suspense, type ReactNode } from 'react';
import { createBrowserRouter, Link, Outlet, ScrollRestoration } from 'react-router-dom';
import { Spinner } from '@/components/ui';
import { useI18n } from '@/lib/i18n';
import { MarketingLayout } from '@/layouts/MarketingLayout';
import { RequireAuth } from '@/layouts/Guards';
import { HomePage } from '@/pages/marketing/HomePage';
import { ContactPage, CookiesPage, FeaturesPage, HowItWorksPage, PricingPage, PrivacyPage, TermsPage } from '@/pages/marketing/MarketingPages';
import { DemoPage } from '@/pages/marketing/DemoPage';
import { ForgotPasswordPage, InvitePage, LoginPage, MfaRequiredPage, ResetPasswordPage, VerifyEmailPage } from '@/pages/auth/AuthPages';

// Authenticated areas are code-split so the public website stays light.
const named = <K extends string>(loader: () => Promise<Record<K, React.ComponentType<any>>>, name: K) =>
  lazy(() => loader().then((m) => ({ default: m[name] })));
const TherapistLayout = named(() => import('@/layouts/TherapistLayout'), 'TherapistLayout');
const PatientLayout = named(() => import('@/layouts/PatientLayout'), 'PatientLayout');
const DashboardPage = named(() => import('@/pages/therapist/DashboardPage'), 'DashboardPage');
const PatientsPage = named(() => import('@/pages/therapist/PatientsPage'), 'PatientsPage');
const PatientDetailPage = named(() => import('@/pages/therapist/PatientDetailPage'), 'PatientDetailPage');
const ExercisesPage = named(() => import('@/pages/therapist/ExercisesPage'), 'ExercisesPage');
const ExerciseDetailPage = named(() => import('@/pages/therapist/ExerciseDetailPage'), 'ExerciseDetailPage');
const ExerciseFormPage = named(() => import('@/pages/therapist/ExerciseFormPage'), 'ExerciseFormPage');
const ProgramsPage = named(() => import('@/pages/therapist/ProgramsPage'), 'ProgramsPage');
const ProgramBuilderPage = named(() => import('@/pages/therapist/ProgramBuilderPage'), 'ProgramBuilderPage');
const PracticePage = named(() => import('@/pages/therapist/PracticePage'), 'PracticePage');
const AccountPage = named(() => import('@/pages/AccountPage'), 'AccountPage');
const PatientHome = named(() => import('@/pages/patient/PatientHome'), 'PatientHome');
const PatientProgramPage = named(() => import('@/pages/patient/SessionPlayer'), 'PatientProgramPage');
const SessionPlayer = named(() => import('@/pages/patient/SessionPlayer'), 'SessionPlayer');
const PatientExercisePage = named(() => import('@/pages/patient/SessionPlayer'), 'PatientExercisePage');
const PatientProgress = named(() => import('@/pages/patient/PatientProgress'), 'PatientProgress');
const AdminPage = named(() => import('@/pages/admin/AdminPage'), 'AdminPage');

const S = ({ children }: { children: ReactNode }) => <Suspense fallback={<Spinner className="min-h-[50vh]" />}>{children}</Suspense>;

function Root() {
  return (
    <>
      <ScrollRestoration />
      <Outlet />
    </>
  );
}

function NotFound() {
  const { t } = useI18n();
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
      <div className="text-[13px] font-semibold text-accent">404</div>
      <h1 className="mt-2 text-2xl font-semibold">{t('Pagina niet gevonden', 'Page not found')}</h1>
      <Link to="/" className="link mt-4">{t('Naar de homepage', 'Go to homepage')}</Link>
    </div>
  );
}

export const router = createBrowserRouter([
  {
    element: <Root />,
    errorElement: <NotFound />,
    children: [
      {
        element: <MarketingLayout />,
        children: [
          { path: '/', element: <HomePage /> },
          { path: '/functies', element: <FeaturesPage /> },
          { path: '/hoe-het-werkt', element: <HowItWorksPage /> },
          { path: '/prijzen', element: <PricingPage /> },
          { path: '/demo', element: <DemoPage /> },
          { path: '/contact', element: <ContactPage /> },
          { path: '/privacy', element: <PrivacyPage /> },
          { path: '/voorwaarden', element: <TermsPage /> },
          { path: '/cookies', element: <CookiesPage /> },
          { path: '*', element: <NotFound /> },
        ],
      },
      { path: '/login', element: <LoginPage /> },
      { path: '/wachtwoord-vergeten', element: <ForgotPasswordPage /> },
      { path: '/wachtwoord-herstellen', element: <ResetPasswordPage /> },
      { path: '/uitnodiging/:token', element: <InvitePage /> },
      { path: '/verifieer-email', element: <VerifyEmailPage /> },
      { path: '/tweestapsverificatie', element: <MfaRequiredPage /> },
      {
        path: '/app',
        element: <RequireAuth kind="staff"><S><TherapistLayout /></S></RequireAuth>,
        children: [
          { index: true, element: <S><DashboardPage /></S> },
          { path: 'patienten', element: <S><PatientsPage /></S> },
          { path: 'patienten/:id', element: <S><PatientDetailPage /></S> },
          { path: 'oefeningen', element: <S><ExercisesPage /></S> },
          { path: 'oefeningen/nieuw', element: <S><ExerciseFormPage /></S> },
          { path: 'oefeningen/:id', element: <S><ExerciseDetailPage /></S> },
          { path: 'oefeningen/:id/bewerken', element: <S><ExerciseFormPage /></S> },
          { path: 'programmas', element: <S><ProgramsPage /></S> },
          { path: 'programmas/nieuw', element: <S><ProgramBuilderPage key="new" /></S> },
          { path: 'programmas/:id', element: <S><ProgramBuilderPage /></S> },
          { path: 'praktijk', element: <S><PracticePage /></S> },
          { path: 'account', element: <S><AccountPage /></S> },
        ],
      },
      {
        path: '/p',
        element: <RequireAuth kind="patient"><S><PatientLayout /></S></RequireAuth>,
        children: [
          { index: true, element: <S><PatientHome /></S> },
          { path: 'programma/:id', element: <S><PatientProgramPage /></S> },
          { path: 'programma/:id/oefening/:itemId', element: <S><PatientExercisePage /></S> },
          { path: 'sessie/:id', element: <S><SessionPlayer /></S> },
          { path: 'voortgang', element: <S><PatientProgress /></S> },
          { path: 'account', element: <S><AccountPage patient /></S> },
        ],
      },
      { path: '/admin', element: <RequireAuth kind="admin"><S><AdminPage /></S></RequireAuth> },
    ],
  },
]);
