import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { LandingPage } from './pages/LandingPage';
import { WeddingPage } from './pages/WeddingPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { AdminLoginPage } from './pages/AdminLoginPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { CreateWeddingPage } from './pages/CreateWeddingPage';
import { EditWeddingPage } from './pages/EditWeddingPage';
import { WeddingGuestsPage } from './pages/WeddingGuestsPage';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/wedding/:id" element={<WeddingPage />} />
          <Route path="/admin" element={<AdminDashboardPage />} />
          <Route path="/admin/login" element={<AdminLoginPage />} />
          <Route path="/admin/create" element={<CreateWeddingPage />} />
          <Route path="/admin/wedding/:id" element={<EditWeddingPage />} />
          <Route path="/admin/wedding/:id/guests" element={<WeddingGuestsPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
