import React, { useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Auth from './pages/Auth';
import AdminDashboard from './pages/AdminDashboard';
import WorkerDashboard from './pages/WorkerDashboard';
import Branches from './pages/Branches';
import Reports from './pages/Reports';
import Activity from './pages/Activity';
import Settings from './pages/Settings';
import WorkerDetails from './pages/WorkerDetails';
import Unauthorized from './pages/Unauthorized';
import HowItWorks from './pages/HowItWorks';
import Sectors from './pages/Sectors';
import Infrastructure from './pages/Infrastructure';
import SyncCore from './pages/SyncCore';
import SecurityRules from './pages/SecurityRules';
import ApiDocs from './pages/ApiDocs';
import About from './pages/About';
import Enterprise from './pages/Enterprise';
import Contact from './pages/Contact';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfOps from './pages/TermsOfOps';
import { UserRole } from './types';

const ScrollToTop: React.FC = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
};

const ProtectedRoute: React.FC<{
  children: React.ReactNode;
  allowedRole?: UserRole;
}> = ({ children, allowedRole }) => {
  const { user, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-navy-900">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 rounded-full border-4 border-brand border-t-transparent animate-spin" />
          <p className="text-sm text-muted font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  if (allowedRole && profile?.role !== allowedRole) {
    return <Navigate to="/unauthorized" replace state={{ from: location }} />;
  }

  return <>{children}</>;
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <HashRouter>
        <ScrollToTop />
        <Routes>
          <Route path="/" element={<Auth />} />
          <Route path="/login" element={<Auth />} />
          <Route path="/signup" element={<Navigate to="/login" replace />} />
          <Route path="/signin" element={<Auth />} />
          <Route path="/register" element={<Navigate to="/login" replace />} />
          <Route path="/how-it-works" element={<HowItWorks />} />
          <Route path="/sectors" element={<Sectors />} />
          <Route path="/infrastructure" element={<Infrastructure />} />
          <Route path="/sync-core" element={<SyncCore />} />
          <Route path="/security-rules" element={<SecurityRules />} />
          <Route path="/api-docs" element={<ApiDocs />} />
          <Route path="/about" element={<About />} />
          <Route path="/enterprise" element={<Enterprise />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/terms-of-ops" element={<TermsOfOps />} />
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRole={UserRole.ADMIN}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/branches"
            element={
              <ProtectedRoute allowedRole={UserRole.ADMIN}>
                <Branches />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/reports"
            element={
              <ProtectedRoute allowedRole={UserRole.ADMIN}>
                <Reports />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/activity"
            element={
              <ProtectedRoute allowedRole={UserRole.ADMIN}>
                <Activity />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/settings"
            element={
              <ProtectedRoute allowedRole={UserRole.ADMIN}>
                <Settings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/workers/:uid"
            element={
              <ProtectedRoute allowedRole={UserRole.ADMIN}>
                <WorkerDetails />
              </ProtectedRoute>
            }
          />
          <Route
            path="/worker"
            element={
              <ProtectedRoute allowedRole={UserRole.WORKER}>
                <WorkerDashboard />
              </ProtectedRoute>
            }
          />
          <Route path="/unauthorized" element={<Unauthorized />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </HashRouter>
    </AuthProvider>
  );
};

export default App;
