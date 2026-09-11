function Pulse({ className = '' }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-2xl bg-gradient-to-r from-navy-600 via-navy-500 to-navy-600 bg-[length:200%_100%] ${className}`}
    />
  );
}

export function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div className={`rounded-2xl border border-line bg-navy-700 p-6 space-y-4 ${className}`}>
      <Pulse className="h-5 w-1/3" />
      <Pulse className="h-4 w-full" />
      <Pulse className="h-4 w-5/6" />
      <div className="flex gap-3 pt-2">
        <Pulse className="h-8 w-20 rounded-xl" />
        <Pulse className="h-8 w-20 rounded-xl" />
      </div>
    </div>
  );
}

export function SkeletonTable({ rows = 5, className = '' }: { rows?: number; className?: string }) {
  return (
    <div className={`space-y-3 ${className}`}>
      <Pulse className="h-10 w-full rounded-xl" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4 rounded-2xl bg-navy-700 border border-line">
          <Pulse className="h-10 w-10 shrink-0 rounded-xl" />
          <div className="flex-1 space-y-2">
            <Pulse className="h-4 w-1/4" />
            <Pulse className="h-3 w-1/3" />
          </div>
          <Pulse className="h-6 w-16 rounded-full" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonStat({ className = '' }: { className?: string }) {
  return (
    <div className={`rounded-2xl border border-line bg-navy-700 p-6 space-y-3 ${className}`}>
      <div className="flex items-center gap-3">
        <Pulse className="h-10 w-10 rounded-xl" />
        <Pulse className="h-4 w-24" />
      </div>
      <Pulse className="h-8 w-20" />
      <Pulse className="h-3 w-32" />
    </div>
  );
}

export function SkeletonText({ lines = 3, className = '' }: { lines?: number; className?: string }) {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Pulse
          key={i}
          className={`h-4 ${i === lines - 1 ? 'w-3/5' : 'w-full'}`}
        />
      ))}
    </div>
  );
}