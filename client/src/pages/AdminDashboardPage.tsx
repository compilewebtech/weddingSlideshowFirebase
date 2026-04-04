import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Settings, Users, LogOut, Trash2, Link2, Copy, Check, LayoutDashboard, Crown, Star } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useMyWeddings } from '../hooks/useWeddings';
import { deleteWedding } from '../services/weddingService';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { encodeInviteParams } from '../utils/inviteLink';
import type { Wedding } from '../types';

export function AdminDashboardPage() {
  const { user, loading: authLoading, signOut } = useAuth();
  const { weddings, loading: weddingsLoading, refetch } = useMyWeddings(user?.uid ?? null);
  const navigate = useNavigate();
  const [deleteTarget, setDeleteTarget] = useState<Wedding | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [linkModalWedding, setLinkModalWedding] = useState<Wedding | null>(null);
  const [linkGuestCount, setLinkGuestCount] = useState(3);
  const [linkCopied, setLinkCopied] = useState(false);
  const [dashboardCopiedId, setDashboardCopiedId] = useState<string | null>(null);

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

  const openLinkModal = (e: React.MouseEvent, wedding: Wedding) => {
    e.preventDefault();
    e.stopPropagation();
    setLinkModalWedding(wedding);
    setLinkGuestCount(3);
    setLinkCopied(false);
  };

  const generateAndCopyLink = async () => {
    if (!linkModalWedding) return;
    const token = encodeInviteParams({ maxGuests: linkGuestCount });
    const url = `${window.location.origin}/wedding/${linkModalWedding.id}?invite=${token}`;
    await navigator.clipboard.writeText(url);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  const closeLinkModal = () => setLinkModalWedding(null);

  const copyDashboardLink = async (e: React.MouseEvent, wedding: Wedding) => {
    e.preventDefault();
    e.stopPropagation();
    const url = `${window.location.origin}/wedding/${wedding.id}/dashboard`;
    await navigator.clipboard.writeText(url);
    setDashboardCopiedId(wedding.id);
    setTimeout(() => setDashboardCopiedId(null), 2000);
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
                      <div className="flex items-center gap-2">
                        <h3 className="font-script text-2xl text-charcoal">
                          {wedding.name || wedding.coupleNames}
                        </h3>
                        {(wedding.package || 'silver') === 'gold' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gold/10 border border-gold/30 rounded-full">
                            <Crown size={12} className="text-gold" />
                            <span className="font-montserrat text-[10px] font-semibold uppercase text-gold">Gold</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-charcoal/5 border border-charcoal/10 rounded-full">
                            <Star size={12} className="text-charcoal/40" />
                            <span className="font-montserrat text-[10px] font-semibold uppercase text-charcoal/40">Silver</span>
                          </span>
                        )}
                      </div>
                      <p className="font-cormorant text-charcoal/60 mt-1">
                        {wedding.weddingDate}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={(e) => copyDashboardLink(e, wedding)}
                        className="p-2 text-charcoal/50 hover:text-gold hover:bg-gold/10 rounded transition-colors"
                        title="Copy dashboard link for couple"
                      >
                        {dashboardCopiedId === wedding.id ? (
                          <Check size={18} className="text-green-600" />
                        ) : (
                          <LayoutDashboard size={18} />
                        )}
                      </button>
                      {/* Only show invite link generator for Silver weddings */}
                      {(wedding.package || 'silver') !== 'gold' && (
                        <button
                          type="button"
                          onClick={(e) => openLinkModal(e, wedding)}
                          className="p-2 text-charcoal/50 hover:text-gold hover:bg-gold/10 rounded transition-colors"
                          title="Generate invite link"
                        >
                          <Link2 size={18} />
                        </button>
                      )}
                    </div>
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

          <AnimatePresence>
            {linkModalWedding && (
              <motion.div
                className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={closeLinkModal}
              >
                <motion.div
                  className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full"
                  initial={{ scale: 0.95 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0.95 }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <h3 className="font-script text-2xl text-gold mb-2">Generate Invite Link</h3>
                  <p className="font-montserrat text-sm text-charcoal/70 mb-4">
                    Set the maximum number of guests for this invitation. The link will limit the guest dropdown accordingly.
                  </p>
                  <div className="mb-4">
                    <label className="block font-montserrat text-xs uppercase tracking-wider text-charcoal/70 mb-2">
                      Number of guests allowed
                    </label>
                    <select
                      value={linkGuestCount}
                      onChange={(e) => setLinkGuestCount(Number(e.target.value))}
                      className="w-full px-4 py-3 border border-charcoal/20 font-cormorant text-lg"
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                        <option key={n} value={n}>{n}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={closeLinkModal}
                      className="flex-1 py-3 border border-charcoal/20 font-montserrat text-sm"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={generateAndCopyLink}
                      className="flex-1 py-3 btn-gold text-white font-montserrat text-sm flex items-center justify-center gap-2"
                    >
                      {linkCopied ? <Check size={18} /> : <Copy size={18} />}
                      {linkCopied ? 'Copied!' : 'Generate & Copy'}
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
          </>
        )}
      </main>
    </div>
  );
}
