import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { WelcomeScreen } from './components/WelcomeScreen';
import { Slideshow } from './components/Slideshow';
import { WeddingDetails } from './components/WeddingDetails';
//import { OurStory } from './components/OurStory';
import { RSVPForm } from './components/RSVPForm';
import { AdminPanel } from './components/AdminPanel';
import { MusicControl } from './components/MusicControl';
import { Footer } from './components/Footer';
import { useAudio } from './hooks/useAudio';

// Romantic violin music (royalty-free)
const MUSIC_URL = '/A Sky Full of Stars Coldplay violin cover.mp3';

function App() {
  const [hasEntered, setHasEntered] = useState(false);
  const { isPlaying, toggle, play } = useAudio(MUSIC_URL);

  const handleEnter = () => {
    play();
    setHasEntered(true);
  };

  return (
    <div className="min-h-screen bg-cream">
      <AnimatePresence>
        {!hasEntered && (
          <WelcomeScreen onEnter={handleEnter} />
        )}
      </AnimatePresence>

      {hasEntered && (
        <>
          <MusicControl isPlaying={isPlaying} onToggle={toggle} />
          
          <main>
            <Slideshow />
            <WeddingDetails />
            {/*<OurStory />*/}
            <RSVPForm />
          </main>
          
          <Footer />
          <AdminPanel />
        </>
      )}
    </div>
  );
}

export default App;
