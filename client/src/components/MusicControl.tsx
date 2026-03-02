import { motion } from 'framer-motion';
import { Music, Music2 } from 'lucide-react';

interface MusicControlProps {
  isPlaying: boolean;
  onToggle: () => void;
}

export const MusicControl = ({ isPlaying, onToggle }: MusicControlProps) => {
  return (
    <motion.button
      onClick={onToggle}
      className="fixed top-6 right-6 z-40 w-12 h-12 bg-white/90 backdrop-blur-sm rounded-full shadow-lg flex items-center justify-center text-gold hover:bg-white transition-colors border border-gold/20"
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      title={isPlaying ? 'Pause Music' : 'Play Music'}
    >
      {isPlaying ? (
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
        >
          <Music2 size={22} />
        </motion.div>
      ) : (
        <Music size={22} className="opacity-50" />
      )}
      
      {/* Sound wave animation when playing */}
      {isPlaying && (
        <div className="absolute -right-1 -top-1">
          <motion.div
            className="w-3 h-3 bg-gold rounded-full"
            animate={{ scale: [1, 1.5, 1], opacity: [1, 0, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        </div>
      )}
    </motion.button>
  );
};
