import { useState, useEffect, useRef } from 'react';

export const useAudio = (url: string) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const audio = new Audio(url);
    audio.loop = true;
    audio.volume = 0.3;
    audioRef.current = audio;

    audio.addEventListener('canplaythrough', () => {
      setIsLoaded(true);
    });

    return () => {
      audio.pause();
      audio.src = '';
    };
  }, [url]);

  const toggle = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(console.error);
    }
    setIsPlaying(!isPlaying);
  };

  const play = () => {
    if (!audioRef.current || isPlaying) return;
    audioRef.current.play().catch(console.error);
    setIsPlaying(true);
  };

  return { isPlaying, isLoaded, toggle, play };
};
