import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export function LandingPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (user) {
      navigate('/admin', { replace: true });
    } else {
      navigate('/admin/login', { replace: true });
    }
  }, [user, loading, navigate]);

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center">
      <div className="animate-pulse font-cormorant text-charcoal/60">Loading...</div>
    </div>
  );
}
