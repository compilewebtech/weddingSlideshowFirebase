import { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useWedding } from '../hooks/useWeddings';
import { updateWedding, deleteWedding } from '../services/weddingService';
import { ConfirmDialog } from '../components/ConfirmDialog';
import type { Wedding, SlideImage } from '../types';

export function EditWeddingPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { wedding, loading: weddingLoading } = useWedding(id || null);
  const [form, setForm] = useState<Partial<Wedding>>({});
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) navigate('/admin/login');
  }, [user, navigate]);

  useEffect(() => {
    if (wedding) setForm(wedding);
  }, [wedding]);

  const update = (key: keyof Wedding, value: unknown) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const addSlide = () => {
    const slides = form.slides || [];
    update('slides', [...slides, { url: '', caption: '' }]);
  };

  const updateSlide = (i: number, field: keyof SlideImage, value: string) => {
    const slides = [...(form.slides || [])];
    slides[i] = { ...slides[i], [field]: value };
    update('slides', slides);
  };

  const removeSlide = (i: number) => {
    update(
      'slides',
      (form.slides || []).filter((_, idx) => idx !== i)
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !user) return;
    setError('');
    setSaving(true);
    try {
      const { id: _id, createdBy: _cb, createdAt: _ct, ...data } = form;
      await updateWedding(id, user.uid, data);
      navigate('/admin');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update wedding');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!id) return;
    setDeleting(true);
    try {
      await deleteWedding(id);
      navigate('/admin');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete wedding');
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  if (weddingLoading || !wedding) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="animate-pulse font-cormorant text-charcoal/60">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream">
      <header className="bg-white border-b border-gold/20 px-4 py-4">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <Link to="/admin" className="text-charcoal/60 hover:text-charcoal">
            <ArrowLeft size={24} />
          </Link>
          <h1 className="font-script text-2xl text-charcoal">Edit Wedding</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <form onSubmit={handleSubmit} className="space-y-8">
          {error && (
            <div className="p-4 bg-red-50 text-red-700 font-montserrat text-sm">
              {error}
            </div>
          )}

          <section className="bg-white p-6 rounded-lg border border-gold/20">
            <h2 className="font-montserrat text-sm tracking-widest text-gold uppercase mb-4">
              Basic Info
            </h2>
            <div className="grid gap-4">
              <div>
                <label className="block font-montserrat text-xs text-charcoal/70 uppercase mb-2">
                  Wedding Name
                </label>
                <input
                  value={form.name || ''}
                  onChange={(e) => update('name', e.target.value)}
                  required
                  className="w-full px-4 py-3 border border-charcoal/20"
                />
              </div>
              <div>
                <label className="block font-montserrat text-xs text-charcoal/70 uppercase mb-2">
                  Couple Names
                </label>
                <input
                  value={form.coupleNames || ''}
                  onChange={(e) => update('coupleNames', e.target.value)}
                  required
                  className="w-full px-4 py-3 border border-charcoal/20"
                />
              </div>
              <div>
                <label className="block font-montserrat text-xs text-charcoal/70 uppercase mb-2">
                  Invite Text
                </label>
                <input
                  value={form.inviteText || ''}
                  onChange={(e) => update('inviteText', e.target.value)}
                  className="w-full px-4 py-3 border border-charcoal/20"
                />
              </div>
              <div>
                <label className="block font-montserrat text-xs text-charcoal/70 uppercase mb-2">
                  Wedding Date
                </label>
                <input
                  value={form.weddingDate || ''}
                  onChange={(e) => update('weddingDate', e.target.value)}
                  className="w-full px-4 py-3 border border-charcoal/20"
                />
              </div>
              <div>
                <label className="block font-montserrat text-xs text-charcoal/70 uppercase mb-2">
                  Access Password
                </label>
                <input
                  type="password"
                  value={(form as { password?: string }).password || ''}
                  onChange={(e) => update('password' as keyof Wedding, e.target.value)}
                  className="w-full px-4 py-3 border border-charcoal/20"
                  placeholder="Leave blank to keep current • For couple to view RSVPs"
                />
              </div>
            </div>
          </section>

          <section className="bg-white p-6 rounded-lg border border-gold/20">
            <h2 className="font-montserrat text-sm tracking-widest text-gold uppercase mb-4">
              Venue & Schedule
            </h2>
            <div className="grid gap-4">
              <div>
                <label className="block font-montserrat text-xs text-charcoal/70 uppercase mb-2">
                  Full Date
                </label>
                <input
                  value={form.dateFull || ''}
                  onChange={(e) => update('dateFull', e.target.value)}
                  className="w-full px-4 py-3 border border-charcoal/20"
                />
              </div>
              <div>
                <label className="block font-montserrat text-xs text-charcoal/70 uppercase mb-2">
                  Ceremony Time
                </label>
                <input
                  value={form.ceremonyTime || ''}
                  onChange={(e) => update('ceremonyTime', e.target.value)}
                  className="w-full px-4 py-3 border border-charcoal/20"
                />
              </div>
              <div>
                <label className="block font-montserrat text-xs text-charcoal/70 uppercase mb-2">
                  Ceremony Location
                </label>
                <input
                  value={form.ceremonyLocation || ''}
                  onChange={(e) => update('ceremonyLocation', e.target.value)}
                  className="w-full px-4 py-3 border border-charcoal/20"
                />
              </div>
              <div>
                <label className="block font-montserrat text-xs text-charcoal/70 uppercase mb-2">
                  Venue Name
                </label>
                <input
                  value={form.venueName || ''}
                  onChange={(e) => update('venueName', e.target.value)}
                  className="w-full px-4 py-3 border border-charcoal/20"
                />
              </div>
              <div>
                <label className="block font-montserrat text-xs text-charcoal/70 uppercase mb-2">
                  Venue Address
                </label>
                <input
                  value={form.venueAddress || ''}
                  onChange={(e) => update('venueAddress', e.target.value)}
                  className="w-full px-4 py-3 border border-charcoal/20"
                />
              </div>
            </div>
          </section>

          <section className="bg-white p-6 rounded-lg border border-gold/20">
            <h2 className="font-montserrat text-sm tracking-widest text-gold uppercase mb-4">
              Quotes & RSVP
            </h2>
            <div className="grid gap-4">
              <div>
                <label className="block font-montserrat text-xs text-charcoal/70 uppercase mb-2">
                  Main Quote
                </label>
                <input
                  value={form.quoteText || ''}
                  onChange={(e) => update('quoteText', e.target.value)}
                  className="w-full px-4 py-3 border border-charcoal/20"
                />
              </div>
              <div>
                <label className="block font-montserrat text-xs text-charcoal/70 uppercase mb-2">
                  Quote Author
                </label>
                <input
                  value={form.quoteAuthor || ''}
                  onChange={(e) => update('quoteAuthor', e.target.value)}
                  className="w-full px-4 py-3 border border-charcoal/20"
                />
              </div>
              <div>
                <label className="block font-montserrat text-xs text-charcoal/70 uppercase mb-2">
                  RSVP Deadline
                </label>
                <input
                  value={form.rsvpDeadline || ''}
                  onChange={(e) => update('rsvpDeadline', e.target.value)}
                  className="w-full px-4 py-3 border border-charcoal/20"
                />
              </div>
              <div>
                <label className="block font-montserrat text-xs text-charcoal/70 uppercase mb-2">
                  Footer Quote
                </label>
                <input
                  value={form.footerQuote || ''}
                  onChange={(e) => update('footerQuote', e.target.value)}
                  className="w-full px-4 py-3 border border-charcoal/20"
                />
              </div>
              <div>
                <label className="block font-montserrat text-xs text-charcoal/70 uppercase mb-2">
                  Footer Quote Author
                </label>
                <input
                  value={form.footerQuoteAuthor || ''}
                  onChange={(e) => update('footerQuoteAuthor', e.target.value)}
                  className="w-full px-4 py-3 border border-charcoal/20"
                />
              </div>
            </div>
          </section>

          <section className="bg-white p-6 rounded-lg border border-gold/20">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-montserrat text-sm tracking-widest text-gold uppercase">
                Slideshow Images
              </h2>
              <button type="button" onClick={addSlide} className="text-gold font-montserrat text-sm hover:underline">
                + Add Slide
              </button>
            </div>
            <div className="space-y-4">
              {(form.slides || []).map((slide, i) => (
                <div key={i} className="flex gap-4 items-start p-4 bg-cream/50 rounded">
                  <input
                    value={slide.url}
                    onChange={(e) => updateSlide(i, 'url', e.target.value)}
                    placeholder="Image URL"
                    className="flex-1 px-4 py-2 border border-charcoal/20 text-sm"
                  />
                  <input
                    value={slide.caption}
                    onChange={(e) => updateSlide(i, 'caption', e.target.value)}
                    placeholder="Caption"
                    className="flex-1 px-4 py-2 border border-charcoal/20 text-sm"
                  />
                  <button type="button" onClick={() => removeSlide(i)} className="text-red-600 text-sm">
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </section>

          <section className="bg-white p-6 rounded-lg border border-gold/20">
            <h2 className="font-montserrat text-sm tracking-widest text-gold uppercase mb-4">
              Music
            </h2>
            <input
              value={form.musicUrl || ''}
              onChange={(e) => update('musicUrl', e.target.value)}
              className="w-full px-4 py-3 border border-charcoal/20"
            />
          </section>

          <div className="flex flex-wrap gap-4 items-center">
            <button
              type="submit"
              disabled={saving}
              className="px-8 py-3 btn-gold text-white font-montserrat text-sm tracking-widest uppercase disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            <Link to="/admin" className="px-8 py-3 border border-charcoal/20 font-montserrat text-sm">
              Cancel
            </Link>
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              disabled={saving}
              className="px-8 py-3 border border-red-200 text-red-600 font-montserrat text-sm hover:bg-red-50 transition-colors disabled:opacity-50 ml-auto"
            >
              Delete Wedding
            </button>
          </div>
        </form>

        <ConfirmDialog
          open={showDeleteConfirm}
          title="Delete Wedding"
          message={`Are you sure you want to delete "${wedding?.name || wedding?.coupleNames}"? This will permanently remove the wedding and all RSVPs.`}
          confirmLabel="Delete"
          cancelLabel="Cancel"
          variant="danger"
          loading={deleting}
          onConfirm={handleDeleteConfirm}
          onCancel={() => !deleting && setShowDeleteConfirm(false)}
        />
      </main>
    </div>
  );
}
