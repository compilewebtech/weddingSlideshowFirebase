import { motion } from 'framer-motion';
import { Heart } from 'lucide-react';

const timeline = [
  {
    date: 'June 2019',
    title: 'First Meeting',
    description: 'We met at a mutual friend\'s garden party. James spilled his drink trying to introduce himself.',
  },
  {
    date: 'August 2019',
    title: 'First Date',
    description: 'A romantic dinner at our now favorite Italian restaurant turned into a walk under the stars.',
  },
  {
    date: 'December 2020',
    title: 'Moving In Together',
    description: 'We took the leap and found our cozy little apartment filled with love and laughter.',
  },
  {
    date: 'February 2024',
    title: 'The Proposal',
    description: 'On a mountaintop at sunset, James got down on one knee and I said yes!',
  },
];

export const OurStory = () => {
  return (
    <section className="py-24 px-4 bg-white relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gold/5 rounded-full blur-3xl" />
      </div>

      <div className="max-w-4xl mx-auto relative">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <span className="font-montserrat text-xs tracking-[0.3em] text-gold uppercase">
            How We Met
          </span>
          <h2 className="font-script text-5xl md:text-7xl text-charcoal mt-4 mb-6">
            Our Story
          </h2>
          <div className="flex items-center justify-center gap-4">
            <div className="w-20 h-px bg-gold/50"></div>
            <Heart className="text-gold" size={20} fill="#c9a961" />
            <div className="w-20 h-px bg-gold/50"></div>
          </div>
        </motion.div>

        {/* Timeline */}
        <div className="relative">
          {/* Center line */}
          <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gold/30 -translate-x-1/2 hidden md:block" />

          {timeline.map((item, index) => (
            <motion.div
              key={item.date}
              className={`relative mb-12 md:mb-16 ${
                index % 2 === 0 ? 'md:pr-1/2 md:text-right' : 'md:pl-1/2 md:ml-auto'
              }`}
              initial={{ opacity: 0, x: index % 2 === 0 ? -50 : 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
            >
              <div
                className={`md:w-1/2 ${
                  index % 2 === 0 ? 'md:pr-12' : 'md:pl-12'
                }`}
              >
                <div className="bg-cream/50 p-6 md:p-8 border border-gold/20 relative">
                  <span className="font-montserrat text-xs tracking-widest text-gold uppercase">
                    {item.date}
                  </span>
                  <h3 className="font-script text-3xl text-charcoal mt-2 mb-3">
                    {item.title}
                  </h3>
                  <p className="font-cormorant text-lg text-charcoal/70">
                    {item.description}
                  </p>
                </div>
              </div>

              {/* Center dot */}
              <div className="absolute left-1/2 top-8 -translate-x-1/2 w-4 h-4 bg-gold rounded-full hidden md:block">
                <div className="absolute inset-0 bg-gold rounded-full animate-ping opacity-30" />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
