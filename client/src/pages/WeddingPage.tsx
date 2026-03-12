import { useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { decodeInviteParams } from '../utils/inviteLink';
import { AnimatePresence } from 'framer-motion';
import { WelcomeScreen } from '../components/WelcomeScreen';
import { Slideshow } from '../components/Slideshow';
import { WeddingDetails } from '../components/WeddingDetails';
import { RSVPForm } from '../components/RSVPForm';
import { AdminPanel } from '../components/AdminPanel';
import { MusicControl } from '../components/MusicControl';
import { Footer } from '../components/Footer';
import { useAudio } from '../hooks/useAudio';
import { useWedding } from '../hooks/useWeddings';
import { WeddingProvider } from '../contexts/WeddingContext';

function WeddingContent() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const { wedding, loading, error } = useWedding(id || null);
  const inviteToken = searchParams.get('invite');
  const inviteParams = inviteToken ? decodeInviteParams(inviteToken) : null;
  const [hasEntered, setHasEntered] = useState(false);
  const musicUrl = wedding?.musicUrl || '/A Sky Full of Stars Coldplay violin cover.mp3';
  const { isPlaying, toggle, play } = useAudio(musicUrl);

  const handleEnter = () => {
    play();
    setHasEntered(true);
  };

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
    <WeddingProvider wedding={wedding} maxGuestsFromInvite={inviteParams?.maxGuests}>
      <div className="min-h-screen bg-cream">
        <AnimatePresence>
          {!hasEntered && <WelcomeScreen onEnter={handleEnter} />}
        </AnimatePresence>

        {hasEntered && (
          <>
            <MusicControl isPlaying={isPlaying} onToggle={toggle} />
            <main>
              <Slideshow />
              <WeddingDetails />
              <RSVPForm />
            </main>
            <Footer />
            <AdminPanel />
          </>
        )}
      </div>
    </WeddingProvider>
  );
}

export function WeddingPage() {
  return <WeddingContent />;
}
