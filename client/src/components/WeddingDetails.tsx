import { motion } from 'framer-motion';
import { Calendar, MapPin, Clock, Heart } from 'lucide-react';

export const WeddingDetails = () => {
  const details = [
    {
      icon: Calendar,
      title: 'Date',
      info: 'Saturday, December 21st, 2026',
    },
    {
      icon: Clock,
      title: 'Time',
      info: 'Ceremony at 4:00 PM',
      subInfo: 'Saint Nicholas Church, Zouk Mosbeh, Lebanon',
    },
    {
      icon: MapPin,
      title: 'Venue',
      info: 'Stone Restaurant',
      subInfo: 'Zouk Mkayel, Lebanon',
    },
  ];

  return (
    <section className="py-24 px-4 bg-cream relative overflow-hidden">
      {/* Decorative background */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-0 left-0 w-96 h-96 bg-gold rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-rose rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />
      </div>

      <div className="max-w-6xl mx-auto relative">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <span className="font-montserrat text-xs tracking-[0.3em] text-gold uppercase">
            Join Us For
          </span>
          <h2 className="font-script text-5xl md:text-7xl text-charcoal mt-4 mb-6">
            The Celebration
          </h2>
          <div className="flex items-center justify-center gap-4">
            <div className="w-20 h-px bg-gold/50"></div>
            <Heart className="text-gold" size={20} fill="#c9a961" />
            <div className="w-20 h-px bg-gold/50"></div>
          </div>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8">
          {details.map((detail, index) => (
            <motion.div
              key={detail.title}
              className="relative group"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: index * 0.2 }}
            >
              <div className="bg-white p-10 text-center border border-gold/20 hover:border-gold/40 transition-all duration-500 hover:shadow-xl">
                <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-gold/10 flex items-center justify-center group-hover:bg-gold/20 transition-colors">
                  <detail.icon className="w-7 h-7 text-gold" />
                </div>
                <h3 className="font-montserrat text-sm tracking-[0.2em] text-gold uppercase mb-4">
                  {detail.title}
                </h3>
                <p className="font-cormorant text-2xl text-charcoal mb-2">
                  {detail.info}
                </p>
                {detail.subInfo && (
                  <p className="font-cormorant text-lg text-charcoal/60 italic">
                    {detail.subInfo}
                  </p>
                )}

                {/* Corner decorations */}
                <div className="absolute top-4 left-4 w-6 h-6 border-l border-t border-gold/30 opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="absolute top-4 right-4 w-6 h-6 border-r border-t border-gold/30 opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="absolute bottom-4 left-4 w-6 h-6 border-l border-b border-gold/30 opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="absolute bottom-4 right-4 w-6 h-6 border-r border-b border-gold/30 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </motion.div>
          ))}
        </div>

        {/* Additional message */}
        <motion.div
          className="mt-16 text-center"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.6 }}
        >
          <p className="font-cormorant text-xl text-charcoal/70 italic max-w-2xl mx-auto">
            "Two souls with but a single thought, two hearts that beat as one."
          </p>
          <p className="font-montserrat text-xs tracking-widest text-gold mt-4 uppercase">
            — John Keats
          </p>
        </motion.div>
      </div>
    </section>
  );
};
