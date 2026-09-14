import { ReactNode } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import Card from './Card';

interface StatCardProps {
  icon: ReactNode;
  iconGradient?: string;
  label: string;
  value: ReactNode;
  trend?: { value: string; positive: boolean };
  subtitle?: string;
  live?: boolean;
}

export default function StatCard({
  icon,
  label,
  value,
  trend,
  subtitle,
  live = false,
}: StatCardProps) {
  return (
    <Card hover padding="lg">
      <div className="flex items-start justify-between gap-3">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-navy-800 text-brand ring-1 ring-line">
          {icon}
        </div>
        {live && (
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-bold text-emerald-400 ring-1 ring-emerald-500/30">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Live
          </span>
        )}
      </div>

      <p className="mt-4 text-lg font-bold leading-tight tracking-tight text-ink tabular-nums sm:text-xl 2xl:text-2xl">
        {value}
      </p>

      <div className="mt-1.5 flex items-center justify-between gap-2">
        <span className="min-w-0 truncate text-sm font-medium text-muted">{label}</span>
        {trend && (
          <span
            className={`inline-flex shrink-0 items-center gap-0.5 text-xs font-semibold ${
              trend.positive ? 'text-emerald-400' : 'text-red-400'
            }`}
          >
            {trend.positive ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
            {trend.value}
          </span>
        )}
      </div>

      {subtitle && <div className="mt-2 text-xs text-muted/70">{subtitle}</div>}
    </Card>
  );
}