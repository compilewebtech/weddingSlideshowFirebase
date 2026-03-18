import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface CountdownProps {
  targetDate: string;
  variant?: 'light' | 'dark' | 'glass';
}

export const Countdown = ({ targetDate, variant = 'light' }: CountdownProps) => {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const target = new Date(targetDate).getTime();
    const update = () => {
      const diff = Math.max(0, target - Date.now());
      setTimeLeft({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((diff / (1000 * 60)) % 60),
        seconds: Math.floor((diff / 1000) % 60),
      });
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  const units = [
    { label: 'Days', value: timeLeft.days },
    { label: 'Hours', value: timeLeft.hours },
    { label: 'Minutes', value: timeLeft.minutes },
    { label: 'Seconds', value: timeLeft.seconds },
  ];

  const styles = {
    light: {
      box: 'bg-white border border-gold/20 shadow-lg',
      number: 'text-charcoal',
      label: 'text-charcoal/50',
      separator: 'text-gold',
    },
    dark: {
      box: 'bg-white/5 border border-white/10 backdrop-blur-md',
      number: 'text-white',
      label: 'text-white/50',
      separator: 'text-gold',
    },
    glass: {
      box: 'bg-white/10 border border-white/20 backdrop-blur-xl shadow-2xl',
      number: 'text-white',
      label: 'text-white/60',
      separator: 'text-gold-light',
    },
  };

  const s = styles[variant];

  return (
    <div className="flex items-center justify-center gap-3 md:gap-6">
      {units.map((unit, i) => (
        <div key={unit.label} className="flex items-center gap-3 md:gap-6">
          <motion.div
            className={`${s.box} rounded-xl px-4 py-4 md:px-6 md:py-5 text-center min-w-[70px] md:min-w-[90px]`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <span className={`block font-cormorant text-3xl md:text-5xl font-bold ${s.number}`}>
              {String(unit.value).padStart(2, '0')}
            </span>
            <span className={`block font-montserrat text-[10px] md:text-xs tracking-widest uppercase mt-1 ${s.label}`}>
              {unit.label}
            </span>
          </motion.div>
          {i < units.length - 1 && (
            <span className={`font-cormorant text-2xl md:text-4xl ${s.separator} hidden md:block`}>:</span>
          )}
        </div>
      ))}
    </div>
  );
};
