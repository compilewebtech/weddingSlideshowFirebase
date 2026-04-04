import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { decodeInviteParams } from '../utils/inviteLink';
import { AnimatePresence } from 'framer-motion';
import { WelcomeScreen } from '../components/WelcomeScreen';
import { Slideshow } from '../components/Slideshow';
import { Countdown } from '../components/Countdown';
import { WeddingDetails } from '../components/WeddingDetails';
import { WeddingPayment } from '../components/WeddingPayment';
import { RSVPForm } from '../components/RSVPForm';
import { GoldRSVPForm } from '../components/GoldRSVPForm';
import { MusicControl } from '../components/MusicControl';
import { Footer } from '../components/Footer';
import { useAudio } from '../hooks/useAudio';
import { useWedding } from '../hooks/useWeddings';
import { WeddingProvider } from '../contexts/WeddingContext';

function WeddingContent() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const { wedding, loading, error } = useWedding(id || null);
  const inviteParam = searchParams.get('invite') || undefined;
  const isGold = (wedding?.package || 'silver') === 'gold';
  // Silver: invite param is encoded invite params (maxGuests etc.)
  // Gold: invite param is the guest token slug (e.g. "john-doe-a3f2")
  const inviteParams = !isGold && inviteParam ? decodeInviteParams(inviteParam) : null;
  const guestToken = isGold ? inviteParam : undefined;
  const [hasEntered, setHasEntered] = useState(false);
  const musicUrl = wedding?.musicUrl || '/A Sky Full of Stars Coldplay violin cover.mp3';
  const { isPlaying, toggle, play } = useAudio(musicUrl);

  const handleEnter = () => {
    play();
    setHasEntered(true);
  };

  useEffect(() => {
    if (wedding?.coupleNames) {
      document.title = `${wedding.coupleNames} - Wedding Invitation`;
    }
    return () => {
      document.title = 'Wedding';
    };
  }, [wedding?.coupleNames]);

  if (loading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="animate-pulse font-cormorant text-charcoal/60">Loading...</div>
      </div>
    );
  }

  if (error || !wedding) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="font-script text-4xl text-charcoal mb-4">Wedding Not Found</h1>
          <p className="font-cormorant text-charcoal/60">
            This invitation link may be incorrect or expired.
          </p>
        </div>
      </div>
    );
  }

  return (
    <WeddingProvider wedding={wedding} maxGuestsFromInvite={inviteParams?.maxGuests} guestToken={guestToken}>
      <div className="min-h-screen bg-cream">
        <AnimatePresence>
          {!hasEntered && <WelcomeScreen onEnter={handleEnter} />}
        </AnimatePresence>

        {hasEntered && (
          <>
            <MusicControl isPlaying={isPlaying} onToggle={toggle} />
            <main>
              <Slideshow />
              {wedding.countdownDate && (
                <section className="py-20 px-4 bg-cream relative overflow-hidden">
                  <div className="max-w-4xl mx-auto text-center">
                    <span className="font-montserrat text-xs tracking-[0.3em] text-gold uppercase">
                      Counting Down To
                    </span>
                    <h2 className="font-script text-4xl md:text-6xl text-charcoal mt-4 mb-10">
                      Our Special Day
                    </h2>
                    <Countdown targetDate={wedding.countdownDate} variant="light" />
                  </div>
                </section>
              )}
              <WeddingDetails />
              <WeddingPayment />
              {isGold && guestToken ? (
                <section className="py-20 px-4" id="rsvp">
                  <div className="max-w-xl mx-auto">
                    <GoldRSVPForm />
                  </div>
                </section>
              ) : isGold && !guestToken ? (
                <section className="py-20 px-4 text-center" id="rsvp">
                  <p className="font-montserrat text-sm text-charcoal/60">
                    Please use your personalized invitation link to RSVP.
                  </p>
                </section>
              ) : (
                <RSVPForm />
              )}
            </main>
            <Footer />
          </>
        )}
      </div>
    </WeddingProvider>
  );
}

export function WeddingPage() {
  return <WeddingContent />;
}
