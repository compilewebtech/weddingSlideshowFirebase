import { motion } from 'framer-motion';
import { Heart } from 'lucide-react';

export function NotFoundPage() {
  return (
    <div className="min-h-screen bg-cream flex items-center justify-center px-4">
      <motion.div
        className="text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <p className="font-montserrat text-sm tracking-[0.3em] text-charcoal/50 uppercase mb-4">
          Page not found
        </p>
        <h1 className="font-script text-8xl md:text-9xl text-gold mb-4">404</h1>
        <div className="flex justify-center mb-6">
          <Heart className="w-10 h-10 text-gold/50" fill="#c9a961" />
        </div>
        <p className="font-cormorant text-xl text-charcoal/60 max-w-md mx-auto">
          The page you're looking for doesn't exist or may have been moved.
        </p>
      </motion.div>
    </div>
  );
}
