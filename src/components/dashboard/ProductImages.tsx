import { useState } from 'react';
import { Image as ImageIcon, Camera } from 'lucide-react';
import ImageLightbox from './ImageLightbox';

type ProductImagesSize = 'sm' | 'md' | 'lg';

interface ProductImagesProps {
  images: string[];
  productName?: string;
  size?: ProductImagesSize;
}

const CONTAINER_CLASS: Record<ProductImagesSize, string> = {
  sm: 'h-14 w-14',
  md: 'h-24 w-24',
  lg: 'h-48 w-full',
};

const BADGE_CLASS: Record<ProductImagesSize, string> = {
  sm: 'top-1 right-1 px-1.5 py-0.5 text-[9px]',
  md: 'top-2 right-2 px-2 py-0.5 text-[10px]',
  lg: 'top-3 right-3 px-2.5 py-1 text-xs',
};

const RADIUS_CLASS: Record<ProductImagesSize, string> = {
  sm: 'rounded-lg',
  md: 'rounded-2xl',
  lg: 'rounded-3xl',
};

export default function ProductImages({ images, productName = 'Product', size = 'lg' }: ProductImagesProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  if (!images || images.length === 0) {
    return (
      <div
        className={`flex ${RADIUS_CLASS[size]} flex-col items-center justify-center border-2 border-dashed border-navy-600 bg-navy-800/60 text-muted/70 ${CONTAINER_CLASS[size]}`}
      >
        <Camera className={`${size === 'lg' ? 'h-8 w-8' : 'h-5 w-5'} ${size === 'lg' ? 'mb-2' : ''}`} />
        {size === 'lg' && <p className="text-sm font-medium">No images</p>}
      </div>
    );
  }

  return (
    <>
      <button
        onClick={() => { setLightboxIndex(0); setLightboxOpen(true); }}
        title={`View ${productName} images`}
        className={`group relative block overflow-hidden border border-line bg-navy-800 cursor-pointer ${RADIUS_CLASS[size]} ${CONTAINER_CLASS[size]}`}
      >
        <img
          src={images[0]}
          alt={productName}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-navy-950/70 via-navy-950/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        {images.length > 1 && (
          <span
            className={`absolute inline-flex items-center gap-1 rounded-full bg-navy-950/70 backdrop-blur-sm font-medium text-brand ring-1 ring-brand/30 ${BADGE_CLASS[size]}`}
          >
            <ImageIcon className={size === 'lg' ? 'h-3.5 w-3.5' : 'h-3 w-3'} />
            {images.length}
          </span>
        )}
        {size === 'lg' && (
          <span className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-brand px-3 py-1 text-xs font-bold text-navy-950 opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
            Click to view
          </span>
        )}
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