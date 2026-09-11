import { InputHTMLAttributes, ReactNode, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: ReactNode;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, icon, className = '', ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            className={`
              w-full rounded-xl border bg-navy-600 px-4 py-2.5 text-sm text-ink
              placeholder:text-muted/60
              transition-all duration-200 ease-out
              focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand
              disabled:opacity-50 disabled:cursor-not-allowed
              ${icon ? 'pl-11' : ''}
              ${error ? 'border-red-500/70 focus:ring-red-500/30 focus:border-red-500' : 'border-line'}
              ${className}
            `}
            {...props}
          />
        </div>
        {error && (
          <p className="mt-1.5 text-sm text-red-400">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;