import { lazy, Suspense, useEffect, type ReactNode } from 'react';
import { createBrowserRouter, isRouteErrorResponse, Link, Outlet, ScrollRestoration, useRouteError } from 'react-router-dom';
import { reportError } from '@/lib/reportError';
import { Spinner } from '@/components/ui';
import { useI18n } from '@/lib/i18n';
import { MarketingLayout } from '@/layouts/MarketingLayout';
import { RequireAuth, RequireClinical } from '@/layouts/Guards';
import { HomePage } from '@/pages/marketing/HomePage';
import { ForgotPasswordPage, InvitePage, LoginPage, MfaRequiredPage, ResetPasswordPage, VerifyEmailPage } from '@/pages/auth/AuthPages';
import { SignupPage } from '@/pages/auth/SignupPage';

// Authenticated areas are code-split so the public website stays light.
const named = <K extends string>(loader: () => Promise<Record<K, React.ComponentType<any>>>, name: K) =>
  lazy(() => loader().then((m) => ({ default: m[name] })));
// Secondary marketing pages: own chunks, so the app start (login, patient app) stays small.
const FeaturesPage = named(() => import('@/pages/marketing/MarketingPages'), 'FeaturesPage');
const HowItWorksPage = named(() => import('@/pages/marketing/MarketingPages'), 'HowItWorksPage');
const PricingPage = named(() => import('@/pages/marketing/MarketingPages'), 'PricingPage');
const ContactPage = named(() => import('@/pages/marketing/MarketingPages'), 'ContactPage');
const PrivacyPage = named(() => import('@/pages/marketing/MarketingPages'), 'PrivacyPage');
const TermsPage = named(() => import('@/pages/marketing/MarketingPages'), 'TermsPage');
const CookiesPage = named(() => import('@/pages/marketing/MarketingPages'), 'CookiesPage');
const DemoPage = named(() => import('@/pages/marketing/DemoPage'), 'DemoPage');
const TherapistLayout = named(() => import('@/layouts/TherapistLayout'), 'TherapistLayout');
const PatientLayout = named(() => import('@/layouts/PatientLayout'), 'PatientLayout');
const DashboardPage = named(() => import('@/pages/therapist/DashboardPage'), 'DashboardPage');
const PatientsPage = named(() => import('@/pages/therapist/PatientsPage'), 'PatientsPage');
const PatientDetailPage = named(() => import('@/pages/therapist/PatientDetailPage'), 'PatientDetailPage');
const ExercisesPage = named(() => import('@/pages/therapist/ExercisesPage'), 'ExercisesPage');
const TherapistAtlasPage = named(() => import('@/pages/therapist/TherapistAtlasPage'), 'TherapistAtlasPage');
const ComplaintGuidePage = named(() => import('@/pages/therapist/ComplaintGuidePage'), 'ComplaintGuidePage');
const ComplaintReviewPage = named(() => import('@/pages/therapist/ComplaintReviewPage'), 'ComplaintReviewPage');
const ComplaintHandoutPage = named(() => import('@/pages/therapist/ComplaintHandoutPage'), 'ComplaintHandoutPage');
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
const ProgramPrintPage = named(() => import('@/pages/PrintPages'), 'ProgramPrintPage');
const PatientProgramPrintPage = named(() => import('@/pages/PrintPages'), 'PatientProgramPrintPage');
const ProgressReportPage = named(() => import('@/pages/therapist/ProgressReportPage'), 'ProgressReportPage');
const HeroPage = named(() => import('@/pages/patient/HeroPages'), 'HeroPage');
const WorldMapPage = named(() => import('@/pages/patient/WorldMapPage'), 'WorldMapPage');
const HeroSetupPage = named(() => import('@/pages/patient/HeroPages'), 'HeroSetupPage');
const HeroProfilePage = named(() => import('@/pages/patient/HeroPages'), 'HeroProfilePage');
const InventoryPage = named(() => import('@/pages/patient/HeroPages'), 'InventoryPage');
const PainCheckinPage = named(() => import('@/pages/patient/HeroPages'), 'PainCheckinPage');
const FriendsPage = named(() => import('@/pages/patient/FriendsPage'), 'FriendsPage');
const LogbookPage = named(() => import('@/pages/patient/LogbookPage'), 'LogbookPage');
const GymLogPage = named(() => import('@/pages/patient/GymLogPage'), 'GymLogPage');
const MessagesPage = named(() => import('@/pages/patient/MessagesPage'), 'MessagesPage');
const ComplaintExplanationPage = named(() => import('@/pages/patient/ComplaintExplanationPage'), 'ComplaintExplanationPage');
const MobilityTestsPage = named(() => import('@/pages/patient/MobilityTestsPage'), 'MobilityTestsPage');
const ModulePage = named(() => import('@/pages/patient/ModulePage'), 'ModulePage');
const AtlasPage = named(() => import('@/pages/patient/AtlasPage'), 'AtlasPage');
const SettingsPage = named(() => import('@/pages/patient/SettingsPage'), 'SettingsPage');
const AdminPage = named(() => import('@/pages/admin/AdminPage'), 'AdminPage');
const AdminAccountPage = named(() => import('@/pages/admin/AdminPage'), 'AdminAccountPage');

