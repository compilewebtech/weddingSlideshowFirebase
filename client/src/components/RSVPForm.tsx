import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Heart, Check, Mail } from 'lucide-react';
import { useGuests } from '../hooks/useGuests';
import { useWeddingContext } from '../contexts/WeddingContext';

export const RSVPForm = () => {
  const wedding = useWeddingContext();
  const { addGuest } = useGuests(wedding?.id ?? null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showEmailNotification, setShowEmailNotification] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    attending: 'yes' as 'yes' | 'no' | 'maybe',
    numberOfGuests: 1,
    dietaryRestrictions: '',
    message: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addGuest(formData);
    setIsSubmitted(true);
    setShowEmailNotification(true);

    setTimeout(() => {
      setShowEmailNotification(false);
    }, 4000);
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'numberOfGuests' ? parseInt(value) : value,
    }));
  };

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
          {!isSubmitted ? (
            <motion.form
              key="form"
              onSubmit={handleSubmit}
              className="bg-white p-8 md:p-12 shadow-xl border border-gold/10"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.8 }}
            >
              <div className="grid gap-6">
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
                          setFormData((prev) => ({
                            ...prev,
                            attending: option.value as 'yes' | 'no' | 'maybe',
                          }))
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
                  >
                    <label className="block font-montserrat text-xs tracking-widest text-charcoal/70 uppercase mb-2">
                      Number of Guests (including yourself)
                    </label>
                    <select
                      name="numberOfGuests"
                      value={formData.numberOfGuests}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-charcoal/20 bg-transparent font-cormorant text-lg"
                    >
                      {[1, 2, 3, 4, 5].map((num) => (
                        <option key={num} value={num}>
                          {num} {num === 1 ? 'Guest' : 'Guests'}
                        </option>
                      ))}
                    </select>
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
                  className="w-full py-4 btn-gold text-white font-montserrat text-sm tracking-widest uppercase flex items-center justify-center gap-3"
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                >
                  <Send size={18} />
                  Send RSVP
                </motion.button>
              </div>
            </motion.form>
          ) : (
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
