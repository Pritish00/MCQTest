import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { ThemeProvider } from '@/context/ThemeContext';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import Dashboard from '@/pages/Dashboard';
import CreateTest from '@/pages/CreateTest';
import TestDetail from '@/pages/TestDetail';
import TestEntry from '@/pages/TestEntry';
import TakeTest from '@/pages/TakeTest';
import ForgotPassword from '@/pages/ForgotPassword';
import AdminLayout from '@/components/AdminLayout';
import { ReactNode } from 'react';

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

function GuestRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  return !isAuthenticated ? <>{children}</> : <Navigate to="/dashboard" replace />;
}

function App() {
  return (
    <ThemeProvider>
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
        <Routes>
          {/* Guest routes */}
          <Route path="/login" element={<GuestRoute><Login /></GuestRoute>} />
          <Route path="/forgot-password" element={<GuestRoute><ForgotPassword /></GuestRoute>} />
          <Route path="/setup/:secret" element={<GuestRoute><Register /></GuestRoute>} />

          {/* Admin routes */}
          <Route path="/dashboard" element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
            <Route index element={<Dashboard />} />
            <Route path="create-test" element={<CreateTest />} />
            <Route path="test/:testId" element={<TestDetail />} />
          </Route>

          {/* Candidate routes */}
          <Route path="/test/:testId" element={<TestEntry />} />
          <Route path="/test/:testId/take" element={<TakeTest />} />

          {/* Default */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
