import { useState } from 'react';
import { Image as ImageIcon, Camera } from 'lucide-react';
import ImageLightbox from './ImageLightbox';

interface ProductImagesProps {
  images: string[];
  productName?: string;
}

export default function ProductImages({ images, productName = 'Product' }: ProductImagesProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  if (!images || images.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 rounded-3xl border-2 border-dashed border-gray-200 bg-gray-50 text-gray-400">
        <Camera className="h-8 w-8 mb-2" />
        <p className="text-sm font-medium">No images</p>
      </div>
    );
  }

  return (
    <>
      <button
        onClick={() => { setLightboxIndex(0); setLightboxOpen(true); }}
        className="relative group overflow-hidden rounded-3xl border border-gray-100 cursor-pointer"
      >
        <img
          src={images[0]}
          alt={productName}
          className="h-48 w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        {images.length > 1 && (
          <span className="absolute top-3 right-3 inline-flex items-center gap-1 rounded-full bg-black/50 backdrop-blur-sm px-2.5 py-1 text-xs font-medium text-white">
            <ImageIcon className="h-3.5 w-3.5" />
            {images.length}
          </span>
        )}
        <span className="absolute bottom-3 left-3 text-xs font-medium text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          Click to view
        </span>
      </button>

      <ImageLightbox
        images={images}
        initialIndex={lightboxIndex}
        open={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
      />
    </>
  );
}
