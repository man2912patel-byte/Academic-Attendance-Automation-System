import React, { useContext } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, AuthContext } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';

// Import real styled pages
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import Generate from './pages/Generate';
import History from './pages/History';
import Reports from './pages/Reports';

// Layout wrapper
import Layout from './components/Layout';

// Component to protect routes requiring authentication
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useContext(AuthContext);
  
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-bg-main text-text-primary text-lg font-semibold">
        <div className="flex flex-col items-center gap-3">
          <span className="w-10 h-10 border-4 border-accent-blue/30 border-t-accent-blue rounded-full animate-spin"></span>
          <span className="text-text-secondary text-sm font-medium">Loading session...</span>
        </div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  return <Layout>{children}</Layout>;
};

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
      <Route path="/generate" element={<ProtectedRoute><Generate /></ProtectedRoute>} />
      <Route path="/history" element={<ProtectedRoute><History /></ProtectedRoute>} />
      <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <div className="min-h-screen bg-bg-main flex flex-col select-none text-text-primary">
          <main className="flex-grow flex flex-col relative z-10">
            <AppRoutes />
          </main>
        </div>
      </ToastProvider>
    </AuthProvider>
  );
}
