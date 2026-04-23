import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
import LoginPage from "@/pages/LoginPage";
import HomePage from "@/pages/HomePage";
import ProfilePage from "@/pages/ProfilePage";
import AdminPage from "@/pages/AdminPage";
import DashboardFormPage from "@/pages/DashboardFormPage";
import DashboardDetailPage from "@/pages/DashboardDetailPage";
import KioskPage from "@/pages/KioskPage";

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-primary">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin" />
        <p className="text-white/70 text-sm font-medium">Carregando...</p>
      </div>
    </div>
  );
}

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  return user ? children : <Navigate to="/login" replace />;
}

function AdminRoute({ children }) {
  const { user, isAdmin, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/home" replace />;
  return children;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? <Navigate to="/home" replace /> : children;
}

import SessionTracker from "@/components/SessionTracker";
import ProfileSetupModal from "@/components/ProfileSetupModal";
import ErrorBoundary from "@/components/ErrorBoundary";

function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        }
      />
      <Route
        path="/home"
        element={
          <PrivateRoute>
            <ErrorBoundary>
              <HomePage />
            </ErrorBoundary>
          </PrivateRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <PrivateRoute>
            <ErrorBoundary>
              <ProfilePage />
            </ErrorBoundary>
          </PrivateRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <AdminRoute>
            <ErrorBoundary>
              <AdminPage />
            </ErrorBoundary>
          </AdminRoute>
        }
      />
      <Route
        path="/admin/dashboard/create"
        element={
          <AdminRoute>
            <ErrorBoundary>
              <DashboardFormPage />
            </ErrorBoundary>
          </AdminRoute>
        }
      />
      <Route
        path="/admin/dashboard/:id/edit"
        element={
          <AdminRoute>
            <ErrorBoundary>
              <DashboardFormPage />
            </ErrorBoundary>
          </AdminRoute>
        }
      />
      <Route
        path="/dashboard/:id"
        element={
          <PrivateRoute>
            <ErrorBoundary>
              <DashboardDetailPage />
            </ErrorBoundary>
          </PrivateRoute>
        }
      />
      <Route
        path="/kiosk"
        element={
          <PrivateRoute>
            <KioskPage />
          </PrivateRoute>
        }
      />
      <Route path="*" element={<Navigate to="/home" replace />} />
    </Routes>
  );
}

export function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <SessionTracker />
          <ProfileSetupModal />
          <AppRoutes />
          <Toaster richColors position="top-right" />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
