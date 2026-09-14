import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, LayoutDashboard, Home, Lock } from 'lucide-react';

const Unauthorized: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const from: string | undefined = (location.state as any)?.from?.pathname;

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-navy-950 px-4">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(255,201,40,0.08),transparent_55%)]" />

      <div className="relative w-full max-w-md qng-fade">
        <div className="rounded-3xl border border-line bg-navy-850 p-6 shadow-2xl shadow-black/50 sm:p-8">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="grid h-16 w-16 place-items-center rounded-2xl border border-red-500/30 bg-red-500/10">
              <Lock className="h-7 w-7 text-red-400" />
            </div>
            <div>
              <h1 className="text-[56px] font-black leading-none tracking-tight text-ink">
                403
              </h1>
              <p className="mt-2 text-sm font-medium text-muted">Access denied</p>
            </div>
            <p className="mt-1 max-w-sm text-[14px] leading-relaxed text-muted/80">
              Your account doesn't have permission to view this page. If you think this
              is a mistake, contact your manager.
            </p>
          </div>

          {from && (
            <div className="mt-6 rounded-xl border border-line bg-navy-800 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted/60">
                Requested
              </p>
              <p className="mt-0.5 truncate font-mono text-[13px] text-muted">{from}</p>
            </div>
          )}

          <div className="mt-7 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-line bg-navy-800 py-2.5 text-[14px] font-semibold text-ink transition-colors hover:bg-navy-700"
            >
              <ArrowLeft className="h-4 w-4 text-muted" />
              Go Back
            </button>
            <Link
              to="/login"
              className="flex items-center justify-center gap-2 rounded-xl bg-brand py-2.5 text-[14px] font-bold text-navy-950 shadow-lg shadow-brand/20 transition-all duration-150 hover:bg-brand-bright active:scale-[0.985]"
            >
              <Home className="h-4 w-4" />
              Back to Login
            </Link>
          </div>

          <div className="mt-4 flex items-center justify-center gap-1.5 border-t border-line pt-4">
            <LayoutDashboard className="h-3.5 w-3.5 text-muted/50" />
            <Link
              to="/how-it-works"
              className="text-xs font-medium text-muted/70 transition-colors hover:text-brand"
            >
              Learn about NG Hardware
            </Link>
          </div>
        </div>

        <p className="mt-5 text-center text-xs text-muted/50">
          <span className="inline-flex items-center gap-1.5">
            <ShieldAlert className="h-3.5 w-3.5" />
            © {new Date().getFullYear()} NG Hardware — Kigali · Musanze · Muhanga
          </span>
        </p>
      </div>

      <style>{`
        @keyframes qngFadeUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
        .qng-fade { animation: qngFadeUp .35s cubic-bezier(.22,1,.36,1) both; }
        @media (prefers-reduced-motion: reduce) { .qng-fade { animation: none !important; } }
      `}</style>
    </div>
  );
};

export default Unauthorized;