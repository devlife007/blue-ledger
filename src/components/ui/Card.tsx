import { ReactNode, HTMLAttributes } from 'react';

type CardVariant = 'default' | 'gradient' | 'dark';
type CardPadding = 'none' | 'sm' | 'md' | 'lg';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  padding?: CardPadding;
  border?: boolean;
  hover?: boolean;
  children: ReactNode;
}

const variantStyles: Record<CardVariant, string> = {
  default: 'bg-navy-700 text-ink',
  gradient: 'bg-gradient-to-br from-navy-700 to-navy-800 text-ink',
  dark: 'bg-navy-800 text-ink',
};

const paddingStyles: Record<CardPadding, string> = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
};

export default function Card({
  variant = 'default',
  padding = 'md',
  border = false,
  hover = false,
  children,
  className = '',
  ...props
}: CardProps) {
  return (
    <div
      className={`
        rounded-2xl
        ${variantStyles[variant]}
        ${paddingStyles[padding]}
        ${border ? 'border border-line' : ''}
        ${hover ? 'transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-xl hover:shadow-black/40' : ''}
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  );
}