import { motion } from 'framer-motion';
//import { Heart, Music } from 'lucide-react';
import { Heart } from 'lucide-react';
interface WelcomeScreenProps {
  onEnter: () => void;
}

export const WelcomeScreen = ({ onEnter }: WelcomeScreenProps) => {
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-cream"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1 }}
    >
      <div className="absolute inset-0 overflow-hidden">
        {/* Decorative floating elements */}
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute text-gold/20"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [0, -30, 0],
              rotate: [0, 360],
              opacity: [0.2, 0.5, 0.2],
            }}
            transition={{
              duration: 3 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          >
            <Heart size={12 + Math.random() * 20} fill="currentColor" />
          </motion.div>
        ))}
      </div>

      <motion.div
        className="relative text-center px-8"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, delay: 0.5 }}
      >
        <motion.div
          className="mb-6"
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          <Heart className="w-12 h-12 mx-auto text-gold" fill="#c9a961" />
        </motion.div>

        <p className="font-montserrat text-sm tracking-[0.3em] text-charcoal/60 uppercase mb-4">
          You are cordially invited to celebrate
        </p>

        <h1 className="font-script text-6xl md:text-8xl text-gold mb-4">
          Sarah & Gaby
        </h1>

        <div className="flex items-center justify-center gap-4 mb-8">
          <div className="w-16 h-px bg-gold"></div>
          <span className="font-cormorant text-xl text-charcoal/70 italic">are getting married</span>
          <div className="w-16 h-px bg-gold"></div>
        </div>

        <p className="font-cormorant text-2xl text-charcoal/80 mb-12">
          December 21st, 2026
        </p>

        <motion.button
          onClick={onEnter}
          className="group relative inline-flex items-center gap-3 px-12 py-4 bg-gold text-white font-montserrat text-sm tracking-widest uppercase overflow-hidden"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <span className="relative z-10 flex items-center gap-3">
            {/*<Music size={18} />*/}
            Enter Celebration
          </span>
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-gold-light to-gold"
            initial={{ x: '-100%' }}
            whileHover={{ x: 0 }}
            transition={{ duration: 0.3 }}
          />
        </motion.button>

        <p className="mt-6 font-cormorant text-sm text-charcoal/50 italic">
          Click to get started and enjoy the celebration! We can't wait to share this special day with you.
        </p>
      </motion.div>

      {/* Corner decorations */}
      <div className="absolute top-8 left-8 w-24 h-24 border-l-2 border-t-2 border-gold/30"></div>
      <div className="absolute top-8 right-8 w-24 h-24 border-r-2 border-t-2 border-gold/30"></div>
      <div className="absolute bottom-8 left-8 w-24 h-24 border-l-2 border-b-2 border-gold/30"></div>
      <div className="absolute bottom-8 right-8 w-24 h-24 border-r-2 border-b-2 border-gold/30"></div>
    </motion.div>
  );
};
