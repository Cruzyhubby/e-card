import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import AppShell from './components/layout/AppShell';
import { PageLoader } from './components/ui/Skeleton';
import LoginPage from './pages/LoginPage';
import ChangePasswordPage from './pages/ChangePasswordPage';
import DashboardPage from './pages/DashboardPage';
import EventStudioPage from './pages/EventStudioPage';
import GateLogsPage from './pages/GateLogsPage';
import UshersPage from './pages/UshersPage';
import UsherShiftsPage from './pages/UsherShiftsPage';
import SettingsPage from './pages/SettingsPage';
import PublicInvitationPage from './pages/PublicInvitationPage';
import PublicDesignReviewPage from './pages/PublicDesignReviewPage';
import PlatformOverviewPage from './pages/PlatformOverviewPage';
import OrganizersPage from './pages/OrganizersPage';
import ReportsPage from './pages/ReportsPage';
import AuditLogsPage from './pages/AuditLogsPage';
import PlatformSettingsPage from './pages/PlatformSettingsPage';
import AccountPage from './pages/AccountPage';

function RequireAuth({ children }) {
  const { user, isAuthenticated, booting } = useAuth();
  const location = useLocation();

  if (booting) return <PageLoader label="Restoring your session" />;
  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (user?.must_change_password && location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />;
  }
  return children;
}

function GuestOnly({ children }) {
  const { user, isAuthenticated, booting } = useAuth();
  if (booting) return <PageLoader label="Loading Fahari" />;
  if (isAuthenticated) return <Navigate to={user?.must_change_password ? '/change-password' : '/'} replace />;
  return children;
}

function RequireRole({ roles, children }) {
  const { user } = useAuth();
  if (!user || !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

function HomeRoute() {
  const { user } = useAuth();
  if (user?.role === 'super_admin') return <PlatformOverviewPage />;
  return <DashboardPage />;
}

function NotFound() {
  return (
    <div className="flex min-h-dvh items-center justify-center px-5">
      <div className="panel max-w-md p-8 text-center">
        <p className="font-serif text-6xl text-white">404</p>
        <p className="mt-2 text-sm text-slate-400">That page could not be found.</p>
        <a href="#/" className="btn-primary mt-5">
          Back to dashboard
        </a>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <Routes>
          <Route path="/i/:token" element={<PublicInvitationPage />} />
          <Route path="/d/:token" element={<PublicDesignReviewPage />} />
          <Route
            path="/login"
            element={
              <GuestOnly>
                <LoginPage />
              </GuestOnly>
            }
          />
          <Route
            path="/change-password"
            element={
              <RequireAuth>
                <ChangePasswordPage />
              </RequireAuth>
            }
          />
          <Route
            element={
              <RequireAuth>
                <AppShell />
              </RequireAuth>
            }
          >
            <Route path="/" element={<HomeRoute />} />
            <Route
              path="/events/:eventId"
              element={
                <RequireRole roles={['organizer']}>
                  <EventStudioPage />
                </RequireRole>
              }
            />
            <Route
              path="/ushers"
              element={
                <RequireRole roles={['organizer']}>
                  <UshersPage />
                </RequireRole>
              }
            />
            <Route
              path="/usher-shifts"
              element={
                <RequireRole roles={['organizer']}>
                  <UsherShiftsPage />
                </RequireRole>
              }
            />
            <Route
              path="/gate-logs"
              element={
                <RequireRole roles={['organizer']}>
                  <GateLogsPage />
                </RequireRole>
              }
            />
            <Route
              path="/settings"
              element={
                <RequireRole roles={['organizer']}>
                  <SettingsPage />
                </RequireRole>
              }
            />
            <Route
              path="/organizers"
              element={
                <RequireRole roles={['super_admin']}>
                  <OrganizersPage />
                </RequireRole>
              }
            />
            <Route
              path="/reports"
              element={
                <RequireRole roles={['super_admin']}>
                  <ReportsPage />
                </RequireRole>
              }
            />
            <Route
              path="/audit-logs"
              element={
                <RequireRole roles={['super_admin']}>
                  <AuditLogsPage />
                </RequireRole>
              }
            />
            <Route
              path="/account"
              element={
                <RequireRole roles={['super_admin']}>
                  <AccountPage />
                </RequireRole>
              }
            />
            <Route
              path="/admin/settings"
              element={
                <RequireRole roles={['super_admin']}>
                  <PlatformSettingsPage />
                </RequireRole>
              }
            />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </ToastProvider>
    </AuthProvider>
  );
}
