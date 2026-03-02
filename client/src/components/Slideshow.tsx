import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { SlideImage } from '../types';

const slides: SlideImage[] = [
  {
    url: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=1200&h=800&fit=crop',
    caption: 'The day we said yes...',
  },
  {
    url: 'https://images.unsplash.com/photo-1529634806980-85c3dd6d34ac?w=1200&h=800&fit=crop',
    caption: 'Our journey together',
  },
  {
    url: 'https://images.unsplash.com/photo-1591604466107-ec97de577aff?w=1200&h=800&fit=crop',
    caption: 'Every moment with you is magical',
  },
  {
    url: 'https://images.unsplash.com/photo-1522673607200-164d1b6ce486?w=1200&h=800&fit=crop',
    caption: 'Love grows stronger each day',
  },
  {
    url: 'https://images.unsplash.com/photo-1537633552985-df8429e8048b?w=1200&h=800&fit=crop',
    caption: 'Together forever',
  },
  {
    url: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=1200&h=800&fit=crop',
    caption: 'Two hearts, one love',
  },
];

export const Slideshow = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (isPaused) return;

    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [isPaused]);

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
  };

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  return (
    <section className="relative h-screen w-full overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentSlide}
          className="absolute inset-0"
          initial={{ opacity: 0, scale: 1.1 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 1.5, ease: 'easeOut' }}
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${slides[currentSlide].url})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/60" />
        </motion.div>
      </AnimatePresence>

      {/* Content overlay */}
      <div className="absolute inset-0 flex flex-col justify-end items-center pb-32 px-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide}
            className="text-center"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30 }}
            transition={{ duration: 0.8, delay: 0.3 }}
          >
            <p className="font-script text-4xl md:text-6xl text-white drop-shadow-lg mb-4">
              {slides[currentSlide].caption}
            </p>
          </motion.div>
        </AnimatePresence>

        {/* Navigation dots */}
        <div className="flex gap-3 mt-8">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`w-3 h-3 rounded-full transition-all duration-300 ${
                index === currentSlide
                  ? 'bg-gold scale-125'
                  : 'bg-white/50 hover:bg-white/80'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Arrow navigation */}
      <button
        onClick={prevSlide}
        className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-white/10 backdrop-blur-sm rounded-full text-white hover:bg-white/20 transition-all"
      >
        <ChevronLeft size={24} />
      </button>
      <button
        onClick={nextSlide}
        className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-white/10 backdrop-blur-sm rounded-full text-white hover:bg-white/20 transition-all"
      >
        <ChevronRight size={24} />
      </button>

      {/* Scroll indicator */}
      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
        animate={{ y: [0, 10, 0] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      >
        <div className="w-6 h-10 border-2 border-white/50 rounded-full flex justify-center pt-2">
          <motion.div
            className="w-1.5 h-1.5 bg-white rounded-full"
            animate={{ y: [0, 12, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        </div>
      </motion.div>
    </section>
  );
};
