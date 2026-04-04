import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Heart, Check } from 'lucide-react';
import { useWeddingContext } from '../contexts/WeddingContext';
import { submitDirectRsvp } from '../services/rsvpApi';

type Step = 'form' | 'success';

export const RSVPForm = () => {
  const { wedding, maxGuestsFromInvite } = useWeddingContext();
  const [step, setStep] = useState<Step>('form');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const showEmail = wedding?.sendThankYou !== false;

  // Multi-guest mode: invite link specifies exact number of guests
  const isMultiGuest = maxGuestsFromInvite != null && maxGuestsFromInvite > 1;
  const guestCount = maxGuestsFromInvite ?? 1;

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    attending: 'yes' as 'yes' | 'no' | 'maybe',
    numberOfGuests: 1,
    guestNames: [''] as string[],
    guestAttending: ['yes'] as ('yes' | 'no')[],
    dietaryRestrictions: '',
    message: '',
  });

  // Initialize guest slots when invite link sets the count
  useEffect(() => {
    if (isMultiGuest) {
      setFormData((prev) => {
        const names = [...prev.guestNames];
        const attending = [...prev.guestAttending];
        while (names.length < guestCount) names.push('');
        while (attending.length < guestCount) attending.push('yes');
        names.length = guestCount;
        attending.length = guestCount;
        return { ...prev, numberOfGuests: guestCount, guestNames: names, guestAttending: attending };
      });
    }
  }, [isMultiGuest, guestCount]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wedding?.id) return;
    setError(null);
    setLoading(true);
    try {
      if (isMultiGuest) {
        // Multi-guest: each guest has their own name + attending status
        // Filter both arrays in sync — keep only slots where name is non-empty
        const filtered = formData.guestNames
          .map((n, i) => ({ name: n.trim(), attending: formData.guestAttending[i] }))
          .filter((g) => g.name);
        const guestNames = filtered.map((g) => g.name);
        const guestAttending = filtered.map((g) => g.attending);
        const allDeclined = guestAttending.every((a) => a === 'no');
        const attendingCount = guestAttending.filter((a) => a === 'yes').length;

        await submitDirectRsvp(wedding.id, {
          name: guestNames[0] || formData.name,
          attending: allDeclined ? 'no' : 'yes',
          numberOfGuests: attendingCount,
          guestNames,
          guestAttending,
          email: showEmail && formData.email.trim() ? formData.email.trim() : undefined,
          dietaryRestrictions: formData.dietaryRestrictions || undefined,
          message: formData.message || undefined,
        });
      } else {
        // Single guest: simple form
        const guestNames =
          formData.attending === 'no'
            ? [formData.name.trim()].filter(Boolean)
            : formData.guestNames.map((n) => n.trim()).filter(Boolean);
        const name = formData.guestNames[0]?.trim() || formData.name;

        await submitDirectRsvp(wedding.id, {
          name,
          attending: formData.attending,
          numberOfGuests: formData.numberOfGuests,
          guestNames,
          email: showEmail && formData.email.trim() ? formData.email.trim() : undefined,
          dietaryRestrictions: formData.dietaryRestrictions || undefined,
          message: formData.message || undefined,
        });
      }
      setStep('success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit RSVP');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const setGuestName = (index: number, value: string) => {
    setFormData((prev) => {
      const next = [...prev.guestNames];
      next[index] = value;
      return { ...prev, guestNames: next, name: index === 0 ? value : prev.name };
    });
  };

  const setGuestAttendance = (index: number, value: 'yes' | 'no') => {
    setFormData((prev) => {
      const next = [...prev.guestAttending];
      next[index] = value;
      return { ...prev, guestAttending: next };
    });
  };

  return (
    <section id="rsvp" className="py-24 px-4 bg-blush/30 relative overflow-hidden">
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
              onSubmit={handleSubmit}
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

                {showEmail && (
                  <div>
                    <label className="block font-montserrat text-xs tracking-widest text-charcoal/70 uppercase mb-2">
                      Email Address
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-charcoal/20 bg-transparent font-cormorant text-lg transition-all"
                      placeholder="your@email.com"
                    />
                  </div>
                )}

                {isMultiGuest ? (
                  /* ── Multi-guest mode: each person has name + accept/decline ── */
                  <>
                    <p className="font-cormorant text-lg text-charcoal/60 text-center italic">
                      Please confirm attendance for each guest
                    </p>
                    <div className="space-y-3">
                      {Array.from({ length: guestCount }, (_, i) => (
                        <div
                          key={i}
                          className={`p-5 border transition-all ${
                            formData.guestAttending[i] === 'yes'
                              ? 'border-gold/30 bg-gold/5'
                              : formData.guestAttending[i] === 'no'
                              ? 'border-charcoal/10 bg-charcoal/[0.02]'
                              : 'border-charcoal/10'
                          }`}
                        >
                          <div className="flex items-center gap-3 mb-3">
                            <span className="w-7 h-7 flex items-center justify-center rounded-full bg-gold/10 text-gold font-montserrat text-xs font-semibold">
                              {i + 1}
                            </span>
                            <input
                              type="text"
                              value={formData.guestNames[i] ?? ''}
                              onChange={(e) => setGuestName(i, e.target.value)}
                              required
                              className="flex-1 px-3 py-2 border-b border-charcoal/15 bg-transparent font-cormorant text-lg focus:border-gold focus:outline-none transition-colors"
                              placeholder={i === 0 ? 'Your full name' : `Guest ${i + 1} full name`}
                            />
                          </div>
                          <div className="flex gap-3 pl-10">
                            <button
                              type="button"
                              onClick={() => setGuestAttendance(i, 'yes')}
                              className={`flex-1 py-2 font-montserrat text-[10px] uppercase tracking-widest transition-all ${
                                formData.guestAttending[i] === 'yes'
                                  ? 'bg-gold text-white shadow-sm'
                                  : 'border border-charcoal/15 text-charcoal/50 hover:border-gold/40 hover:text-gold'
                              }`}
                            >
                              Joyfully Accept
                            </button>
                            <button
                              type="button"
                              onClick={() => setGuestAttendance(i, 'no')}
                              className={`flex-1 py-2 font-montserrat text-[10px] uppercase tracking-widest transition-all ${
                                formData.guestAttending[i] === 'no'
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
                  </>
                ) : (
                  /* ── Single guest mode: original form ── */
                  <>
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
                                  if (!next.guestNames[0] && prev.name) {
                                    const names = [...next.guestNames];
                                    names[0] = prev.name;
                                    next.guestNames = names;
                                  }
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
                      <div>
                        <label className="block font-montserrat text-xs tracking-widest text-charcoal/70 uppercase mb-2">
                          Your Name *
                        </label>
                        <input
                          type="text"
                          value={formData.guestNames[0] ?? ''}
                          onChange={(e) => setGuestName(0, e.target.value)}
                          required
                          className="w-full px-4 py-3 border border-charcoal/20 bg-transparent font-cormorant text-lg transition-all"
                          placeholder="Your name"
                        />
                      </div>
                    )}
                  </>
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
                  <Send size={18} />
                  {loading ? 'Submitting...' : 'Submit RSVP'}
                </motion.button>
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
