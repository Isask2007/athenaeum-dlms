import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { ThemeProvider } from './lib/theme.jsx';
import { ToastProvider } from './lib/toast.jsx';
import { AuthProvider, useAuth } from './lib/auth.jsx';
import { DashboardLayout, PublicLayout } from './components/layout/index.jsx';
import { Spinner } from './components/ui/index.jsx';
import HomePage from './pages/HomePage.jsx';
import CatalogPage from './pages/CatalogPage.jsx';
import ItemDetailPage from './pages/ItemDetailPage.jsx';
const ReaderPage = lazy(() => import('./pages/ReaderPage.jsx'));
import LoginPage from './pages/LoginPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import AboutPage from './pages/AboutPage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';
import AdminPage from './pages/admin/AdminPage.jsx';
import AnalyticsPage from './pages/admin/AnalyticsPage.jsx';
import CatalogManagementPage from './pages/admin/CatalogManagementPage.jsx';
import CirculationPage from './pages/admin/CirculationPage.jsx';
import UsersPage from './pages/admin/UsersPage.jsx';
import AuditLogPage from './pages/admin/AuditLogPage.jsx';
import RequestsPage from './pages/admin/RequestsPage.jsx';

function Guard({ children, staff = false }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <div className="min-h-screen"><Spinner label="Checking your library card…" /></div>;
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  if (staff && !['admin', 'librarian'].includes(user.role)) return <Navigate to="/dashboard" replace />;
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/catalog" element={<CatalogPage />} />
        <Route path="/item/:id" element={<ItemDetailPage />} />
        <Route path="/reader/:id" element={<Suspense fallback={<div className="min-h-screen"><Spinner label="Opening the reader…" /></div>}><ReaderPage /></Suspense>} />
        <Route path="/about" element={<AboutPage />} />
      </Route>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/dashboard" element={<Guard><DashboardLayout /></Guard>}>
        <Route index element={<DashboardPage />} />
      </Route>
      <Route path="/admin" element={<Guard staff><AdminPage /></Guard>}>
        <Route index element={<Navigate to="analytics" replace />} />
        <Route path="analytics" element={<AnalyticsPage />} />
        <Route path="catalog" element={<CatalogManagementPage />} />
        <Route path="circulation" element={<CirculationPage />} />
        <Route path="requests" element={<RequestsPage />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="audit" element={<AuditLogPage />} />
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider>
            <AppRoutes />
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
