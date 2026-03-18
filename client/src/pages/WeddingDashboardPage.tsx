import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  FileSpreadsheet,
  Users,
  CheckCircle,
  XCircle,
  HelpCircle,
  Eye,
  EyeOff,
  RefreshCw,
} from 'lucide-react';
import { useWedding } from '../hooks/useWeddings';
import { useGuests } from '../hooks/useGuests';
import { resetOtp } from '../services/rsvpApi';
import { WeddingProvider } from '../contexts/WeddingContext';
import { useAuth } from '../contexts/AuthContext';
import { hashPassword } from '../utils/password';
import {
  isWeddingAuthenticated,
  setWeddingAuthenticated,
  clearWeddingAuth,
} from '../utils/password';

function DashboardContent() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { wedding } = useWedding(id || null);
  const { guests, exportToExcel, stats } = useGuests(id || null);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState('');
  const [checking, setChecking] = useState(false);
  const [resettingEmail, setResettingEmail] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState<string | null>(null);

  const handleResetOtp = async (email: string) => {
    if (!id || !email || resettingEmail) return;
    setResettingEmail(email);
    setResetSuccess(null);
    try {
      await resetOtp(id, email);
      setResetSuccess(email);
      setTimeout(() => setResetSuccess(null), 3000);
    } catch (err) {
      console.error('Reset OTP failed:', err);
    } finally {
      setResettingEmail(null);
    }
  };

  const isCreator = user && wedding?.createdBy === user.uid;
  const hasPasswordAuth = wedding?.id && isWeddingAuthenticated(wedding.id);
  const isAuthenticated = isCreator || hasPasswordAuth;
  const needsPassword = !isAuthenticated && !!wedding?.passwordHash;
  const noAccessMethod = !isAuthenticated && !wedding?.passwordHash;

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wedding?.id || !wedding.passwordHash) return;
    setAuthError('');
    setChecking(true);
    try {
      const hash = await hashPassword(password);
      if (hash === wedding.passwordHash) {
        setWeddingAuthenticated(wedding.id);
        setPassword('');
      } else {
        setAuthError('Incorrect password');
      }
    } catch {
      setAuthError('Something went wrong');
    } finally {
      setChecking(false);
    }
  };

  const handleLogout = () => {
    if (wedding?.id) clearWeddingAuth(wedding.id);
    setPassword('');
    setAuthError('');
  };

  if (!wedding) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="animate-pulse font-cormorant text-charcoal/60">Loading...</div>
      </div>
    );
  }

  if (noAccessMethod) {
    return (
      <div className="min-h-screen bg-cream">
        <header className="bg-white border-b border-gold/20 px-4 py-4">
          <div className="max-w-6xl mx-auto">
            <Link to={`/wedding/${wedding.id}`} className="text-charcoal/60 hover:text-charcoal inline-flex items-center gap-2">
              <ArrowLeft size={20} />
              <span className="font-montserrat text-sm">Back to invitation</span>
            </Link>
          </div>
        </header>
        <main className="max-w-md mx-auto px-4 py-16 text-center">
          <h1 className="font-script text-4xl text-gold mb-6">Guest Dashboard</h1>
          <p className="font-cormorant text-lg text-charcoal/70">
            Access has not been set up for this wedding. Contact the organizer.
          </p>
          <Link
            to={`/wedding/${wedding.id}`}
            className="mt-6 inline-block px-6 py-3 border border-gold/40 text-gold font-montserrat text-sm uppercase hover:bg-gold/10 transition-colors"
          >
            View Invitation
          </Link>
        </main>
      </div>
    );
  }

  if (needsPassword) {
    return (
      <div className="min-h-screen bg-cream">
        <header className="bg-white border-b border-gold/20 px-4 py-4">
          <div className="max-w-6xl mx-auto">
            <Link to={`/wedding/${wedding.id}`} className="text-charcoal/60 hover:text-charcoal inline-flex items-center gap-2">
              <ArrowLeft size={20} />
              <span className="font-montserrat text-sm">Back to invitation</span>
            </Link>
          </div>
        </header>
        <main className="max-w-md mx-auto px-4 py-16">
          <h1 className="font-script text-4xl text-gold text-center mb-6">Guest Dashboard</h1>
          <p className="font-cormorant text-lg text-charcoal/70 text-center mb-8">
            Enter your password to view RSVPs and insights.
          </p>
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setAuthError('');
                }}
                placeholder="Enter password"
                className="w-full px-4 py-3 pr-12 border border-charcoal/20 font-montserrat"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-charcoal/50"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            {authError && <p className="text-red-600 text-sm">{authError}</p>}
            <button
              type="submit"
              disabled={checking || !password}
              className="w-full py-3 btn-gold text-white font-montserrat text-sm tracking-widest uppercase disabled:opacity-50"
            >
              {checking ? 'Checking...' : 'Access Dashboard'}
            </button>
          </form>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream">
      <header className="bg-white border-b border-gold/20 px-4 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <Link to={`/wedding/${wedding.id}`} className="text-charcoal/60 hover:text-charcoal inline-flex items-center gap-2">
            <ArrowLeft size={20} />
            <span className="font-montserrat text-sm">Back to invitation</span>
          </Link>
          {hasPasswordAuth && (
            <button
              onClick={handleLogout}
              className="text-charcoal/50 hover:text-charcoal font-montserrat text-xs"
            >
              Log out
            </button>
          )}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="font-script text-3xl text-charcoal">
            {wedding.name || wedding.coupleNames}
          </h1>
          <p className="font-montserrat text-sm text-charcoal/60">RSVP Dashboard</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-white p-4 rounded-lg border border-gold/20 text-center">
            <Users className="w-8 h-8 mx-auto text-gold mb-2" />
            <p className="font-cormorant text-2xl text-charcoal">{stats.totalGuests}</p>
            <p className="font-montserrat text-xs text-charcoal/60 uppercase">Total RSVPs</p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg text-center">
            <CheckCircle className="w-8 h-8 mx-auto text-green-600 mb-2" />
            <p className="font-cormorant text-2xl text-charcoal">{stats.attending}</p>
            <p className="font-montserrat text-xs text-charcoal/60 uppercase">Attending</p>
          </div>
          <div className="bg-red-50 p-4 rounded-lg text-center">
            <XCircle className="w-8 h-8 mx-auto text-red-500 mb-2" />
            <p className="font-cormorant text-2xl text-charcoal">{stats.notAttending}</p>
            <p className="font-montserrat text-xs text-charcoal/60 uppercase">Declined</p>
          </div>
          <div className="bg-yellow-50 p-4 rounded-lg text-center">
            <HelpCircle className="w-8 h-8 mx-auto text-yellow-600 mb-2" />
            <p className="font-cormorant text-2xl text-charcoal">{stats.pending}</p>
            <p className="font-montserrat text-xs text-charcoal/60 uppercase">Maybe</p>
          </div>
          <div className="bg-gold/10 p-4 rounded-lg text-center">
            <Users className="w-8 h-8 mx-auto text-gold mb-2" />
            <p className="font-cormorant text-2xl text-charcoal">{stats.totalGuestsAttending}</p>
            <p className="font-montserrat text-xs text-charcoal/60 uppercase">Total Attending</p>
          </div>
        </div>

        <motion.button
          onClick={exportToExcel}
          className="mb-6 flex items-center gap-3 px-6 py-3 bg-green-600 text-white rounded-lg font-montserrat text-sm hover:bg-green-700 transition-colors"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <FileSpreadsheet size={20} />
          Export to Excel
        </motion.button>

        <div className="bg-white border border-gold/20 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-cream">
                  <th className="px-4 py-3 text-left font-montserrat text-xs uppercase text-charcoal/70">Name</th>
                  <th className="px-4 py-3 text-left font-montserrat text-xs uppercase text-charcoal/70">Email</th>
                  <th className="px-4 py-3 text-center font-montserrat text-xs uppercase text-charcoal/70">Status</th>
                  <th className="px-4 py-3 text-center font-montserrat text-xs uppercase text-charcoal/70">Guests</th>
                  <th className="px-4 py-3 text-left font-montserrat text-xs uppercase text-charcoal/70">Guest Names</th>
                  <th className="px-4 py-3 text-left font-montserrat text-xs uppercase text-charcoal/70">Message</th>
                  {isCreator && (
                    <th className="px-4 py-3 text-center font-montserrat text-xs uppercase text-charcoal/70">OTP</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {guests.length === 0 ? (
                  <tr>
                    <td colSpan={isCreator ? 7 : 6} className="px-4 py-12 text-center text-charcoal/50 font-cormorant italic">
                      No RSVPs yet
                    </td>
                  </tr>
                ) : (
                  guests.map((guest) => (
                    <tr key={guest.id} className="border-t border-charcoal/10 hover:bg-cream/50">
                      <td className="px-4 py-3 font-cormorant">{guest.name}</td>
                      <td className="px-4 py-3 font-montserrat text-sm text-charcoal/70">{guest.email || '-'}</td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-flex px-3 py-1 rounded-full text-xs font-montserrat uppercase ${
                            guest.attending === 'yes'
                              ? 'bg-green-100 text-green-700'
                              : guest.attending === 'no'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-yellow-100 text-yellow-700'
                          }`}
                        >
                          {guest.attending}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center font-cormorant">{guest.numberOfGuests}</td>
                      <td className="px-4 py-3 font-cormorant text-charcoal/70 max-w-xs">
                        {guest.guestNames?.length ? guest.guestNames.join(', ') : '-'}
                      </td>
                      <td className="px-4 py-3 font-cormorant text-charcoal/70 max-w-xs truncate">
                        {guest.message || '-'}
                      </td>
                      {isCreator && (
                        <td className="px-4 py-3 text-center">
                          {resetSuccess === guest.email ? (
                            <span className="text-green-600 font-montserrat text-xs">+1 granted</span>
                          ) : (
                            <button
                              onClick={() => guest.email && handleResetOtp(guest.email)}
                              disabled={resettingEmail === guest.email || !guest.email}
                              className="text-charcoal/40 hover:text-gold disabled:opacity-30 transition-colors"
                              title="Grant 1 more OTP attempt"
                            >
                              <RefreshCw size={14} className={resettingEmail === guest.email ? 'animate-spin' : ''} />
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}

export function WeddingDashboardPage() {
  const { id } = useParams<{ id: string }>();
  const { wedding, loading, error } = useWedding(id || null);

  if (loading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="animate-pulse font-cormorant text-charcoal/60">Loading...</div>
      </div>
    );
  }

  if (error || !wedding) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="font-script text-4xl text-charcoal mb-4">Wedding Not Found</h1>
          <p className="font-cormorant text-charcoal/60">
            This dashboard link may be incorrect or expired.
          </p>
        </div>
      </div>
    );
  }

  return (
    <WeddingProvider wedding={wedding}>
      <DashboardContent />
    </WeddingProvider>
  );
}
