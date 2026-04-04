import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Check } from 'lucide-react';
import { useWeddingContext } from '../contexts/WeddingContext';
import { fetchGuestsByToken, submitGoldRsvp } from '../services/rsvpApi';
import type { Guest } from '../types';

type Step = 'loading' | 'form' | 'success' | 'already' | 'error';

export const GoldRSVPForm = () => {
  const { wedding, guestToken } = useWeddingContext();
  const [step, setStep] = useState<Step>('loading');
  const [guests, setGuests] = useState<Guest[]>([]);
  const [responses, setResponses] = useState<Record<string, 'yes' | 'no'>>({});
  const [email, setEmail] = useState('');
  const [dietaryRestrictions, setDietaryRestrictions] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!wedding?.id || !guestToken) return;
    (async () => {
      try {
        const result = await fetchGuestsByToken(wedding.id, guestToken);
        setGuests(result.guests);
        if (result.alreadyResponded) {
          setStep('already');
        } else {
          // Initialize all responses as 'yes'
          const initial: Record<string, 'yes' | 'no'> = {};
          result.guests.forEach((g) => { initial[g.id] = 'yes'; });
          setResponses(initial);
          setStep('form');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load invitation');
        setStep('error');
      }
    })();
  }, [wedding?.id, guestToken]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wedding?.id || !guestToken) return;
    setError(null);
    setLoading(true);
    try {
      await submitGoldRsvp(wedding.id, {
        guestToken,
        responses: Object.entries(responses).map(([guestId, attending]) => ({ guestId, attending })),
        email: email.trim() || undefined,
        dietaryRestrictions: dietaryRestrictions.trim() || undefined,
        message: message.trim() || undefined,
      });
      setStep('success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit RSVP');
    } finally {
      setLoading(false);
    }
  };

  const toggleAttending = (guestId: string) => {
    setResponses((prev) => ({
      ...prev,
      [guestId]: prev[guestId] === 'yes' ? 'no' : 'yes',
    }));
  };

  if (step === 'loading') {
    return (
      <div className="text-center py-12">
        <div className="animate-pulse font-cormorant text-xl text-charcoal/60">Loading your invitation...</div>
      </div>
    );
  }

  if (step === 'error') {
    return (
      <div className="text-center py-12">
        <p className="font-montserrat text-red-600">{error || 'Invalid invitation link'}</p>
      </div>
    );
  }

  if (step === 'already') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center py-12"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 10 }}
          className="w-20 h-20 mx-auto mb-6 rounded-full bg-gold/10 flex items-center justify-center"
        >
          <Heart className="text-gold" size={36} fill="currentColor" />
        </motion.div>
        <h3 className="font-cormorant text-3xl text-charcoal mb-3">Thank You!</h3>
        <p className="font-montserrat text-sm text-charcoal/60 max-w-md mx-auto">
          Your RSVP has already been received. We appreciate your response!
        </p>
      </motion.div>
    );
  }

  if (step === 'success') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center py-12"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 10 }}
          className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-50 flex items-center justify-center"
        >
          <Check className="text-green-600" size={36} />
        </motion.div>
        <h3 className="font-cormorant text-3xl text-charcoal mb-3">RSVP Confirmed!</h3>
        <p className="font-montserrat text-sm text-charcoal/60 max-w-md mx-auto">
          Thank you for your response. We look forward to celebrating with you!
        </p>
      </motion.div>
    );
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="gold-form"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <h3 className="font-cormorant text-2xl text-charcoal text-center mb-2">
            RSVP
          </h3>
          <p className="font-montserrat text-xs text-charcoal/60 text-center mb-6">
            Please confirm attendance for {guests.length === 1 ? 'yourself' : 'your party'}
          </p>

          {/* Guest list with individual accept/decline */}
          <div className="space-y-3">
            {guests.map((guest, i) => (
              <div
                key={guest.id}
                className={`p-5 border transition-all ${
                  responses[guest.id] === 'yes'
                    ? 'border-gold/30 bg-gold/5'
                    : responses[guest.id] === 'no'
                    ? 'border-charcoal/10 bg-charcoal/[0.02]'
                    : 'border-charcoal/10'
                }`}
              >
                <div className="flex items-center gap-3 mb-3">
                  <span className="w-7 h-7 flex items-center justify-center rounded-full bg-gold/10 text-gold font-montserrat text-xs font-semibold">
                    {i + 1}
                  </span>
                  <span className="font-cormorant text-lg text-charcoal">
                    {guest.firstName} {guest.lastName}
                  </span>
                </div>
                <div className="flex gap-3 pl-10">
                  <button
                    type="button"
                    onClick={() => setResponses((prev) => ({ ...prev, [guest.id]: 'yes' }))}
                    className={`flex-1 py-2 font-montserrat text-[10px] uppercase tracking-widest transition-all ${
                      responses[guest.id] === 'yes'
                        ? 'bg-gold text-white shadow-sm'
                        : 'border border-charcoal/15 text-charcoal/50 hover:border-gold/40 hover:text-gold'
                    }`}
                  >
                    Joyfully Accept
                  </button>
                  <button
                    type="button"
                    onClick={() => setResponses((prev) => ({ ...prev, [guest.id]: 'no' }))}
                    className={`flex-1 py-2 font-montserrat text-[10px] uppercase tracking-widest transition-all ${
                      responses[guest.id] === 'no'
                        ? 'bg-charcoal/70 text-white shadow-sm'
                        : 'border border-charcoal/15 text-charcoal/50 hover:border-charcoal/40'
                    }`}
                  >
                    Regretfully Decline
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Dietary Restrictions */}
          <div>
            <label className="block font-montserrat text-xs text-charcoal/70 uppercase tracking-wider mb-2">
              Dietary Restrictions
            </label>
            <input
              type="text"
              value={dietaryRestrictions}
              onChange={(e) => setDietaryRestrictions(e.target.value)}
              placeholder="Any allergies or dietary needs?"
              className="w-full px-4 py-3 border border-charcoal/20 rounded-lg font-montserrat text-sm focus:outline-none focus:border-gold"
            />
          </div>

          {/* Message */}
          <div>
            <label className="block font-montserrat text-xs text-charcoal/70 uppercase tracking-wider mb-2">
              Message to the Couple
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Share your wishes..."
              rows={3}
              maxLength={500}
              className="w-full px-4 py-3 border border-charcoal/20 rounded-lg font-montserrat text-sm focus:outline-none focus:border-gold resize-none"
            />
          </div>

          {/* Email field — only shown if sendThankYou is enabled */}
          {wedding?.sendThankYou !== false && (
            <div>
              <label className="block font-montserrat text-xs text-charcoal/70 uppercase tracking-wider mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full px-4 py-3 border border-charcoal/20 rounded-lg font-montserrat text-sm focus:outline-none focus:border-gold"
              />
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-50 text-red-700 font-montserrat text-sm rounded-lg border border-red-200">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 btn-gold text-white font-montserrat text-sm tracking-widest uppercase disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 rounded-lg"
          >
            {loading ? (
              <span className="animate-pulse">Confirming...</span>
            ) : (
              <>
                <Check size={18} />
                Confirm RSVP
              </>
            )}
          </button>
        </form>
      </motion.div>
    </AnimatePresence>
  );
};