const S = ({ children }: { children: ReactNode }) => <Suspense fallback={<Spinner className="min-h-[50vh]" />}>{children}</Suspense>;

function Root() {
  return (
    <>
      <ScrollRestoration />
      <Outlet />
    </>
  );
}

/** A screen's code could not be downloaded (offline or a new version was just deployed). */
const isChunkError = (e: unknown) => e instanceof Error && /dynamically imported module|Importing a module script failed|error loading dynamically imported module|Loading chunk/i.test(e.message);

function RouteError() {
  const { t } = useI18n();
  const error = useRouteError();
  const notFound = isRouteErrorResponse(error) && error.status === 404;
  const chunk = isChunkError(error);
  useEffect(() => {
    if (!notFound && !chunk) reportError(error, 'render');
  }, [error, notFound, chunk]);
  if (notFound) return <NotFound />;
  // A screen crashed: say so (not "page not found") and offer a reload.
  if (!chunk) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
        <h1 className="text-2xl font-bold">{t('Er ging iets mis', 'Something went wrong')}</h1>
        <p className="mt-2 max-w-sm text-[15px] text-ink-600">{t('Dit scherm liep vast. Je gegevens zijn veilig en we hebben een melding gekregen. Laad de pagina opnieuw of ga terug naar het begin.', 'This screen got stuck. Your data is safe and we have been notified. Reload the page or go back to the start.')}</p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <button type="button" onClick={() => window.location.reload()} className="inline-flex min-h-[48px] items-center rounded-xl bg-accent px-5 font-semibold text-accent-ink">{t('Opnieuw laden', 'Reload')}</button>
          <a href="/" className="inline-flex min-h-[48px] items-center rounded-xl border border-line px-5 font-semibold text-ink-900">{t('Naar het begin', 'To the start')}</a>
        </div>
      </div>
    );
  }
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
      <h1 className="text-2xl font-bold">{t('Geen verbinding', 'No connection')}</h1>
      <p className="mt-2 max-w-sm text-[15px] text-ink-600">{t('Dit scherm kon niet worden geladen. Je gegevens zijn veilig. Controleer je internet en probeer het opnieuw.', 'This screen could not be loaded. Your data is safe. Check your internet and try again.')}</p>
      <button type="button" onClick={() => window.location.reload()} className="mt-5 inline-flex min-h-[48px] items-center rounded-xl bg-accent px-5 font-semibold text-accent-ink">{t('Opnieuw proberen', 'Try again')}</button>
    </div>
  );
}

function NotFound() {
  const { t } = useI18n();
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
      <div className="text-[13px] font-semibold text-accent">404</div>
      <h1 className="mt-2 text-2xl font-bold">{t('Pagina niet gevonden', 'Page not found')}</h1>
      <Link to="/" className="link mt-4">{t('Naar de homepage', 'Go to homepage')}</Link>
    </div>
  );
}

