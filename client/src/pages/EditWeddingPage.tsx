import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Upload, Crown, Star } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useAuth } from '../contexts/AuthContext';
import { useWedding } from '../hooks/useWeddings';
import { updateWedding, deleteWedding } from '../services/weddingService';
import { uploadGuestExcel } from '../services/rsvpApi';
import { useGuests } from '../hooks/useGuests';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { SlideUploader } from '../components/SlideUploader';
import { MusicSelector } from '../components/MusicSelector';
import type { Wedding } from '../types';

export function EditWeddingPage() {
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { wedding, loading: weddingLoading } = useWedding(id || null);
  const [form, setForm] = useState<Partial<Wedding>>({});
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState('');
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [excelPreview, setExcelPreview] = useState<Array<{ firstName: string; lastName: string }>>([]);
  const [uploadResult, setUploadResult] = useState<{ added: number; preserved: number; removed: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { stats } = useGuests(id || null);
  const isGold = (form.package || 'silver') === 'gold';

  useEffect(() => {
    if (!authLoading && !user) navigate('/admin/login', { replace: true });
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (wedding) setForm(wedding);
  }, [wedding]);

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="animate-pulse font-cormorant text-charcoal/60">Loading...</div>
      </div>
    );
  }

  const update = (key: keyof Wedding, value: unknown) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleExcelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setExcelFile(file);
    setUploadResult(null);

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
    if (!id || !user) return;
    setError('');
    setSaving(true);
    try {
      const { id: _id, createdBy: _cb, createdAt: _ct, ...data } = form;
      await updateWedding(id, user.uid, data);
      // If Gold and Excel file uploaded, process it
      if (isGold && excelFile) {
        const result = await uploadGuestExcel(id, excelFile);
        setUploadResult({ added: result.added, preserved: result.preserved, removed: result.removed });
        setExcelFile(null);
        setExcelPreview([]);
      }
      if (!excelFile) navigate('/admin');
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

          {/* Package Badge (read-only) */}
          <section className="bg-white p-6 rounded-lg border border-gold/20">
            <h2 className="font-montserrat text-sm tracking-widest text-gold uppercase mb-4">
              Package
            </h2>
            <div className="flex items-center gap-3">
              {isGold ? (
                <div className="flex items-center gap-2 px-4 py-2 bg-gold/10 border border-gold/30 rounded-lg">
                  <Crown size={18} className="text-gold" />
                  <span className="font-montserrat text-sm font-semibold uppercase tracking-wider text-gold">Gold</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 px-4 py-2 bg-charcoal/5 border border-charcoal/15 rounded-lg">
                  <Star size={18} className="text-charcoal/60" />
                  <span className="font-montserrat text-sm font-semibold uppercase tracking-wider text-charcoal/70">Silver</span>
                </div>
              )}
              <span className="font-montserrat text-xs text-charcoal/40">Cannot be changed after creation</span>
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
                  {isGold
                    ? 'If enabled, guests will see an email field on the RSVP form.'
                    : 'A thank you email will be sent after OTP verification.'}
                </p>
              </div>
            </label>
          </section>

          {/* Gold: Excel Re-upload */}
          {isGold && (
            <section className="bg-white p-6 rounded-lg border border-gold/20">
              <h2 className="font-montserrat text-sm tracking-widest text-gold uppercase mb-4">
                Guest List (Excel)
              </h2>
              <p className="font-montserrat text-xs text-charcoal/60 mb-2">
                Current guests: <strong>{stats.totalGuests}</strong> total
                {stats.attending > 0 && <>, <strong>{stats.attending}</strong> responded</>}
              </p>
              <p className="font-montserrat text-xs text-amber-600 mb-4">
                Re-uploading will preserve guests who already responded. Only pending guests may be replaced.
              </p>
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 px-4 py-2 border border-gold text-gold rounded hover:bg-gold/5 font-montserrat text-sm"
                >
                  <Upload size={16} />
                  {excelFile ? 'Change File' : 'Re-upload Excel'}
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
              {uploadResult && (
                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded font-montserrat text-sm text-green-700">
                  Upload complete: {uploadResult.added} added, {uploadResult.preserved} preserved, {uploadResult.removed} removed.
                </div>
              )}
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
                  value={form.countdownDate || ''}
                  onChange={(e) => update('countdownDate' as keyof Wedding, e.target.value)}
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
            <h2 className="font-montserrat text-sm tracking-widest text-gold uppercase mb-4">
              Slideshow Images
            </h2>
            <SlideUploader
              slides={form.slides || []}
              onChange={(slides) => update('slides', slides)}
              uploadPath={`wedding-slides/${id}`}
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
