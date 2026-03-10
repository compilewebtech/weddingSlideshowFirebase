import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { createWedding } from '../services/weddingService';
import { DEFAULT_WEDDING } from '../constants/wedding';
import type { Wedding, SlideImage } from '../types';

export function CreateWeddingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState<Omit<Wedding, 'id' | 'createdBy' | 'createdAt'> & { password?: string }>({
    ...DEFAULT_WEDDING,
    name: '',
    coupleNames: '',
    weddingDate: '',
    dateFull: '',
    ceremonyTime: '',
    venueName: '',
    venueAddress: '',
  });

  useEffect(() => {
    if (!user) navigate('/admin/login');
  }, [user, navigate]);

  const update = (key: keyof typeof form, value: unknown) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const addSlide = () => {
    update('slides', [...form.slides, { url: '', caption: '' }]);
  };

  const updateSlide = (i: number, field: keyof SlideImage, value: string) => {
    const slides = [...form.slides];
    slides[i] = { ...slides[i], [field]: value };
    update('slides', slides);
  };

  const removeSlide = (i: number) => {
    update(
      'slides',
      form.slides.filter((_, idx) => idx !== i)
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || loading) return;
    setError('');
    setLoading(true);
    try {
      const wedding = await createWedding(user.uid, form);
      navigate(`/admin/wedding/${wedding.id}`);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : typeof err === 'object' && err !== null && 'message' in err
            ? String((err as { message: unknown }).message)
            : 'Failed to create wedding. Check Firestore rules are deployed.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-cream">
      <header className="bg-white border-b border-gold/20 px-4 py-4">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <Link to="/admin" className="text-charcoal/60 hover:text-charcoal">
            <ArrowLeft size={24} />
          </Link>
          <h1 className="font-script text-2xl text-charcoal">Create Wedding</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <form onSubmit={handleSubmit} className="space-y-8">
          {error && (
            <div className="p-4 bg-red-50 text-red-700 font-montserrat text-sm rounded-lg border border-red-200" role="alert">
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
                  Wedding Name (e.g. Tony & Natasha)
                </label>
                <input
                  value={form.name}
                  onChange={(e) => update('name', e.target.value)}
                  required
                  className="w-full px-4 py-3 border border-charcoal/20"
                  placeholder="Tony & Natasha"
                />
              </div>
              <div>
                <label className="block font-montserrat text-xs text-charcoal/70 uppercase mb-2">
                  Couple Names (for invitation)
                </label>
                <input
                  value={form.coupleNames}
                  onChange={(e) => update('coupleNames', e.target.value)}
                  required
                  className="w-full px-4 py-3 border border-charcoal/20"
                  placeholder="Sarah & Gaby"
                />
              </div>
              <div>
                <label className="block font-montserrat text-xs text-charcoal/70 uppercase mb-2">
                  Invite Text
                </label>
                <input
                  value={form.inviteText}
                  onChange={(e) => update('inviteText', e.target.value)}
                  className="w-full px-4 py-3 border border-charcoal/20"
                  placeholder="are getting married"
                />
              </div>
              <div>
                <label className="block font-montserrat text-xs text-charcoal/70 uppercase mb-2">
                  Wedding Date (short)
                </label>
                <input
                  value={form.weddingDate}
                  onChange={(e) => update('weddingDate', e.target.value)}
                  className="w-full px-4 py-3 border border-charcoal/20"
                  placeholder="December 21st, 2026"
                />
              </div>
              <div>
                <label className="block font-montserrat text-xs text-charcoal/70 uppercase mb-2">
                  Access Password *
                </label>
                <input
                  type="password"
                  value={(form as { password?: string }).password || ''}
                  onChange={(e) => update('password' as keyof typeof form, e.target.value)}
                  required
                  minLength={4}
                  className="w-full px-4 py-3 border border-charcoal/20"
                  placeholder="For couple to view RSVPs & insights"
                />
                <p className="mt-1 font-montserrat text-xs text-charcoal/50">
                  Share this password with the couple so they can access their guest list.
                </p>
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
                  value={form.dateFull}
                  onChange={(e) => update('dateFull', e.target.value)}
                  className="w-full px-4 py-3 border border-charcoal/20"
                  placeholder="Saturday, December 21st, 2026"
                />
              </div>
              <div>
                <label className="block font-montserrat text-xs text-charcoal/70 uppercase mb-2">
                  Ceremony Time
                </label>
                <input
                  value={form.ceremonyTime}
                  onChange={(e) => update('ceremonyTime', e.target.value)}
                  className="w-full px-4 py-3 border border-charcoal/20"
                  placeholder="Ceremony at 4:00 PM"
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
                  placeholder="Saint Nicholas Church, Zouk Mosbeh, Lebanon"
                />
              </div>
              <div>
                <label className="block font-montserrat text-xs text-charcoal/70 uppercase mb-2">
                  Venue Name
                </label>
                <input
                  value={form.venueName}
                  onChange={(e) => update('venueName', e.target.value)}
                  className="w-full px-4 py-3 border border-charcoal/20"
                  placeholder="Stone Restaurant"
                />
              </div>
              <div>
                <label className="block font-montserrat text-xs text-charcoal/70 uppercase mb-2">
                  Venue Address
                </label>
                <input
                  value={form.venueAddress}
                  onChange={(e) => update('venueAddress', e.target.value)}
                  className="w-full px-4 py-3 border border-charcoal/20"
                  placeholder="Zouk Mkayel, Lebanon"
                />
              </div>
            </div>
          </section>

          <section className="bg-white p-6 rounded-lg border border-gold/20">
            <h2 className="font-montserrat text-sm tracking-widest text-gold uppercase mb-4">
              Quotes
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
                  placeholder="Two souls with but a single thought..."
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
                  placeholder="John Keats"
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
                  placeholder="November 21st, 2026"
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
                  placeholder="I have found the one whom my soul loves."
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
                  placeholder="Song of Solomon 3:4"
                />
              </div>
            </div>
          </section>

          <section className="bg-white p-6 rounded-lg border border-gold/20">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-montserrat text-sm tracking-widest text-gold uppercase">
                Slideshow Images
              </h2>
              <button
                type="button"
                onClick={addSlide}
                className="text-gold font-montserrat text-sm hover:underline"
              >
                + Add Slide
              </button>
            </div>
            <div className="space-y-4">
              {form.slides.map((slide, i) => (
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
                  <button
                    type="button"
                    onClick={() => removeSlide(i)}
                    className="text-red-600 text-sm"
                  >
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
              placeholder="/path/to/music.mp3"
              className="w-full px-4 py-3 border border-charcoal/20"
            />
          </section>

          <div className="flex gap-4">
            <button
              type="submit"
              disabled={loading}
              className="px-8 py-3 btn-gold text-white font-montserrat text-sm tracking-widest uppercase disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : 'Create Wedding'}
            </button>
            <Link
              to="/admin"
              className="px-8 py-3 border border-charcoal/20 font-montserrat text-sm"
            >
              Cancel
            </Link>
          </div>
        </form>
      </main>
    </div>
  );
}