export const router = createBrowserRouter([
  {
    element: <Root />,
    errorElement: <RouteError />,
    children: [
      {
        element: <MarketingLayout />,
        children: [
          { path: '/', element: <HomePage /> },
          { path: '/functies', element: <S><FeaturesPage /></S> },
          { path: '/hoe-het-werkt', element: <S><HowItWorksPage /></S> },
          { path: '/prijzen', element: <S><PricingPage /></S> },
          { path: '/demo', element: <S><DemoPage /></S> },
          { path: '/contact', element: <S><ContactPage /></S> },
          { path: '/privacy', element: <S><PrivacyPage /></S> },
          { path: '/voorwaarden', element: <S><TermsPage /></S> },
          { path: '/cookies', element: <S><CookiesPage /></S> },
          { path: '*', element: <NotFound /> },
        ],
      },
      { path: '/login', element: <LoginPage /> },
      { path: '/aanmelden', element: <SignupPage /> },
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
          { path: 'patienten/:id/rapport', element: <S><ProgressReportPage /></S> },
          { path: 'oefeningen', element: <S><ExercisesPage /></S> },
          { path: 'spieren', element: <S><TherapistAtlasPage /></S> },
          { path: 'klachtwijzer', element: <S><RequireClinical><ComplaintGuidePage /></RequireClinical></S> },
          { path: 'klachtwijzer/controle', element: <S><RequireClinical><ComplaintReviewPage /></RequireClinical></S> },
          { path: 'klachtwijzer/uitleg', element: <S><RequireClinical><ComplaintHandoutPage /></RequireClinical></S> },
          { path: 'oefeningen/nieuw', element: <S><ExerciseFormPage /></S> },
          { path: 'oefeningen/:id', element: <S><ExerciseDetailPage /></S> },
          { path: 'oefeningen/:id/bewerken', element: <S><ExerciseFormPage /></S> },
          { path: 'programmas', element: <S><ProgramsPage /></S> },
          { path: 'programmas/nieuw', element: <S><ProgramBuilderPage key="new" /></S> },
          { path: 'programmas/:id', element: <S><ProgramBuilderPage /></S> },
          { path: 'programmas/:id/afdrukken', element: <S><ProgramPrintPage /></S> },
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
          { path: 'programma/:id/afdrukken', element: <S><PatientProgramPrintPage /></S> },
          { path: 'programma/:id/oefening/:itemId', element: <S><PatientExercisePage /></S> },
          { path: 'sessie/:id', element: <S><SessionPlayer /></S> },
          { path: 'voortgang', element: <S><PatientProgress /></S> },
          { path: 'held', element: <S><HeroPage /></S> },
          { path: 'wereld', element: <S><WorldMapPage /></S> },
          { path: 'held/nieuw', element: <S><HeroSetupPage /></S> },
          { path: 'held/uiterlijk', element: <S><HeroProfilePage /></S> },
          { path: 'held/inventaris', element: <S><InventoryPage /></S> },
          { path: 'held/pijn', element: <S><PainCheckinPage /></S> },
          { path: 'held/vrienden', element: <S><FriendsPage /></S> },
          { path: 'logboek', element: <S><LogbookPage /></S> },
          { path: 'revalidatie', element: <S><ModulePage key="revalidatie" module="revalidatie" /></S> },
          { path: 'kracht', element: <S><ModulePage key="kracht" module="kracht" /></S> },
          { path: 'mobiliteit', element: <S><ModulePage key="mobiliteit" module="mobiliteit" /></S> },
          { path: 'krachtlog', element: <S><GymLogPage /></S> },
          { path: 'mobiliteit/meten', element: <S><MobilityTestsPage /></S> },
          { path: 'berichten', element: <S><MessagesPage /></S> },
          { path: 'uitleg', element: <S><ComplaintExplanationPage /></S> },
          { path: 'spieren', element: <S><AtlasPage /></S> },
          { path: 'instellingen', element: <S><SettingsPage /></S> },
          { path: 'account', element: <S><AccountPage patient /></S> },
        ],
      },
      { path: '/admin', element: <RequireAuth kind="admin"><S><AdminPage /></S></RequireAuth> },
      { path: '/admin/account', element: <RequireAuth kind="admin"><S><AdminAccountPage /></S></RequireAuth> },
    ],
  },
]);
