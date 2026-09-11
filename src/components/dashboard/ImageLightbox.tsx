import { useEffect, useCallback, useState } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

interface ImageLightboxProps {
  images: string[];
  initialIndex?: number;
  open: boolean;
  onClose: () => void;
}

export default function ImageLightbox({ images, initialIndex = 0, open, onClose }: ImageLightboxProps) {
  const [current, setCurrent] = useState(initialIndex);

  useEffect(() => {
    setCurrent(initialIndex);
  }, [initialIndex]);

  const goNext = useCallback(() => {
    setCurrent((i) => (i + 1) % images.length);
  }, [images.length]);

  const goPrev = useCallback(() => {
    setCurrent((i) => (i - 1 + images.length) % images.length);
  }, [images.length]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') goNext();
      if (e.key === 'ArrowLeft') goPrev();
    };
    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose, goNext, goPrev]);

  if (!open || images.length === 0) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/80 backdrop-blur-xl">
      <div className="flex items-center justify-between p-4">
        <span className="text-sm font-medium text-white/70">
          {current + 1} / {images.length}
        </span>
        <button
          onClick={onClose}
          className="p-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="flex flex-1 items-center justify-center gap-4 px-4 min-h-0">
        <button
          onClick={goPrev}
          className="p-2 rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition-colors shrink-0 cursor-pointer"
        >
          <ChevronLeft className="h-8 w-8" />
        </button>

        <img
          src={images[current]}
          alt={`Image ${current + 1}`}
          className="max-h-full max-w-full object-contain rounded-2xl"
        />

        <button
          onClick={goNext}
          className="p-2 rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition-colors shrink-0 cursor-pointer"
        >
          <ChevronRight className="h-8 w-8" />
        </button>
      </div>

      {images.length > 1 && (
        <div className="flex items-center justify-center gap-2 p-4">
          {images.map((img, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`
                h-14 w-14 rounded-xl overflow-hidden border-2 transition-all duration-200 cursor-pointer
                ${i === current ? 'border-white scale-110' : 'border-white/20 opacity-60 hover:opacity-100'}
              `}
            >
              <img src={img} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
