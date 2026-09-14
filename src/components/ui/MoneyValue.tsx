interface MoneyValueProps {
  amount: number;
  className?: string;
}

const formatRWF = (amount: number): string =>
  new Intl.NumberFormat('rw-RW', {
    style: 'currency',
    currency: 'RWF',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount || 0);

export default function MoneyValue({ amount, className = '' }: MoneyValueProps) {
  const full = formatRWF(amount);
  const digits = full.replace(/[^\d]/g, '').length;
  const sizeClass =
    digits >= 13 ? 'text-sm sm:text-base' : digits >= 10 ? 'text-base sm:text-lg' : 'text-lg sm:text-xl 2xl:text-2xl';
  return (
    <span
      title={full}
      className={`${sizeClass} inline-block min-w-0 leading-tight tracking-tight tabular-nums ${className}`}
    >
      {full}
    </span>
  );
}