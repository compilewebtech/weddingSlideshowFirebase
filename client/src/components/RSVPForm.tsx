import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Heart, Check, Mail, KeyRound } from 'lucide-react';
import { useWeddingContext } from '../contexts/WeddingContext';
import { sendOtp, verifyOtp } from '../services/rsvpApi';

type Step = 'form' | 'otp' | 'success';

export const RSVPForm = () => {
  const { wedding, maxGuestsFromInvite } = useWeddingContext();
  const [step, setStep] = useState<Step>('form');
  const [showEmailNotification, setShowEmailNotification] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [otp, setOtp] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    attending: 'yes' as 'yes' | 'no' | 'maybe',
    numberOfGuests: 1,
    guestNames: [''] as string[],
    dietaryRestrictions: '',
    message: '',
  });

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wedding?.id) return;
    setError(null);
    setLoading(true);
    try {
      const guestNames =
        formData.attending === 'no'
          ? [formData.name.trim()].filter(Boolean)
          : formData.guestNames.map((n) => n.trim()).filter(Boolean);
      await sendOtp(wedding.id, { ...formData, guestNames, name: formData.guestNames[0]?.trim() || formData.name });
      setStep('otp');
      setOtp('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send verification code');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wedding?.id || !otp.trim()) return;
    setError(null);
    setLoading(true);
    try {
      await verifyOtp(wedding.id, formData.email, otp.trim());
      setStep('success');
      setShowEmailNotification(true);
      setTimeout(() => setShowEmailNotification(false), 4000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to confirm RSVP');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    if (name === 'numberOfGuests') {
      const num = parseInt(value);
      setFormData((prev) => {
        const newGuestNames = [...prev.guestNames];
        while (newGuestNames.length < num) newGuestNames.push('');
        newGuestNames.length = num;
        return { ...prev, numberOfGuests: num, guestNames: newGuestNames, name: newGuestNames[0] ?? prev.name };
      });
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const setGuestName = (index: number, value: string) => {
    setFormData((prev) => {
      const next = [...prev.guestNames];
      next[index] = value;
      return { ...prev, guestNames: next, name: index === 0 ? value : prev.name };
    });
  };

  const handleBackToForm = () => {
    setStep('form');
    setError(null);
    setOtp('');
  };

  const maxGuests = maxGuestsFromInvite ?? 5;
  useEffect(() => {
    setFormData((prev) => {
      const capped = Math.min(prev.numberOfGuests, maxGuests);
      const newGuestNames = [...prev.guestNames];
      while (newGuestNames.length < capped) newGuestNames.push('');
      newGuestNames.length = capped;
      return { ...prev, numberOfGuests: capped, guestNames: newGuestNames };
    });
  }, [maxGuests]);

  return (
    <section id="rsvp" className="py-24 px-4 bg-blush/30 relative overflow-hidden">
      <AnimatePresence>
        {showEmailNotification && (
          <motion.div
            className="fixed top-6 right-6 z-50 bg-white shadow-2xl rounded-lg p-4 flex items-center gap-3 border-l-4 border-gold"
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 100 }}
          >
            <div className="w-10 h-10 bg-gold/10 rounded-full flex items-center justify-center">
              <Mail className="text-gold" size={20} />
            </div>
            <div>
              <p className="font-montserrat text-sm font-medium text-charcoal">
                Email Notification Sent!
              </p>
              <p className="font-cormorant text-sm text-charcoal/60">
                The couple has been notified of your RSVP
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-2xl mx-auto relative">
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <span className="font-montserrat text-xs tracking-[0.3em] text-gold uppercase">
            We Hope You Can Make It
          </span>
          <h2 className="font-script text-5xl md:text-7xl text-charcoal mt-4 mb-6">
            RSVP
          </h2>
          {wedding?.rsvpDeadline && (
            <p className="font-cormorant text-xl text-charcoal/70">
              Please respond by {wedding.rsvpDeadline}
            </p>
          )}
        </motion.div>

        <AnimatePresence mode="wait">
          {step === 'form' && (
            <motion.form
              key="form"
              onSubmit={handleSendOtp}
              className="bg-white p-8 md:p-12 shadow-xl border border-gold/10"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.8 }}
            >
              <div className="grid gap-6">
                {error && (
                  <div className="p-4 bg-red-50 border border-red-200 text-red-700 font-montserrat text-sm">
                    {error}
                  </div>
                )}
                {formData.attending === 'no' && (
                  <div>
                    <label className="block font-montserrat text-xs tracking-widest text-charcoal/70 uppercase mb-2">
                      Your Name *
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 border border-charcoal/20 bg-transparent font-cormorant text-lg transition-all"
                      placeholder="Enter your full name"
                    />
                  </div>
                )}

                <div>
                  <label className="block font-montserrat text-xs tracking-widest text-charcoal/70 uppercase mb-2">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border border-charcoal/20 bg-transparent font-cormorant text-lg transition-all"
                    placeholder="your@email.com"
                  />
                </div>

                <div>
                  <label className="block font-montserrat text-xs tracking-widest text-charcoal/70 uppercase mb-2">
                    Will you be attending? *
                  </label>
                  <div className="grid grid-cols-3 gap-4">
                    {[
                      { value: 'yes', label: 'Joyfully Accept' },
                      { value: 'no', label: 'Regretfully Decline' },
                      { value: 'maybe', label: 'Not Sure Yet' },
                    ].map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() =>
                          setFormData((prev) => {
                            const next = { ...prev, attending: option.value as 'yes' | 'no' | 'maybe' };
                            if (next.attending !== 'no') {
                              const n = next.numberOfGuests;
                              const guestNames = [...next.guestNames];
                              while (guestNames.length < n) guestNames.push('');
                              guestNames.length = n;
                              if (!guestNames[0] && prev.name) guestNames[0] = prev.name;
                              next.guestNames = guestNames;
                            } else if (prev.guestNames[0]) {
                              next.name = prev.guestNames[0];
                            }
                            return next;
                          })
                        }
                        className={`p-4 border transition-all text-center ${
                          formData.attending === option.value
                            ? 'border-gold bg-gold/10 text-gold'
                            : 'border-charcoal/20 text-charcoal/70 hover:border-gold/50'
                        }`}
                      >
                        <span className="font-cormorant text-sm">{option.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {formData.attending !== 'no' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-4"
                  >
                    <div>
                      <label className="block font-montserrat text-xs tracking-widest text-charcoal/70 uppercase mb-2">
                        Number of Guests (including yourself)
                      </label>
                      <select
                        name="numberOfGuests"
                        value={Math.min(formData.numberOfGuests, maxGuests)}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border border-charcoal/20 bg-transparent font-cormorant text-lg"
                      >
                        {Array.from({ length: maxGuests }, (_, i) => i + 1).map((num) => (
                          <option key={num} value={num}>
                            {num} {num === 1 ? 'Guest' : 'Guests'}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-3">
                      <label className="block font-montserrat text-xs tracking-widest text-charcoal/70 uppercase mb-2">
                        Names of all guests attending
                      </label>
                      {Array.from({ length: formData.numberOfGuests }, (_, i) => (
                        <div key={i}>
                          <input
                            type="text"
                            value={formData.guestNames[i] ?? ''}
                            onChange={(e) => setGuestName(i, e.target.value)}
                            required
                            className="w-full px-4 py-3 border border-charcoal/20 bg-transparent font-cormorant text-lg transition-all"
                            placeholder={i === 0 ? 'Your name' : `Guest ${i + 1} name`}
                          />
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}

                <div>
                  <label className="block font-montserrat text-xs tracking-widest text-charcoal/70 uppercase mb-2">
                    Dietary Restrictions
                  </label>
                  <input
                    type="text"
                    name="dietaryRestrictions"
                    value={formData.dietaryRestrictions}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-charcoal/20 bg-transparent font-cormorant text-lg transition-all"
                    placeholder="Vegetarian, vegan, allergies, etc."
                  />
                </div>

                <div>
                  <label className="block font-montserrat text-xs tracking-widest text-charcoal/70 uppercase mb-2">
                    Message for the Couple
                  </label>
                  <textarea
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    rows={4}
                    className="w-full px-4 py-3 border border-charcoal/20 bg-transparent font-cormorant text-lg transition-all resize-none"
                    placeholder="Share your wishes..."
                  />
                </div>

                <motion.button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 btn-gold text-white font-montserrat text-sm tracking-widest uppercase flex items-center justify-center gap-3 disabled:opacity-60"
                  whileHover={!loading ? { scale: 1.01 } : {}}
                  whileTap={!loading ? { scale: 0.99 } : {}}
                >
                  <KeyRound size={18} />
                  {loading ? 'Sending...' : 'Send Verification Code'}
                </motion.button>
              </div>
            </motion.form>
          )}

          {step === 'otp' && (
            <motion.form
              key="otp"
              onSubmit={handleVerifyOtp}
              className="bg-white p-8 md:p-12 shadow-xl border border-gold/10"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.8 }}
            >
              <div className="grid gap-6">
                {error && (
                  <div className="p-4 bg-red-50 border border-red-200 text-red-700 font-montserrat text-sm">
                    {error}
                  </div>
                )}
                <p className="font-cormorant text-lg text-charcoal/70 text-center">
                  We sent a 6-digit verification code to <strong>{formData.email}</strong>.
                  Please enter it below to confirm your RSVP.
                </p>
                <div>
                  <label className="block font-montserrat text-xs tracking-widest text-charcoal/70 uppercase mb-2">
                    Verification Code *
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    placeholder="000000"
                    className="w-full px-4 py-4 border border-charcoal/20 bg-transparent font-cormorant text-2xl text-center tracking-[0.5em] transition-all"
                  />
                </div>
                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={handleBackToForm}
                    className="flex-1 py-3 border border-charcoal/20 font-montserrat text-sm text-charcoal/70 hover:border-gold/50 transition-all"
                  >
                    Back
                  </button>
                  <motion.button
                    type="submit"
                    disabled={loading || otp.length !== 6}
                    className="flex-1 py-4 btn-gold text-white font-montserrat text-sm tracking-widest uppercase flex items-center justify-center gap-3 disabled:opacity-60"
                    whileHover={!loading && otp.length === 6 ? { scale: 1.01 } : {}}
                    whileTap={!loading && otp.length === 6 ? { scale: 0.99 } : {}}
                  >
                    <Send size={18} />
                    {loading ? 'Confirming...' : 'Confirm RSVP'}
                  </motion.button>
                </div>
              </div>
            </motion.form>
          )}

          {step === 'success' && (
            <motion.div
              key="success"
              className="bg-white p-12 shadow-xl border border-gold/10 text-center"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
            >
              <motion.div
                className="w-20 h-20 mx-auto mb-6 rounded-full bg-gold/10 flex items-center justify-center"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              >
                <Check className="w-10 h-10 text-gold" />
              </motion.div>
              <h3 className="font-script text-4xl text-gold mb-4">Thank You!</h3>
              <p className="font-cormorant text-xl text-charcoal/70 mb-2">
                Your RSVP has been received
              </p>
              <p className="font-cormorant text-lg text-charcoal/50">
                We can't wait to celebrate with you!
              </p>
              <motion.div
                className="mt-6 flex justify-center"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
              >
                <Heart className="text-gold" fill="#c9a961" size={32} />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
};
