import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  FileSpreadsheet,
  Users,
  CheckCircle,
  XCircle,
  HelpCircle,
  Clock,
  Eye,
  EyeOff,
  Copy,
  Check,
  Link2,
  UserPlus,
  X,
  Plus,
  Trash2,
} from 'lucide-react';
import { useWedding } from '../hooks/useWeddings';
import { useGuests } from '../hooks/useGuests';
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
  const { guests, exportToExcel, stats, addGoldGuest } = useGuests(id || null);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState('');
  const [checking, setChecking] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const isGold = (wedding?.package || 'silver') === 'gold';

  // Add Guest modal state (admin only)
  const [showAddGuest, setShowAddGuest] = useState(false);
  const [newGuests, setNewGuests] = useState([{ firstName: '', lastName: '' }]);
  const [newGroupId, setNewGroupId] = useState('');
  const [addingGuest, setAddingGuest] = useState(false);
  const [addGuestError, setAddGuestError] = useState('');

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

  // Available groups for "Add Guest" dropdown (only pending groups)
  const availableGroups = multiGroups
    .filter(([, members]) => members.every((g) => g.attending === 'pending'))
    .map(([gid, members]) => ({
      groupId: gid,
      label: members.map((g) => `${g.firstName || g.name}`).join(' & '),
    }));

  const handleAddGuest = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddGuestError('');
    const validGuests = newGuests.filter((g) => g.firstName.trim());
    if (validGuests.length === 0) return;
    setAddingGuest(true);
    try {
      await addGoldGuest({
        guests: validGuests.map((g) => ({ firstName: g.firstName.trim(), lastName: g.lastName.trim() })),
        groupId: newGroupId || undefined,
      });
      setShowAddGuest(false);
      setNewGuests([{ firstName: '', lastName: '' }]);
      setNewGroupId('');
    } catch (err) {
      setAddGuestError(err instanceof Error ? err.message : 'Failed to add guest');
    } finally {
      setAddingGuest(false);
    }
  };

  const addGuestRow = () => setNewGuests((prev) => [...prev, { firstName: '', lastName: '' }]);
  const removeGuestRow = (i: number) => setNewGuests((prev) => prev.filter((_, idx) => idx !== i));
  const updateGuestRow = (i: number, field: 'firstName' | 'lastName', value: string) => {
    setNewGuests((prev) => prev.map((g, idx) => idx === i ? { ...g, [field]: value } : g));
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
        <main className="max-w-md mx-auto px-4 py-16 text-center">
          <h1 className="font-script text-4xl text-gold mb-6">Guest Dashboard</h1>
          <p className="font-cormorant text-lg text-charcoal/70">
            Access has not been set up for this wedding. Contact the organizer.
          </p>
        </main>
      </div>
    );
  }

  if (needsPassword) {
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

  return (
    <div className="min-h-screen bg-cream">
      <header className="bg-white border-b border-gold/20 px-4 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          {isCreator ? (
            <Link to="/admin" className="text-charcoal/60 hover:text-charcoal inline-flex items-center gap-2">
              <ArrowLeft size={20} />
              <span className="font-montserrat text-sm">Back to admin</span>
            </Link>
          ) : (
            <div />
          )}
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

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
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
          {isGold ? (
            <div className="bg-gray-50 p-4 rounded-lg text-center">
              <Clock className="w-8 h-8 mx-auto text-gray-500 mb-2" />
              <p className="font-cormorant text-2xl text-charcoal">{stats.pendingCount}</p>
              <p className="font-montserrat text-xs text-charcoal/60 uppercase">Pending</p>
            </div>
          ) : (
            <div className="bg-yellow-50 p-4 rounded-lg text-center">
              <HelpCircle className="w-8 h-8 mx-auto text-yellow-600 mb-2" />
              <p className="font-cormorant text-2xl text-charcoal">{stats.pending}</p>
              <p className="font-montserrat text-xs text-charcoal/60 uppercase">Maybe</p>
            </div>
          )}
          <div className="bg-gold/10 p-4 rounded-lg text-center">
            <Users className="w-8 h-8 mx-auto text-gold mb-2" />
            <p className="font-cormorant text-2xl text-charcoal">{stats.totalGuestsAttending}</p>
            <p className="font-montserrat text-xs text-charcoal/60 uppercase">Total Attending</p>
          </div>
        </div>

        {/* Actions */}
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

          {isCreator && isGold && (
            <motion.button
              onClick={() => setShowAddGuest(true)}
              className="flex items-center gap-2 px-6 py-3 bg-charcoal text-white rounded-lg font-montserrat text-sm hover:bg-charcoal/90 transition-colors"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <UserPlus size={18} />
              Add Guest
            </motion.button>
          )}
        </div>

        {/* Guest Table */}
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
                                : guest.attending === 'pending' ? 'bg-gray-100 text-gray-600'
                                : 'bg-yellow-100 text-yellow-700'
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
                              : guest.attending === 'pending' ? 'bg-gray-100 text-gray-600'
                              : 'bg-yellow-100 text-yellow-700'
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
                          : guest.attending === 'pending' ? 'bg-gray-100 text-gray-600'
                          : 'bg-yellow-100 text-yellow-700'
                        }`}>{guest.attending}</span>
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

      {/* Add Guest Modal (admin only) */}
      {isCreator && (
        <AnimatePresence>
          {showAddGuest && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
              onClick={() => setShowAddGuest(false)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-lg"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-cormorant text-2xl text-charcoal">Add Guests</h3>
                  <button onClick={() => setShowAddGuest(false)} className="text-charcoal/40 hover:text-charcoal">
                    <X size={20} />
                  </button>
                </div>

                <p className="font-montserrat text-xs text-charcoal/50 mb-4">
                  {newGuests.length > 1
                    ? 'These guests will be grouped together with a shared invite link.'
                    : 'Add one guest for a solo invite, or add more to create a group.'}
                </p>

                <form onSubmit={handleAddGuest} className="space-y-4">
                  <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
                    {newGuests.map((g, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="w-6 h-6 flex-shrink-0 flex items-center justify-center rounded-full bg-gold/10 text-gold font-montserrat text-[10px] font-semibold">
                          {i + 1}
                        </span>
                        <input
                          type="text"
                          value={g.firstName}
                          onChange={(e) => updateGuestRow(i, 'firstName', e.target.value)}
                          required
                          className="flex-1 px-3 py-2 border border-charcoal/20 rounded-lg font-cormorant text-lg focus:outline-none focus:border-gold"
                          placeholder="First name *"
                        />
                        <input
                          type="text"
                          value={g.lastName}
                          onChange={(e) => updateGuestRow(i, 'lastName', e.target.value)}
                          className="flex-1 px-3 py-2 border border-charcoal/20 rounded-lg font-cormorant text-lg focus:outline-none focus:border-gold"
                          placeholder="Last name"
                        />
                        {newGuests.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeGuestRow(i)}
                            className="flex-shrink-0 p-1.5 text-charcoal/30 hover:text-red-500 transition-colors"
                            title="Remove"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={addGuestRow}
                    className="w-full py-2 border border-dashed border-charcoal/20 rounded-lg font-montserrat text-xs text-charcoal/50 hover:border-gold/40 hover:text-gold transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Plus size={14} />
                    Add Another Guest to {newGuests.length > 1 ? 'Group' : 'Create Group'}
                  </button>

                  {/* Add to existing group option */}
                  <div>
                    <label className="block font-montserrat text-xs uppercase text-charcoal/70 tracking-wider mb-1">
                      Or add to existing group
                    </label>
                    <select
                      value={newGroupId}
                      onChange={(e) => setNewGroupId(e.target.value)}
                      className="w-full px-3 py-2 border border-charcoal/20 rounded-lg font-cormorant text-lg focus:outline-none focus:border-gold bg-white"
                    >
                      <option value="">New invite link</option>
                      {availableGroups.map((ag) => (
                        <option key={ag.groupId} value={ag.groupId}>
                          Join: {ag.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {addGuestError && (
                    <p className="text-red-600 font-montserrat text-sm">{addGuestError}</p>
                  )}

                  <button
                    type="submit"
                    disabled={addingGuest || !newGuests.some((g) => g.firstName.trim())}
                    className="w-full py-3 btn-gold text-white font-montserrat text-sm tracking-widest uppercase rounded-lg disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {addingGuest ? (
                      <span className="animate-pulse">Adding...</span>
                    ) : (
                      <>
                        <UserPlus size={16} />
                        {newGuests.length > 1 ? `Add ${newGuests.length} Guests` : 'Add Guest'}
                      </>
                    )}
                  </button>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      )}

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
