import { motion } from 'framer-motion';
import { Phone, Building2 } from 'lucide-react';
import { useWeddingContext } from '../contexts/WeddingContext';

export const WeddingPayment = () => {
  const { wedding } = useWeddingContext();

  if (!wedding?.paymentType || (!wedding.paymentWhishPhone && !wedding.paymentBankAccount)) {
    return null;
  }

  const isWhish = wedding.paymentType === 'whish' && wedding.paymentWhishPhone?.trim();
  const isBank = wedding.paymentType === 'bank' && wedding.paymentBankAccount?.trim();

  if (!isWhish && !isBank) return null;

  return (
    <section id="gift" className="py-24 px-4 bg-blush/20 relative overflow-hidden">
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gold rounded-full blur-3xl translate-x-1/2 -translate-y-1/2" />
      </div>

      <div className="max-w-2xl mx-auto relative">
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <span className="font-montserrat text-xs tracking-[0.3em] text-gold uppercase">
            Your Presence Is Our Gift
          </span>
          <h2 className="font-script text-5xl md:text-6xl text-charcoal mt-4 mb-6">
            Wedding Gift
          </h2>
          <p className="font-cormorant text-lg text-charcoal/70">
            If you wish to contribute, you may use the following:
          </p>
        </motion.div>

        <motion.div
          className="bg-white p-8 md:p-10 shadow-xl border border-gold/20"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          {isWhish && (
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-full bg-gold/10 flex items-center justify-center flex-shrink-0">
                <Phone className="w-7 h-7 text-gold" />
              </div>
              <div>
                <h3 className="font-montserrat text-sm tracking-widest text-gold uppercase mb-2">
                  Whish
                </h3>
                <p className="font-cormorant text-xl text-charcoal">
                  {wedding.paymentWhishPhone}
                </p>
                <p className="font-montserrat text-xs text-charcoal/50 mt-2">
                  Send your gift via Whish app to this number
                </p>
              </div>
            </div>
          )}

          {isBank && (
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-full bg-gold/10 flex items-center justify-center flex-shrink-0">
                <Building2 className="w-7 h-7 text-gold" />
              </div>
              <div>
                <h3 className="font-montserrat text-sm tracking-widest text-gold uppercase mb-2">
                  Wedding Bank Account
                </h3>
                <p className="font-cormorant text-xl text-charcoal break-all">
                  {wedding.paymentBankAccount}
                </p>
                <p className="font-montserrat text-xs text-charcoal/50 mt-2">
                  Bank transfer to the wedding account
                </p>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </section>
  );
};
