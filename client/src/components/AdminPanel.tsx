import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileSpreadsheet, Users, CheckCircle, XCircle, Lock, Eye, EyeOff } from 'lucide-react';
import { useGuests } from '../hooks/useGuests';
import { useWeddingContext } from '../contexts/WeddingContext';
import { useAuth } from '../contexts/AuthContext';
import { hashPassword } from '../utils/password';
import {
  isWeddingAuthenticated,
  setWeddingAuthenticated,
  clearWeddingAuth,
} from '../utils/password';

export const AdminPanel = () => {
  const { wedding } = useWeddingContext();
  const { user } = useAuth();
  const { guests, exportToExcel, stats } = useGuests(wedding?.id ?? null);
  const [isOpen, setIsOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState('');
  const [checking, setChecking] = useState(false);

  const isCreator = user && wedding?.createdBy === user.uid;
  const hasPasswordAuth = !!(wedding?.id && wedding?.passwordHash && isWeddingAuthenticated(wedding.id, wedding.passwordHash));
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

  if (!wedding) return null;

  return (
    <>
      <motion.button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-40 w-14 h-14 bg-gold text-white rounded-full shadow-xl flex items-center justify-center hover:bg-gold/90 transition-colors"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        title="View RSVPs"
      >
        <Lock size={24} />
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setIsOpen(false)}
            />

            <motion.div
              className="relative w-full max-w-4xl max-h-[90vh] overflow-auto bg-white shadow-2xl rounded-lg z-10"
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
            >
              {noAccessMethod ? (
                <div className="p-8">
                  <h2 className="font-script text-4xl text-center text-gold mb-6">
                    Guest Dashboard
                  </h2>
                  <p className="text-center text-charcoal/70 font-cormorant mb-6">
                    Access has not been set up for this wedding. Contact the organizer.
                  </p>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="block w-full py-2 text-charcoal/60 font-montserrat text-sm"
                  >
                    Close
                  </button>
                </div>
              ) : !isAuthenticated && needsPassword ? (
                <div className="p-8">
                  <h2 className="font-script text-4xl text-center text-gold mb-6">
                    Guest Dashboard
                  </h2>
                  <p className="text-center text-charcoal/70 font-cormorant mb-6">
                    Enter your password to view RSVPs and insights.
                  </p>
                  <form onSubmit={handlePasswordSubmit} className="max-w-sm mx-auto">
                    <div className="relative mb-4">
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
                    {authError && (
                      <p className="text-red-600 text-sm mb-4">{authError}</p>
                    )}
                    <button
                      type="submit"
                      disabled={checking || !password}
                      className="w-full py-3 btn-gold text-white font-montserrat text-sm tracking-widest uppercase disabled:opacity-50"
                    >
                      {checking ? 'Checking...' : 'Access'}
                    </button>
                  </form>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="block w-full mt-4 py-2 text-charcoal/60 font-montserrat text-sm"
                  >
                    Close
                  </button>
                </div>
              ) : (
                <div className="p-8">
                  <div className="flex items-center justify-between mb-8">
                    <h2 className="font-script text-4xl text-gold">Guest Dashboard</h2>
                    <div className="flex items-center gap-2">
                      {hasPasswordAuth && (
                        <button
                          onClick={handleLogout}
                          className="text-charcoal/50 hover:text-charcoal font-montserrat text-xs"
                        >
                          Log out
                        </button>
                      )}
                      <button
                        onClick={() => setIsOpen(false)}
                        className="text-charcoal/50 hover:text-charcoal text-2xl"
                      >
                        ×
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <div className="bg-cream p-4 rounded-lg text-center">
                      <Users className="w-8 h-8 mx-auto text-gold mb-2" />
                      <p className="font-cormorant text-3xl text-charcoal">{stats.totalGuests}</p>
                      <p className="font-montserrat text-xs text-charcoal/60 uppercase tracking-wider">Total RSVPs</p>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg text-center">
                      <CheckCircle className="w-8 h-8 mx-auto text-green-600 mb-2" />
                      <p className="font-cormorant text-3xl text-charcoal">{stats.attending}</p>
                      <p className="font-montserrat text-xs text-charcoal/60 uppercase tracking-wider">Attending</p>
                    </div>
                    <div className="bg-red-50 p-4 rounded-lg text-center">
                      <XCircle className="w-8 h-8 mx-auto text-red-500 mb-2" />
                      <p className="font-cormorant text-3xl text-charcoal">{stats.notAttending}</p>
                      <p className="font-montserrat text-xs text-charcoal/60 uppercase tracking-wider">Declined</p>
                    </div>
                    <div className="bg-gold/10 p-4 rounded-lg text-center">
                      <Users className="w-8 h-8 mx-auto text-gold mb-2" />
                      <p className="font-cormorant text-3xl text-charcoal">{stats.totalGuestsAttending}</p>
                      <p className="font-montserrat text-xs text-charcoal/60 uppercase tracking-wider">Total Attending</p>
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

                  <div className="border border-charcoal/10 rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="bg-cream">
                            <th className="px-4 py-3 text-left font-montserrat text-xs uppercase tracking-wider text-charcoal/70">Name</th>
                            <th className="px-4 py-3 text-left font-montserrat text-xs uppercase tracking-wider text-charcoal/70">Email</th>
                            <th className="px-4 py-3 text-center font-montserrat text-xs uppercase tracking-wider text-charcoal/70">Status</th>
                            <th className="px-4 py-3 text-center font-montserrat text-xs uppercase tracking-wider text-charcoal/70">Guests</th>
                            <th className="px-4 py-3 text-left font-montserrat text-xs uppercase tracking-wider text-charcoal/70">Guest Names</th>
                            <th className="px-4 py-3 text-left font-montserrat text-xs uppercase tracking-wider text-charcoal/70">Message</th>
                          </tr>
                        </thead>
                        <tbody>
                          {guests.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="px-4 py-8 text-center text-charcoal/50 font-cormorant text-lg italic">
                                No RSVPs yet
                              </td>
                            </tr>
                          ) : (
                            guests.map((guest, index) => (
                              <motion.tr
                                key={guest.id}
                                className="border-t border-charcoal/10 hover:bg-cream/50"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                              >
                                <td className="px-4 py-3 font-cormorant text-lg">{guest.name}</td>
                                <td className="px-4 py-3 font-montserrat text-sm text-charcoal/70">{guest.email || '-'}</td>
                                <td className="px-4 py-3 text-center">
                                  <span
                                    className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-montserrat uppercase tracking-wider ${
                                      guest.attending === 'yes' ? 'bg-green-100 text-green-700'
                                        : guest.attending === 'no' ? 'bg-red-100 text-red-700'
                                        : 'bg-yellow-100 text-yellow-700'
                                    }`}
                                  >
                                    {guest.attending === 'yes' ? 'Yes' : guest.attending === 'no' ? 'No' : 'Maybe'}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-center font-cormorant text-lg">{guest.numberOfGuests}</td>
                                <td className="px-4 py-3 font-cormorant text-charcoal/70 max-w-xs">
                                  {guest.guestNames?.length ? guest.guestNames.join(', ') : '-'}
                                </td>
                                <td className="px-4 py-3 font-cormorant text-charcoal/70 max-w-xs truncate">{guest.message || '-'}</td>
                              </motion.tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
