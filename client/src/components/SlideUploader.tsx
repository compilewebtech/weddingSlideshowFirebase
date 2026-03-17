import { useRef, useState, useEffect, useCallback } from 'react';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { ChevronUp, ChevronDown, X, Upload, Image } from 'lucide-react';
import imageCompression from 'browser-image-compression';
import { storage } from '../lib/firebase';
import type { SlideImage } from '../types';

interface UploadingFile {
  localId: string;
  filename: string;
  progress: number;
}

interface SlideUploaderProps {
  slides: SlideImage[];
  onChange: (slides: SlideImage[]) => void;
  uploadPath: string;
}

export function SlideUploader({ slides, onChange, uploadPath }: SlideUploaderProps) {
  const [uploading, setUploading] = useState<UploadingFile[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Keep a ref to the latest slides so concurrent uploads all append correctly
  const slidesRef = useRef(slides);
  useEffect(() => { slidesRef.current = slides; }, [slides]);

  const uploadFiles = useCallback(
    (files: File[]) => {
      const imageFiles = files.filter((f) => f.type.startsWith('image/'));
      if (!imageFiles.length) return;

      imageFiles.forEach(async (file) => {
        const localId = crypto.randomUUID();
        const uuid = crypto.randomUUID();
        const storagePath = `${uploadPath}/${uuid}-${file.name}`;
        const storageRef = ref(storage, storagePath);

        const compressed = await imageCompression(file, {
          maxSizeMB: 1,
          maxWidthOrHeight: 1920,
          useWebWorker: true,
        });

        const task = uploadBytesResumable(storageRef, compressed);

        setUploading((prev) => [...prev, { localId, filename: file.name, progress: 0 }]);

        task.on(
          'state_changed',
          (snapshot) => {
            const pct = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
            setUploading((prev) =>
              prev.map((u) => (u.localId === localId ? { ...u, progress: pct } : u))
            );
          },
          () => {
            setUploading((prev) => prev.filter((u) => u.localId !== localId));
          },
          async () => {
            const url = await getDownloadURL(task.snapshot.ref);
            setUploading((prev) => prev.filter((u) => u.localId !== localId));
            onChange([...slidesRef.current, { url, caption: '' }]);
          }
        );
      });
    },
    [uploadPath, onChange]
  );

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setDragOver(true); };
  const handleDragLeave = () => setDragOver(false);
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    uploadFiles(Array.from(e.dataTransfer.files));
  };
  const handleBrowse = (e: React.ChangeEvent<HTMLInputElement>) => {
    uploadFiles(Array.from(e.target.files ?? []));
    e.target.value = '';
  };

  const updateCaption = (i: number, caption: string) =>
    onChange(slides.map((s, idx) => (idx === i ? { ...s, caption } : s)));

  const moveUp = (i: number) => {
    if (i === 0) return;
    const next = [...slides];
    [next[i - 1], next[i]] = [next[i], next[i - 1]];
    onChange(next);
  };

  const moveDown = (i: number) => {
    if (i === slides.length - 1) return;
    const next = [...slides];
    [next[i], next[i + 1]] = [next[i + 1], next[i]];
    onChange(next);
  };

  const remove = (i: number) => {
    const url = slides[i].url;
    if (url.startsWith('https://firebasestorage.googleapis.com')) {
      try {
        const pathMatch = new URL(url).pathname.match(/\/o\/(.+)/);
        if (pathMatch) deleteObject(ref(storage, decodeURIComponent(pathMatch[1]))).catch(() => {});
      } catch {}
    }
    onChange(slides.filter((_, idx) => idx !== i));
  };

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
          dragOver
            ? 'border-gold bg-gold/5'
            : 'border-charcoal/20 hover:border-gold/60 hover:bg-cream'
        }`}
      >
        <Upload className="w-8 h-8 text-gold/60 mx-auto mb-3" />
        <p className="font-montserrat text-sm text-charcoal/70">
          Drag &amp; drop images here, or{' '}
          <span className="text-gold underline">browse files</span>
        </p>
        <p className="font-montserrat text-xs text-charcoal/40 mt-1">
          JPG, PNG, WebP, GIF supported
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleBrowse}
        />
      </div>

      {/* In-progress uploads */}
      {uploading.map((u) => (
        <div key={u.localId} className="flex items-center gap-3 p-3 bg-cream/50 rounded border border-gold/20">
          <Image className="w-5 h-5 text-gold/60 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="font-montserrat text-xs text-charcoal/70 truncate mb-1">{u.filename}</p>
            <div className="w-full h-1.5 bg-charcoal/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-gold rounded-full transition-all duration-300"
                style={{ width: `${u.progress}%` }}
              />
            </div>
          </div>
          <span className="font-montserrat text-xs text-charcoal/50 shrink-0">{u.progress}%</span>
        </div>
      ))}

      {/* Existing slides */}
      {slides.map((slide, i) => (
        <div key={`${slide.url}-${i}`} className="flex gap-3 items-start p-3 bg-cream/50 rounded border border-charcoal/10">
          <img
            src={slide.url}
            alt={slide.caption || `Slide ${i + 1}`}
            className="w-20 h-16 object-cover rounded shrink-0 border border-charcoal/10"
          />
          <input
            value={slide.caption}
            onChange={(e) => updateCaption(i, e.target.value)}
            placeholder="Caption (optional)"
            className="flex-1 px-3 py-2 border border-charcoal/20 text-sm font-cormorant self-center"
          />
          <div className="flex flex-col gap-1 shrink-0">
            <button
              type="button"
              onClick={() => moveUp(i)}
              disabled={i === 0}
              className="p-1 text-charcoal/40 hover:text-gold disabled:opacity-20 transition-colors"
              title="Move up"
            >
              <ChevronUp size={16} />
            </button>
            <button
              type="button"
              onClick={() => moveDown(i)}
              disabled={i === slides.length - 1}
              className="p-1 text-charcoal/40 hover:text-gold disabled:opacity-20 transition-colors"
              title="Move down"
            >
              <ChevronDown size={16} />
            </button>
            <button
              type="button"
              onClick={() => remove(i)}
              className="p-1 text-charcoal/40 hover:text-red-600 transition-colors"
              title="Remove"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      ))}

      {slides.length === 0 && uploading.length === 0 && (
        <p className="font-montserrat text-xs text-charcoal/40 text-center py-2">
          No slides yet. Upload images above.
        </p>
      )}
    </div>
  );
}
