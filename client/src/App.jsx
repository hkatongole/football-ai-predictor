import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import MainLayout from './layouts/MainLayout.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Home from './pages/Home.jsx';
import Matches from './pages/Matches.jsx';
import MatchDetail from './pages/MatchDetail.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Settings from './pages/Settings.jsx';
import Premium from './pages/Premium.jsx';
import InstallPrompt from './components/InstallPrompt.jsx';

// Admin panel (layout, 10 pages, chart.js) is only ever needed by
// ADMIN/SUPER_ADMIN users — lazy-loaded into its own chunk so the ~99% of
// users who never visit /admin don't pay for it in their initial bundle.
const AdminLayout = lazy(() => import('./layouts/AdminLayout.jsx'));
const Dashboard = lazy(() => import('./pages/admin/Dashboard.jsx'));
const Users = lazy(() => import('./pages/admin/Users.jsx'));
const Leagues = lazy(() => import('./pages/admin/Leagues.jsx'));
const Fixtures = lazy(() => import('./pages/admin/Fixtures.jsx'));
const Predictions = lazy(() => import('./pages/admin/Predictions.jsx'));
const Subscriptions = lazy(() => import('./pages/admin/Subscriptions.jsx'));
const News = lazy(() => import('./pages/admin/News.jsx'));
const Ads = lazy(() => import('./pages/admin/Ads.jsx'));
const ApiKeys = lazy(() => import('./pages/admin/ApiKeys.jsx'));
const Logs = lazy(() => import('./pages/admin/Logs.jsx'));
const SystemHealth = lazy(() => import('./pages/admin/SystemHealth.jsx'));

const ADMIN_ROLES = ['ADMIN', 'SUPER_ADMIN'];

function AdminFallback() {
  return <div className="p-8 text-center text-white/50 text-sm">Loading admin panel...</div>;
}

export default function App() {
  return (
    <>
      <Routes>
        <Route element={<MainLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/matches" element={<Matches />} />
          <Route path="/matches/:id" element={<MatchDetail />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/premium" element={<Premium />} />
        </Route>

        <Route
          path="/admin"
          element={
            <ProtectedRoute roles={ADMIN_ROLES}>
              <Suspense fallback={<AdminFallback />}>
                <AdminLayout />
              </Suspense>
            </ProtectedRoute>
          }
        >
          <Route index element={<Suspense fallback={<AdminFallback />}><Dashboard /></Suspense>} />
          <Route path="users" element={<Suspense fallback={<AdminFallback />}><Users /></Suspense>} />
          <Route path="leagues" element={<Suspense fallback={<AdminFallback />}><Leagues /></Suspense>} />
          <Route path="fixtures" element={<Suspense fallback={<AdminFallback />}><Fixtures /></Suspense>} />
          <Route path="predictions" element={<Suspense fallback={<AdminFallback />}><Predictions /></Suspense>} />
          <Route path="subscriptions" element={<Suspense fallback={<AdminFallback />}><Subscriptions /></Suspense>} />
          <Route path="news" element={<Suspense fallback={<AdminFallback />}><News /></Suspense>} />
          <Route path="ads" element={<Suspense fallback={<AdminFallback />}><Ads /></Suspense>} />
          <Route path="api-keys" element={<Suspense fallback={<AdminFallback />}><ApiKeys /></Suspense>} />
          <Route path="logs" element={<Suspense fallback={<AdminFallback />}><Logs /></Suspense>} />
          <Route path="system" element={<Suspense fallback={<AdminFallback />}><SystemHealth /></Suspense>} />
        </Route>
      </Routes>
      <InstallPrompt />
    </>
  );
}
