import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, Settings, Users, LogOut, Trash2, Link2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useMyWeddings } from '../hooks/useWeddings';
import { deleteWedding } from '../services/weddingService';
import { ConfirmDialog } from '../components/ConfirmDialog';
import type { Wedding } from '../types';

export function AdminDashboardPage() {
  const { user, loading: authLoading, signOut } = useAuth();
  const { weddings, loading: weddingsLoading, refetch } = useMyWeddings(user?.uid ?? null);
  const navigate = useNavigate();
  const [deleteTarget, setDeleteTarget] = useState<Wedding | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/admin/login');
    }
  }, [user, authLoading, navigate]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const handleDeleteClick = (e: React.MouseEvent, wedding: Wedding) => {
    e.preventDefault();
    e.stopPropagation();
    setDeleteTarget(wedding);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteWedding(deleteTarget.id);
      setDeleteTarget(null);
      refetch();
    } catch (err) {
      console.error('Failed to delete wedding:', err);
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    if (!deleting) setDeleteTarget(null);
  };

  const copyWeddingLink = (e: React.MouseEvent, weddingId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const url = `${window.location.origin}/wedding/${weddingId}`;
    navigator.clipboard.writeText(url);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="animate-pulse font-cormorant text-charcoal/60">Loading...</div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-cream">
      <header className="bg-white border-b border-gold/20 px-4 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <h1 className="font-script text-3xl text-charcoal">Admin Dashboard</h1>
          <div className="flex items-center gap-4">
            <span className="font-montserrat text-sm text-charcoal/60">
              {user.email}
            </span>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 px-4 py-2 text-charcoal/60 hover:text-charcoal font-montserrat text-sm"
            >
              <LogOut size={18} />
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-12">
        <div className="flex items-center justify-between mb-8">
          <h2 className="font-cormorant text-2xl text-charcoal">Your Weddings</h2>
          <Link
            to="/admin/create"
            className="flex items-center gap-2 px-6 py-3 btn-gold text-white font-montserrat text-sm tracking-widest uppercase"
          >
            <Plus size={20} />
            Create Wedding
          </Link>
        </div>

        {weddingsLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 bg-charcoal/5 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : weddings.length === 0 ? (
          <motion.div
            className="text-center py-16 bg-white border border-gold/20 rounded-lg"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <p className="font-cormorant text-xl text-charcoal/60 mb-6">
              You haven't created any weddings yet.
            </p>
            <Link
              to="/admin/create"
              className="inline-flex items-center gap-2 px-6 py-3 btn-gold text-white font-montserrat text-sm tracking-widest uppercase"
            >
              <Plus size={20} />
              Create your first wedding
            </Link>
          </motion.div>
        ) : (
          <>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {weddings.map((wedding, index) => (
              <motion.div
                key={wedding.id}
                className="bg-white border border-gold/20 rounded-lg overflow-hidden hover:shadow-xl transition-all relative group"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <div
                  className="h-32 bg-cover bg-center"
                  style={{
                    backgroundImage: wedding.slides?.[0]?.url
                      ? `url(${wedding.slides[0].url})`
                      : 'linear-gradient(135deg, #c9a961 0%, #e8d5a3 100%)',
                  }}
                />
                <div className="p-6">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-script text-2xl text-charcoal">
                        {wedding.name || wedding.coupleNames}
                      </h3>
                      <p className="font-cormorant text-charcoal/60 mt-1">
                        {wedding.weddingDate}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => copyWeddingLink(e, wedding.id)}
                      className="p-2 text-charcoal/50 hover:text-gold hover:bg-gold/10 rounded transition-colors"
                      title="Copy wedding link"
                    >
                      <Link2 size={18} />
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-3 mt-4">
                    <Link
                      to={`/wedding/${wedding.id}`}
                      className="flex-1 flex items-center justify-center gap-2 py-2 border border-gold/40 text-gold font-montserrat text-xs uppercase hover:bg-gold/10 transition-colors min-w-0"
                    >
                      View
                    </Link>
                    <Link
                      to={`/admin/wedding/${wedding.id}`}
                      className="flex-1 flex items-center justify-center gap-2 py-2 border border-gold/40 text-gold font-montserrat text-xs uppercase hover:bg-gold/10 transition-colors min-w-0"
                    >
                      <Settings size={14} />
                      Edit
                    </Link>
                    <Link
                      to={`/admin/wedding/${wedding.id}/guests`}
                      className="flex-1 flex items-center justify-center gap-2 py-2 border border-gold/40 text-gold font-montserrat text-xs uppercase hover:bg-gold/10 transition-colors min-w-0"
                    >
                      <Users size={14} />
                      Guests
                    </Link>
                    <button
                      type="button"
                      onClick={(e) => handleDeleteClick(e, wedding)}
                      className="flex items-center justify-center gap-2 py-2 px-3 border border-red-200 text-red-600 font-montserrat text-xs uppercase hover:bg-red-50 transition-colors"
                      title="Delete wedding"
                    >
                      <Trash2 size={14} />
                      Delete
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          <ConfirmDialog
            open={!!deleteTarget}
            title="Delete Wedding"
            message={`Are you sure you want to delete "${deleteTarget?.name || deleteTarget?.coupleNames}"? This will permanently remove the wedding and all RSVPs.`}
            confirmLabel="Delete"
            cancelLabel="Cancel"
            variant="danger"
            loading={deleting}
            onConfirm={handleDeleteConfirm}
            onCancel={handleDeleteCancel}
          />
          </>
        )}
      </main>
    </div>
  );
}
