import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import firebase from 'firebase/compat/app';
import { auth, db } from '../firebase';
import { UserRole } from '../types';
import { Mail, Lock, Eye, EyeOff, ArrowRight, Loader2, CheckCircle } from 'lucide-react';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const userCredential = await auth.signInWithEmailAndPassword(email, password);
      const user = userCredential.user;

      if (user) {
        const docSnap = await db.collection('users').doc(user.uid).get();

        if (docSnap.exists) {
          const userData = docSnap.data() as { role?: UserRole };
          setToast(`Welcome back, ${user.email}!`);
          setTimeout(
            () => navigate(userData?.role === UserRole.ADMIN ? '/admin' : '/worker'),
            900
          );
        } else {
          setError('User profile not found in database. Please contact your administrator.');
        }
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to sign in. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#070b1d] font-sans">
      <style>{`
        @keyframes driftA { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(40px,-50px) scale(1.15)} }
        @keyframes driftB { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(-50px,35px) scale(1.2)} }
        @keyframes floatBag { 0%,100%{transform:translateY(0) rotate(-3deg)} 50%{transform:translateY(-18px) rotate(3deg)} }
        .orb-a{animation:driftA 14s ease-in-out infinite}
        .orb-b{animation:driftB 18s ease-in-out infinite}
      `}</style>

      <div className="pointer-events-none absolute inset-0">
        <div className="orb-a absolute -top-32 -left-32 h-[28rem] w-[28rem] rounded-full bg-blue-600/30 blur-3xl" />
        <div className="orb-b absolute top-1/3 -right-32 h-[26rem] w-[26rem] rounded-full bg-indigo-600/30 blur-3xl" />
        <div className="orb-a absolute -bottom-40 left-1/3 h-[24rem] w-[24rem] rounded-full bg-cyan-500/20 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.06)_1px,transparent_0)] bg-[size:44px_44px]" />
      </div>

      <div className="relative z-10 grid min-h-screen w-full lg:grid-cols-2">
        {/* Left — branding */}
        <div className="hidden flex-col justify-between p-12 xl:p-16 lg:flex">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-600/40">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <span className="text-xl font-semibold text-white">WareNova</span>
          </div>

          <div>
            <h1 className="text-4xl xl:text-5xl font-bold leading-tight text-white">
              Track your inventory,
              <span className="block bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
                tomorrow's insights.
              </span>
            </h1>
            <p className="mt-6 max-w-md text-base leading-relaxed text-slate-400">
              One secure workspace for sales, stock levels and your whole
              team — built to keep your business moving at full speed.
            </p>

            <div className="mt-8 space-y-3">
              {['Sync every sale across branches in real time', 'One trusted sign-in for admins and workers'].map((point) => (
                <div key={point} className="flex items-center gap-3 text-sm text-slate-300">
                  <CheckCircle className="h-5 w-5 shrink-0 text-emerald-400" />
                  {point}
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Link to="/" className="transition-colors hover:text-blue-400">
              <ArrowRight className="h-3.5 w-3.5 rotate-180" />
            </Link>
            <span>© 2026 WareNova · Secure sign in</span>
          </div>
        </div>

        {/* Right — form */}
        <div className="flex items-center justify-center p-6 sm:p-10">
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl shadow-blue-950/50 backdrop-blur-xl sm:p-10">
            <div className="mb-8 lg:mb-10">
              <div className="mb-4 lg:hidden">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-600/40">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
              </div>
              <h2 className="text-2xl font-bold text-white sm:text-3xl">Welcome back</h2>
              <p className="mt-2 text-sm text-slate-400">Sign in to your WareNova workspace.</p>
            </div>

            {error && (
              <div className="mb-6 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                <p className="font-medium">Sign in failed</p>
                <p className="mt-0.5 text-red-200/80">{error}</p>
              </div>
            )}

            {toast && (
              <div className="mb-6 flex items-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
                <CheckCircle className="h-4 w-4 shrink-0" />
                {toast}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-300">Email address</label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="you@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-white/5 py-3.5 pl-11 pr-4 text-sm text-white placeholder:text-slate-500 transition-all outline-none focus:border-blue-400/60 focus:bg-white/10 focus:ring-4 focus:ring-blue-500/15"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-300">Password</label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-white/5 py-3.5 pl-11 pr-12 text-sm text-white placeholder:text-slate-500 transition-all outline-none focus:border-blue-400/60 focus:bg-white/10 focus:ring-4 focus:ring-blue-500/15"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 transition-colors hover:text-white"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="flex cursor-pointer select-none items-center gap-2 text-sm text-slate-300">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-4 w-4 appearance-none rounded border border-white/20 bg-white/5 transition-all checked:border-blue-500 checked:bg-blue-500"
                  />
                  Remember me
                </label>
                <Link to="/" className="text-sm font-medium text-blue-400 transition-colors hover:text-blue-300">
                  Forgot password?
                </Link>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="group flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/40 transition-all hover:shadow-xl hover:shadow-blue-600/50 hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    Sign in
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </>
                )}
              </button>
            </form>

            <div className="my-7 flex items-center gap-4">
              <div className="h-px flex-1 bg-white/10" />
              <span className="text-xs text-slate-500">or continue with</span>
              <div className="h-px flex-1 bg-white/10" />
            </div>

            <p className="text-center text-sm text-slate-400">
              Don't have an account?{' '}
              <Link to="/signup" className="font-semibold text-blue-400 transition-colors hover:text-blue-300">
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;