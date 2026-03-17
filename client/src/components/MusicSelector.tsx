import { useRef, useState, useEffect } from 'react';
import { Play, Pause, Music } from 'lucide-react';
import { MUSIC_TRACKS } from '../constants/wedding';

interface MusicSelectorProps {
  value: string;
  onChange: (url: string) => void;
}

export function MusicSelector({ value, onChange }: MusicSelectorProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      audioRef.current = null;
    };
  }, []);

  const togglePreview = (url: string) => {
    if (previewUrl === url) {
      audioRef.current?.pause();
      setPreviewUrl(null);
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      const audio = new Audio(url);
      audio.volume = 0.5;
      audio.play();
      audio.onended = () => setPreviewUrl(null);
      audioRef.current = audio;
      setPreviewUrl(url);
    }
  };

  const handleSelect = (url: string) => {
    onChange(url);
  };

  return (
    <div className="space-y-3">
      {MUSIC_TRACKS.map((track) => {
        const isSelected = value === track.url;
        const isPreviewing = previewUrl === track.url;

        return (
          <div
            key={track.url}
            onClick={() => handleSelect(track.url)}
            className={`flex items-center gap-4 p-4 border rounded-lg cursor-pointer transition-all ${
              isSelected
                ? 'border-gold bg-gold/5'
                : 'border-charcoal/20 hover:border-gold/40 bg-white'
            }`}
          >
            {/* Select indicator */}
            <div
              className={`w-4 h-4 rounded-full border-2 flex-shrink-0 transition-colors ${
                isSelected ? 'border-gold bg-gold' : 'border-charcoal/30'
              }`}
            />

            {/* Track info */}
            <div className="flex-1 min-w-0">
              <p className={`font-cormorant text-base font-semibold truncate ${isSelected ? 'text-gold' : 'text-charcoal'}`}>
                {track.label}
              </p>
              <p className="font-montserrat text-xs text-charcoal/50 truncate">
                {track.artist}
              </p>
            </div>

            {/* Preview button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                togglePreview(track.url);
              }}
              className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-colors border ${
                isPreviewing
                  ? 'bg-gold text-white border-gold'
                  : 'border-charcoal/20 text-charcoal/60 hover:border-gold hover:text-gold'
              }`}
              title={isPreviewing ? 'Stop preview' : 'Preview'}
            >
              {isPreviewing ? <Pause size={15} /> : <Play size={15} />}
            </button>
          </div>
        );
      })}

      {!value && (
        <p className="flex items-center gap-2 font-montserrat text-xs text-charcoal/40 pt-1">
          <Music size={14} />
          Select a track for this wedding
        </p>
      )}
    </div>
  );
}
