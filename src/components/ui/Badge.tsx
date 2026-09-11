import { ReactNode } from 'react';

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info';

interface BadgeProps {
  variant?: BadgeVariant;
  children: ReactNode;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: 'bg-white/5 text-muted ring-1 ring-line',
  success: 'bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30',
  warning: 'bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/30',
  danger: 'bg-red-500/15 text-red-400 ring-1 ring-red-500/30',
  info: 'bg-brand/15 text-brand ring-1 ring-brand/30',
};

export default function Badge({ variant = 'default', children, className = '' }: BadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold
        ${variantStyles[variant]}
        ${className}
      `}
    >
      {children}
    </span>
  );
}