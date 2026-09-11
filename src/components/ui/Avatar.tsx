type AvatarSize = 'sm' | 'md' | 'lg';

interface AvatarProps {
  src?: string | null;
  alt?: string;
  name?: string;
  size?: AvatarSize;
  className?: string;
}

const sizeMap: Record<AvatarSize, { container: string; text: string }> = {
  sm: { container: 'h-8 w-8', text: 'text-xs' },
  md: { container: 'h-10 w-10', text: 'text-sm' },
  lg: { container: 'h-14 w-14', text: 'text-lg' },
};

function getInitials(name: string) {
  return name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export default function Avatar({ src, alt = '', name = '', size = 'md', className = '' }: AvatarProps) {
  const s = sizeMap[size];

  if (src) {
    return (
      <img
        src={src}
        alt={alt || name}
        className={`${s.container} rounded-full object-cover ring-1 ring-line shadow-sm ${className}`}
      />
    );
  }

  return (
    <div
      className={`
        ${s.container} rounded-full flex items-center justify-center
        bg-gradient-to-br from-brand to-amber-500 text-navy-950 font-bold shadow-md shadow-black/30 ring-1 ring-line
        ${s.text} ${className}
      `}
    >
      {name ? getInitials(name) : '?'}
    </div>
  );
}
