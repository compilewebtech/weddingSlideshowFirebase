import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import * as XLSX from 'xlsx';
import {
  FileSpreadsheet,
  Users,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  EyeOff,
  Copy,
  Check,
  Link2,
} from 'lucide-react';
import { useWedding } from '../hooks/useWeddings';
import { fetchDashboardGuests } from '../services/rsvpApi';
import type { Guest } from '../types';
import { WeddingProvider } from '../contexts/WeddingContext';
import { hashPassword } from '../utils/password';
import {
  isWeddingAuthenticated,
  setWeddingAuthenticated,
  clearWeddingAuth,
} from '../utils/password';

function DashboardContent() {
  const { id } = useParams<{ id: string }>();
  const { wedding } = useWedding(id || null);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [guestsError, setGuestsError] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState('');
  const [checking, setChecking] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const isGold = (wedding?.package || 'silver') === 'gold';

  // Auth: password-only, no admin bypass
  const hasPasswordAuth = !!(wedding?.id && wedding?.passwordHash && isWeddingAuthenticated(wedding.id, wedding.passwordHash));

  // Fetch guests via password-authenticated API (works for the couple, not only the wedding creator)
  useEffect(() => {
    if (!wedding?.id || !wedding.passwordHash || !hasPasswordAuth) return;
    let cancelled = false;
    (async () => {
      try {
        const { guests: fetched } = await fetchDashboardGuests(wedding.id, wedding.passwordHash!);
        if (cancelled) return;
        const sorted = [...fetched].sort((a, b) => {
          if (a.attending === 'pending' && b.attending !== 'pending') return 1;
          if (a.attending !== 'pending' && b.attending === 'pending') return -1;
          return new Date(b.submittedAt || 0).getTime() - new Date(a.submittedAt || 0).getTime();
        });
        setGuests(sorted);
        setGuestsError(null);
      } catch (err) {
        if (cancelled) return;
        setGuestsError(err instanceof Error ? err.message : 'Failed to load guests');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [wedding?.id, wedding?.passwordHash, hasPasswordAuth]);

  const stats = useMemo(() => {
    let attending = 0;
    let notAttending = 0;
    let pendingCount = 0;
    let totalInvited = 0;
    let totalGuestsAttending = 0;
    for (const g of guests) {
      if (g.guestAttending?.length) {
        const yesCount = g.guestAttending.filter((a) => a === 'yes').length;
        const noCount = g.guestAttending.filter((a) => a === 'no').length;
        attending += yesCount;
        notAttending += noCount;
        totalInvited += g.guestAttending.length;
        totalGuestsAttending += yesCount;
      } else if (g.attending === 'yes') {
        attending++;
        totalInvited++;
        totalGuestsAttending += g.numberOfGuests || 1;
      } else if (g.attending === 'no') {
        notAttending++;
        totalInvited++;
      } else if (g.attending === 'pending') {
        pendingCount++;
        totalInvited++;
      }
    }
    return { totalInvited, attending, notAttending, pendingCount, totalGuestsAttending };
  }, [guests]);

  const exportToExcel = useCallback(() => {
    const guestRows: Record<string, string | number>[] = [];
    let rowNum = 1;
    for (const guest of guests) {
      if (guest.guestAttending?.length && guest.guestNames?.length) {
        for (let i = 0; i < guest.guestNames.length; i++) {
          guestRows.push({
            '#': rowNum++,
            Name: guest.guestNames[i] || '',
            Email: i === 0 ? (guest.email || '') : '',
            Attending: guest.guestAttending[i] === 'yes' ? 'Yes' : 'No',
            'Dietary Restrictions': i === 0 ? (guest.dietaryRestrictions || '') : '',
            Message: i === 0 ? (guest.message || '') : '',
            'Submitted At': i === 0 && guest.submittedAt ? new Date(guest.submittedAt).toLocaleString() : '',
          });
        }
      } else {
        guestRows.push({
          '#': rowNum++,
          Name: guest.firstName ? `${guest.firstName} ${guest.lastName || ''}` : guest.name,
          Email: guest.email || '',
          Attending: guest.attending === 'yes' ? 'Yes' : guest.attending === 'no' ? 'No' : 'Pending',
          'Dietary Restrictions': guest.dietaryRestrictions || '',
          Message: guest.message || '',
          'Submitted At': guest.submittedAt ? new Date(guest.submittedAt).toLocaleString() : '',
        });
      }
    }
    const empty = { '#': '', Name: '', Email: '', Attending: '', 'Dietary Restrictions': '', Message: '', 'Submitted At': '' };
    const statsRows = [
      { ...empty },
      { ...empty, Name: 'Summary' },
      { ...empty, Name: 'Total Invited', Attending: String(stats.totalInvited) },
      { ...empty, Name: 'Attending', Attending: String(stats.attending) },
      { ...empty, Name: 'Declined', Attending: String(stats.notAttending) },
      ...(stats.pendingCount > 0 ? [{ ...empty, Name: 'Pending', Attending: String(stats.pendingCount) }] : []),
      { ...empty, Name: 'Total Guests Attending', Attending: String(stats.totalGuestsAttending) },
    ];
    const exportData = [...guestRows, ...statsRows];
    const ws = XLSX.utils.json_to_sheet(exportData);
    const colWidths = Object.keys(exportData[0] || {}).map((key) => ({
      wch: Math.max(key.length, ...exportData.map((row) => String((row as Record<string, unknown>)[key] || '').length)) + 2,
    }));
    ws['!cols'] = colWidths;
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Guests');
    XLSX.writeFile(wb, `wedding-guests-${id}-${new Date().toISOString().split('T')[0]}.xlsx`);
  }, [guests, stats, id]);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wedding?.id || !wedding.passwordHash) return;
    setAuthError('');
    setChecking(true);
    try {
      const hash = await hashPassword(password);
      if (hash === wedding.passwordHash) {
        setWeddingAuthenticated(wedding.id, hash);
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

  // No password configured — block access entirely
  if (!wedding.passwordHash) {
    return (
      <div className="min-h-screen bg-cream">
        <main className="max-w-md mx-auto px-4 py-16 text-center">
          <h1 className="font-script text-4xl text-gold mb-6">Guest Dashboard</h1>
          <p className="font-cormorant text-lg text-charcoal/70">
            Access has not been set up for this wedding. Contact the organizer.
          </p>
        </main>
      </div>
    );
  }

  // Password not entered yet — show password form
  if (!hasPasswordAuth) {
    return (
      <div className="min-h-screen bg-cream">
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

  // Authenticated — read-only dashboard
  // Group guests by groupId for display
  const groupMap = new Map<string, typeof guests>();
  if (isGold) {
    guests.forEach((g) => {
      const gid = g.groupId || g.id;
      if (!groupMap.has(gid)) groupMap.set(gid, []);
      groupMap.get(gid)!.push(g);
    });
  }
  const groupEntries = isGold ? Array.from(groupMap.entries()) : [];
  const multiGroups = groupEntries.filter(([, members]) => members.length > 1);
  const solos = groupEntries.filter(([, members]) => members.length === 1);

  return (
    <div className="min-h-screen bg-cream">
      <header className="bg-white border-b border-gold/20 px-4 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-end">
          <button
            onClick={handleLogout}
            className="text-charcoal/50 hover:text-charcoal font-montserrat text-xs"
          >
            Log out
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="font-script text-3xl text-charcoal">
            {wedding.name || wedding.coupleNames}
          </h1>
          <p className="font-montserrat text-sm text-charcoal/60">RSVP Dashboard</p>
        </div>

        {/* Stats */}
        <div className={`grid grid-cols-2 ${isGold ? 'md:grid-cols-5' : 'md:grid-cols-4'} gap-4 mb-8`}>
          <div className="bg-white p-4 rounded-lg border border-gold/20 text-center">
            <Users className="w-8 h-8 mx-auto text-gold mb-2" />
            <p className="font-cormorant text-2xl text-charcoal">{stats.totalInvited}</p>
            <p className="font-montserrat text-xs text-charcoal/60 uppercase">
              {isGold ? 'Total Invited' : 'Total RSVPs'}
            </p>
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
          {isGold && (
            <div className="bg-gray-50 p-4 rounded-lg text-center">
              <Clock className="w-8 h-8 mx-auto text-gray-500 mb-2" />
              <p className="font-cormorant text-2xl text-charcoal">{stats.pendingCount}</p>
              <p className="font-montserrat text-xs text-charcoal/60 uppercase">Pending</p>
            </div>
          )}
          <div className="bg-gold/10 p-4 rounded-lg text-center">
            <Users className="w-8 h-8 mx-auto text-gold mb-2" />
            <p className="font-cormorant text-2xl text-charcoal">{stats.totalGuestsAttending}</p>
            <p className="font-montserrat text-xs text-charcoal/60 uppercase">Total Attending</p>
          </div>
        </div>

        {guestsError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 font-montserrat text-sm">
            {guestsError}
          </div>
        )}

        {/* Export only */}
        <div className="flex flex-wrap items-center gap-4 mb-6">
          <motion.button
            onClick={exportToExcel}
            className="flex items-center gap-3 px-6 py-3 bg-green-600 text-white rounded-lg font-montserrat text-sm hover:bg-green-700 transition-colors"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <FileSpreadsheet size={20} />
            Export to Excel
          </motion.button>
        </div>

        {/* Guest Table — read-only */}
        <div className="bg-white border border-gold/20 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-cream">
                  <th className="px-4 py-3 text-left font-montserrat text-xs uppercase text-charcoal/70">Name</th>
                  {wedding?.sendThankYou !== false && (
                    <th className="px-4 py-3 text-left font-montserrat text-xs uppercase text-charcoal/70">Email</th>
                  )}
                  <th className="px-4 py-3 text-center font-montserrat text-xs uppercase text-charcoal/70">Status</th>
                  {!isGold && (
                    <>
                      <th className="px-4 py-3 text-center font-montserrat text-xs uppercase text-charcoal/70">Guests</th>
                      <th className="px-4 py-3 text-left font-montserrat text-xs uppercase text-charcoal/70">Guest Names</th>
                    </>
                  )}
                  <th className="px-4 py-3 text-left font-montserrat text-xs uppercase text-charcoal/70">Message</th>
                  {isGold && (
                    <th className="px-4 py-3 text-center font-montserrat text-xs uppercase text-charcoal/70">Link</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {guests.length === 0 ? (
                  <tr>
                    <td colSpan={isGold ? (wedding?.sendThankYou !== false ? 5 : 4) : (wedding?.sendThankYou !== false ? 6 : 5)} className="px-4 py-12 text-center text-charcoal/50 font-cormorant italic">
                      {isGold ? 'No guests uploaded yet' : 'No RSVPs yet'}
                    </td>
                  </tr>
                ) : isGold ? (
                  <>
                    {/* Gold: Grouped display */}
                    {multiGroups.flatMap(([gid, members]) => {
                      const groupToken = members[0]?.guestToken;
                      return [
                        <tr key={`gh-${gid}`} className="border-t-2 border-gold/20 bg-blue-50/40">
                          <td colSpan={wedding?.sendThankYou !== false ? 4 : 3} className="px-4 py-2">
                            <div className="flex items-center gap-3">
                              <Link2 size={14} className="text-blue-500" />
                              <span className="font-montserrat text-xs font-semibold text-blue-600 uppercase tracking-wider">
                                Shared Invite — {members.length} guests
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-2 text-center">
                            {groupToken && (
                              <button
                                onClick={() => {
                                  const url = `${window.location.origin}/wedding/${id}?invite=${groupToken}`;
                                  navigator.clipboard.writeText(url);
                                  setCopiedToken(groupToken);
                                  setTimeout(() => setCopiedToken(null), 2000);
                                }}
                                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-montserrat text-gold hover:bg-gold/5 rounded transition-colors"
                              >
                                {copiedToken === groupToken ? (
                                  <><Check size={14} className="text-green-600" /><span className="text-green-600">Copied</span></>
                                ) : (
                                  <><Copy size={14} />Copy Group Link</>
                                )}
                              </button>
                            )}
                          </td>
                        </tr>,
                        ...members.map((guest) => (
                          <tr key={guest.id} className="border-t border-charcoal/5 bg-blue-50/20 hover:bg-blue-50/40">
                            <td className="px-4 py-3 font-cormorant pl-8">{guest.firstName} {guest.lastName || ''}</td>
                            {wedding?.sendThankYou !== false && (
                              <td className="px-4 py-3 font-montserrat text-sm text-charcoal/70">{guest.email || '-'}</td>
                            )}
                            <td className="px-4 py-3 text-center">
                              <span className={`inline-flex px-3 py-1 rounded-full text-xs font-montserrat uppercase ${
                                guest.attending === 'yes' ? 'bg-green-100 text-green-700'
                                : guest.attending === 'no' ? 'bg-red-100 text-red-700'
                                : 'bg-gray-100 text-gray-600'
                              }`}>{guest.attending}</span>
                            </td>
                            <td className="px-4 py-3 font-cormorant text-charcoal/70 max-w-xs truncate">{guest.message || '-'}</td>
                            <td />
                          </tr>
                        )),
                      ];
                    })}
                    {solos.map(([, members]) => {
                      const guest = members[0];
                      return (
                        <tr key={guest.id} className="border-t border-charcoal/10 hover:bg-cream/50">
                          <td className="px-4 py-3 font-cormorant">{guest.firstName ? `${guest.firstName} ${guest.lastName || ''}` : guest.name}</td>
                          {wedding?.sendThankYou !== false && (
                            <td className="px-4 py-3 font-montserrat text-sm text-charcoal/70">{guest.email || '-'}</td>
                          )}
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-flex px-3 py-1 rounded-full text-xs font-montserrat uppercase ${
                              guest.attending === 'yes' ? 'bg-green-100 text-green-700'
                              : guest.attending === 'no' ? 'bg-red-100 text-red-700'
                              : 'bg-gray-100 text-gray-600'
                            }`}>{guest.attending}</span>
                          </td>
                          <td className="px-4 py-3 font-cormorant text-charcoal/70 max-w-xs truncate">{guest.message || '-'}</td>
                          <td className="px-4 py-3 text-center">
                            {guest.guestToken && (
                              <button
                                onClick={() => {
                                  const url = `${window.location.origin}/wedding/${id}?invite=${guest.guestToken}`;
                                  navigator.clipboard.writeText(url);
                                  setCopiedToken(guest.guestToken!);
                                  setTimeout(() => setCopiedToken(null), 2000);
                                }}
                                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-montserrat text-gold hover:bg-gold/5 rounded transition-colors"
                              >
                                {copiedToken === guest.guestToken ? (
                                  <><Check size={14} className="text-green-600" /><span className="text-green-600">Copied</span></>
                                ) : (
                                  <><Copy size={14} />Copy</>
                                )}
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </>
                ) : (
                  /* Silver: flat display */
                  guests.map((guest) => (
                    <tr key={guest.id} className="border-t border-charcoal/10 hover:bg-cream/50">
                      <td className="px-4 py-3 font-cormorant">{guest.firstName ? `${guest.firstName} ${guest.lastName || ''}` : guest.name}</td>
                      {wedding?.sendThankYou !== false && (
                        <td className="px-4 py-3 font-montserrat text-sm text-charcoal/70">{guest.email || '-'}</td>
                      )}
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex px-3 py-1 rounded-full text-xs font-montserrat uppercase ${
                          guest.attending === 'yes' ? 'bg-green-100 text-green-700'
                          : guest.attending === 'no' ? 'bg-red-100 text-red-700'
                          : 'bg-gray-100 text-gray-600'
                        }`}>{guest.attending === 'yes' ? 'Yes' : 'No'}</span>
                      </td>
                      <td className="px-4 py-3 text-center font-cormorant">{guest.numberOfGuests}</td>
                      <td className="px-4 py-3 font-cormorant text-charcoal/70 max-w-xs">
                        {guest.guestNames?.length
                          ? guest.guestAttending?.length
                            ? guest.guestNames.map((name, i) => (
                                <span key={i} className="block">
                                  {name}{' '}
                                  <span className={`text-xs ${guest.guestAttending![i] === 'yes' ? 'text-green-600' : 'text-red-500'}`}>
                                    ({guest.guestAttending![i] === 'yes' ? 'attending' : 'declined'})
                                  </span>
                                </span>
                              ))
                            : guest.guestNames.join(', ')
                          : '-'}
                      </td>
                      <td className="px-4 py-3 font-cormorant text-charcoal/70 max-w-xs truncate">{guest.message || '-'}</td>
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
