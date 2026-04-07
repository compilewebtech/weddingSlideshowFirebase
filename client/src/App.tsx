import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { LandingPage } from './pages/LandingPage';
import { WeddingPage } from './pages/WeddingPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { AdminLoginPage } from './pages/AdminLoginPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { CreateWeddingPage } from './pages/CreateWeddingPage';
import { EditWeddingPage } from './pages/EditWeddingPage';
import { WeddingGuestsPage } from './pages/WeddingGuestsPage';
import { WeddingDashboardPage } from './pages/WeddingDashboardPage';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<NotFoundPage />} />
          <Route path="/wedding/:id" element={<WeddingPage />} />
          <Route path="/wedding/:id/dashboard" element={<WeddingDashboardPage />} />
          <Route path="/admin" element={<ProtectedRoute><AdminDashboardPage /></ProtectedRoute>} />
          <Route path="/admin/login" element={<AdminLoginPage />} />
          <Route path="/admin/create" element={<ProtectedRoute><CreateWeddingPage /></ProtectedRoute>} />
          <Route path="/admin/wedding/:id" element={<ProtectedRoute><EditWeddingPage /></ProtectedRoute>} />
          <Route path="/admin/wedding/:id/guests" element={<ProtectedRoute><WeddingGuestsPage /></ProtectedRoute>} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
