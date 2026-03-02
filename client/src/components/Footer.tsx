import { motion } from 'framer-motion';
import { Heart } from 'lucide-react';

export const Footer = () => {
  return (
    <footer className="py-16 px-4 bg-charcoal text-white relative overflow-hidden">
      {/* Decorative background */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-1/4 w-64 h-64 bg-gold rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-gold rounded-full blur-3xl" />
      </div>

      <div className="max-w-4xl mx-auto relative text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <h2 className="font-script text-5xl md:text-6xl text-gold mb-4">
            Sarah & Gaby
          </h2>
          
          <p className="font-cormorant text-xl text-white/70 mb-8">
            December 21st, 2026 • Zouk Mosbeh, Mount Lebanon
          </p>

          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="w-16 h-px bg-gold/50"></div>
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <Heart className="text-gold" fill="#c9a961" size={24} />
            </motion.div>
            <div className="w-16 h-px bg-gold/50"></div>
          </div>

          <p className="font-cormorant text-lg text-white/50 italic mb-4">
            "I have found the one whom my soul loves."
          </p>
          <p className="font-montserrat text-xs tracking-widest text-gold/70 uppercase">
            — Song of Solomon 3:4
          </p>

          <div className="mt-12 pt-8 border-t border-white/10">
            <p className="font-montserrat text-xs text-white/40 tracking-wider">
              © 2026 Sarah & Gaby Wedding • Designed with love and care
              {/*<Heart className="inline w-3 h-3 text-rose" fill="#d4a5a5" />*/}
            </p>
          </div>
        </motion.div>
      </div>
    </footer>
  );
};
