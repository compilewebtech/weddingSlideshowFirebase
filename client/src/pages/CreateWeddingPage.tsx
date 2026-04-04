import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Upload, Crown, Star } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useAuth } from '../contexts/AuthContext';
import { createWedding } from '../services/weddingService';
import { uploadGuestExcel } from '../services/rsvpApi';
import { DEFAULT_WEDDING } from '../constants/wedding';
import { SlideUploader } from '../components/SlideUploader';
import { MusicSelector } from '../components/MusicSelector';
import type { Wedding } from '../types';

export function CreateWeddingPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const submittingRef = useRef(false);
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
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [excelPreview, setExcelPreview] = useState<Array<{ firstName: string; lastName: string }>>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate('/admin/login', { replace: true });
  }, [user, authLoading, navigate]);

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="animate-pulse font-cormorant text-charcoal/60">Loading...</div>
      </div>
    );
  }

  const update = (key: keyof typeof form, value: unknown) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleExcelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setExcelFile(file);

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = new Uint8Array(ev.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        const guests = rows
          .filter((row, i) => {
            if (i === 0) {
              const first = String(row[0] || '').toLowerCase().trim();
              if (first === 'first name' || first === 'firstname' || first === 'first') return false;
            }
            return row[0] && String(row[0]).trim();
          })
          .map((row) => ({
            firstName: String(row[0]).trim(),
            lastName: String(row[1] || '').trim(),
          }));
        setExcelPreview(guests);
      } catch {
        setError('Failed to read Excel file');
        setExcelPreview([]);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || loading || submittingRef.current) return;
    if (form.package === 'gold' && !excelFile) {
      setError('Please upload a guest list Excel file for Gold package');
      return;
    }
    setError('');
    setLoading(true);
    submittingRef.current = true;
    try {
      const wedding = await createWedding(user.uid, form);
      // If Gold, upload the Excel file after creating the wedding
      if (form.package === 'gold' && excelFile) {
        await uploadGuestExcel(wedding.id, excelFile);
      }
      navigate('/admin');
    } catch (err: unknown) {
      submittingRef.current = false;
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

          {/* Package Selection */}
          <section className="bg-white p-6 rounded-lg border border-gold/20">
            <h2 className="font-montserrat text-sm tracking-widest text-gold uppercase mb-4">
              Package
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => { update('package', 'silver'); setExcelFile(null); setExcelPreview([]); }}
                className={`p-4 rounded-lg border-2 text-left transition-all ${
                  (form.package || 'silver') === 'silver'
                    ? 'border-gold bg-gold/5'
                    : 'border-charcoal/10 hover:border-charcoal/30'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Star size={20} className="text-charcoal/60" />
                  <span className="font-montserrat text-sm font-semibold uppercase tracking-wider">Silver</span>
                </div>
                <p className="font-montserrat text-xs text-charcoal/60">
                  Guests self-register via a shared invite link with OTP verification.
                </p>
              </button>
              <button
                type="button"
                onClick={() => update('package', 'gold')}
                className={`p-4 rounded-lg border-2 text-left transition-all ${
                  form.package === 'gold'
                    ? 'border-gold bg-gold/5'
                    : 'border-charcoal/10 hover:border-charcoal/30'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Crown size={20} className="text-gold" />
                  <span className="font-montserrat text-sm font-semibold uppercase tracking-wider">Gold</span>
                </div>
                <p className="font-montserrat text-xs text-charcoal/60">
                  Upload guest list from Excel. Each guest/group gets a personalized RSVP link.
                </p>
              </button>
            </div>
          </section>

          {/* Send Thank You Toggle */}
          <section className="bg-white p-6 rounded-lg border border-gold/20">
            <h2 className="font-montserrat text-sm tracking-widest text-gold uppercase mb-4">
              Thank You Notification
            </h2>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.sendThankYou || false}
                onChange={(e) => update('sendThankYou', e.target.checked)}
                className="w-5 h-5 text-gold rounded"
              />
              <div>
                <span className="font-montserrat text-sm">Send thank you email to guests after RSVP</span>
                <p className="font-montserrat text-xs text-charcoal/50 mt-1">
                  {form.package === 'gold'
                    ? 'If enabled, guests will see an email field on the RSVP form.'
                    : 'A thank you email will be sent after OTP verification.'}
                </p>
              </div>
            </label>
          </section>

          {/* Gold: Excel Upload */}
          {form.package === 'gold' && (
            <section className="bg-white p-6 rounded-lg border border-gold/20">
              <h2 className="font-montserrat text-sm tracking-widest text-gold uppercase mb-4">
                Guest List (Excel)
              </h2>
              <p className="font-montserrat text-xs text-charcoal/60 mb-4">
                Upload an Excel file with two columns: <strong>First Name</strong> and <strong>Last Name</strong>.
              </p>
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 px-4 py-2 border border-gold text-gold rounded hover:bg-gold/5 font-montserrat text-sm"
                >
                  <Upload size={16} />
                  {excelFile ? 'Change File' : 'Upload Excel'}
                </button>
                {excelFile && (
                  <span className="font-montserrat text-xs text-charcoal/60">
                    {excelFile.name} ({excelPreview.length} guests)
                  </span>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleExcelChange}
                  className="hidden"
                />
              </div>
              {excelPreview.length > 0 && (
                <div className="mt-4 max-h-48 overflow-y-auto border border-charcoal/10 rounded">
                  <table className="w-full text-sm">
                    <thead className="bg-cream sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left font-montserrat text-xs text-charcoal/60 uppercase">#</th>
                        <th className="px-3 py-2 text-left font-montserrat text-xs text-charcoal/60 uppercase">First Name</th>
                        <th className="px-3 py-2 text-left font-montserrat text-xs text-charcoal/60 uppercase">Last Name</th>
                      </tr>
                    </thead>
                    <tbody>
                      {excelPreview.map((g, i) => (
                        <tr key={i} className="border-t border-charcoal/5">
                          <td className="px-3 py-2 font-montserrat text-xs text-charcoal/40">{i + 1}</td>
                          <td className="px-3 py-2 font-montserrat text-sm">{g.firstName}</td>
                          <td className="px-3 py-2 font-montserrat text-sm">{g.lastName}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
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
                  Couple Email (RSVP notifications)
                </label>
                <input
                  type="email"
                  value={form.coupleEmail || ''}
                  onChange={(e) => update('coupleEmail', e.target.value)}
                  className="w-full px-4 py-3 border border-charcoal/20"
                  placeholder="couple@example.com"
                />
                <p className="mt-1 font-montserrat text-xs text-charcoal/50">
                  You&apos;ll receive an email each time someone submits an RSVP.
                </p>
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
                  Ceremony Location URL (Google Maps)
                </label>
                <input
                  type="url"
                  value={form.ceremonyLocationUrl || ''}
                  onChange={(e) => update('ceremonyLocationUrl', e.target.value)}
                  className="w-full px-4 py-3 border border-charcoal/20"
                  placeholder="https://maps.google.com/..."
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
              <div>
                <label className="block font-montserrat text-xs text-charcoal/70 uppercase mb-2">
                  Venue Location URL (Google Maps)
                </label>
                <input
                  type="url"
                  value={form.venueLocationUrl || ''}
                  onChange={(e) => update('venueLocationUrl', e.target.value)}
                  className="w-full px-4 py-3 border border-charcoal/20"
                  placeholder="https://maps.google.com/..."
                />
              </div>
              <div>
                <label className="block font-montserrat text-xs text-charcoal/70 uppercase mb-2">
                  Countdown Date
                </label>
                <input
                  type="date"
                  value={(form as Record<string, unknown>).countdownDate as string || ''}
                  onChange={(e) => update('countdownDate' as keyof typeof form, e.target.value)}
                  className="w-full px-4 py-3 border border-charcoal/20"
                />
                <p className="mt-1 font-montserrat text-xs text-charcoal/50">
                  A live countdown timer will display on the invitation.
                </p>
              </div>
            </div>
          </section>

          <section className="bg-white p-6 rounded-lg border border-gold/20">
            <h2 className="font-montserrat text-sm tracking-widest text-gold uppercase mb-4">
              Wedding Payment / Gift
            </h2>
            <p className="font-montserrat text-xs text-charcoal/60 mb-4">
              Optional. Guests will see this on the invitation when reserving.
            </p>
            <div className="grid gap-4">
              <div>
                <label className="block font-montserrat text-xs text-charcoal/70 uppercase mb-2">
                  Payment Option
                </label>
                <div className="flex gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="paymentType"
                      checked={(form.paymentType || '') === 'whish'}
                      onChange={() => update('paymentType', 'whish')}
                      className="text-gold"
                    />
                    <span className="font-montserrat text-sm">Whish (phone number)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="paymentType"
                      checked={(form.paymentType || '') === 'bank'}
                      onChange={() => update('paymentType', 'bank')}
                      className="text-gold"
                    />
                    <span className="font-montserrat text-sm">Wedding Bank Account</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="paymentType"
                      checked={!form.paymentType}
                      onChange={() => update('paymentType', undefined)}
                      className="text-gold"
                    />
                    <span className="font-montserrat text-sm">None</span>
                  </label>
                </div>
              </div>
              {form.paymentType === 'whish' && (
                <div>
                  <label className="block font-montserrat text-xs text-charcoal/70 uppercase mb-2">
                    Whish Phone Number
                  </label>
                  <input
                    type="tel"
                    value={form.paymentWhishPhone || ''}
                    onChange={(e) => update('paymentWhishPhone', e.target.value)}
                    className="w-full px-4 py-3 border border-charcoal/20"
                    placeholder="+961 70 123 456"
                  />
                </div>
              )}
              {form.paymentType === 'bank' && (
                <div>
                  <label className="block font-montserrat text-xs text-charcoal/70 uppercase mb-2">
                    Bank Account Number
                  </label>
                  <input
                    type="text"
                    value={form.paymentBankAccount || ''}
                    onChange={(e) => update('paymentBankAccount', e.target.value)}
                    className="w-full px-4 py-3 border border-charcoal/20"
                    placeholder="IBAN or account number"
                  />
                </div>
              )}
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
            <h2 className="font-montserrat text-sm tracking-widest text-gold uppercase mb-4">
              Slideshow Images
            </h2>
            <SlideUploader
              slides={form.slides}
              onChange={(slides) => update('slides', slides)}
              uploadPath={`wedding-slides/${user?.uid}`}
            />
          </section>

          <section className="bg-white p-6 rounded-lg border border-gold/20">
            <h2 className="font-montserrat text-sm tracking-widest text-gold uppercase mb-4">
              Music
            </h2>
            <MusicSelector
              value={form.musicUrl || ''}
              onChange={(url) => update('musicUrl', url)}
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
