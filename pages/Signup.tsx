import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import firebase from 'firebase/compat/app';
import { auth, db } from '../firebase';
import { UserRole } from '../types';
import { Mail, Lock, Eye, EyeOff, User, Building2, ArrowRight, Loader2, CheckCircle } from 'lucide-react';

const API_BASE = (import.meta.env.VITE_API_URL as string) || 'http://localhost:5000';

const inputBase =
  'w-full rounded-xl border border-white/10 bg-white/5 py-3.5 pl-11 pr-4 text-sm text-white placeholder:text-slate-500 transition-all outline-none focus:border-blue-400/60 focus:bg-white/10 focus:ring-4 focus:ring-blue-500/15';

const Logo = ({ className }: { className?: string }) => (
  <div className={`flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-600/40 ${className || ''}`}>
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  </div>
);

const Signup: React.FC = () => {
  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const strength = Math.min(4, (password.length >= 8 ? 1 : 0) + (/[a-z]/.test(password) && /[A-Z]/.test(password) ? 1 : 0) + (/\d/.test(password) ? 1 : 0) + (/[^a-zA-Z0-9]/.test(password) ? 1 : 0));
  const strengthLabels = ['Too short', 'Weak', 'Fair', 'Good', 'Strong'];
  const strengthColors = ['bg-white/10', 'bg-red-500', 'bg-amber-500', 'bg-yellow-400', 'bg-emerald-500'];

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }
    if (strength < 3) {
      setError('Please choose a stronger password (8+ chars with letters and numbers).');
      return;
    }

    setLoading(true);
    try {
      const userCredential = await auth.createUserWithEmailAndPassword(email, password);
      const user = userCredential.user;

      if (user) {
        // Multi-tenant key: each Admin's companyId is their uid
        const companyId = user.uid;

        await db.collection('users').doc(user.uid).set({
          uid: user.uid,
          name,
          companyName,
          email,
          role: UserRole.ADMIN,
          companyId,
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        });

        await db.collection('companies').doc(companyId).set(
          {
            companyId,
            companyName,
            ownerUid: user.uid,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true }
        );

        navigate('/admin');
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to create your account. Please try again.');
    } finally {
      // Fire-and-forget sync with Express backend
      firebase.auth().currentUser?.getIdToken().then((idToken) =>
        fetch(`${API_BASE}/api/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
          body: JSON.stringify({ uid: auth.currentUser?.uid, name, email, companyName, role: UserRole.ADMIN }),
        })
      ).catch(() => { /* backend sync is best-effort */ });
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#070b1d] font-sans">
      <style>{`
        @keyframes driftA { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(40px,-50px) scale(1.15)} }
        @keyframes driftB { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(-50px,35px) scale(1.2)} }
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
            <Logo />
            <span className="text-xl font-semibold text-white">WareNova</span>
          </div>

          <div>
            <h1 className="text-4xl xl:text-5xl font-bold leading-tight text-white">
              Set up your workspace
              <span className="block bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">in under 60 seconds.</span>
            </h1>
            <p className="mt-6 max-w-md text-base leading-relaxed text-slate-400">
              Create an admin account, register your company, and give your team a single place to track sales and inventory.
            </p>
            <div className="mt-8 space-y-3">
              {[
                'Real-time sales and stock for your whole team',
                'Instant worker access with role-based controls',
                'One centralized ledger across every branch',
              ].map((feature) => (
                <div key={feature} className="flex items-center gap-3 text-sm text-slate-300">
                  <CheckCircle className="h-5 w-5 shrink-0 text-emerald-400" />
                  {feature}
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Link to="/" className="transition-colors hover:text-blue-400"><ArrowRight className="h-3.5 w-3.5 rotate-180" /></Link>
            <span>© 2026 WareNova · Free to get started</span>
          </div>
        </div>

        {/* Right — form */}
        <div className="flex items-center justify-center p-6 sm:p-10">
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl shadow-blue-950/50 backdrop-blur-xl sm:p-10">
            <div className="mb-8">
              <Logo className="mb-4 lg:hidden" />
              <h2 className="text-2xl font-bold text-white sm:text-3xl">Create your account</h2>
              <p className="mt-2 text-sm text-slate-400">Start tracking your business in minutes.</p>
            </div>

            {error && (
              <div className="mb-6 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                <p className="font-medium">Something went wrong</p>
                <p className="mt-0.5 text-red-200/80">{error}</p>
              </div>
            )}

            <form onSubmit={handleSignup} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-300">Full name</label>
                  <div className="relative">
                    <User className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                    <input type="text" required placeholder="John Doe" value={name} onChange={(e) => setName(e.target.value)} className={inputBase} />
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-300">Company name</label>
                  <div className="relative">
                    <Building2 className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                    <input type="text" required placeholder="Acme Inc." value={companyName} onChange={(e) => setCompanyName(e.target.value)} className={inputBase} />
                  </div>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-300">Email address</label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input type="email" required autoComplete="email" placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} className={inputBase} />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-300">Password</label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input type={showPassword ? 'text' : 'password'} required autoComplete="new-password" placeholder="Create a strong password" value={password} onChange={(e) => setPassword(e.target.value)} className={inputBase + ' pr-12'} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 transition-colors hover:text-white" aria-label={showPassword ? 'Hide password' : 'Show password'}>
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {password && (
                  <div className="mt-2.5">
                    <div className="flex gap-1.5">
                      {[1, 2, 3, 4].map((i) => (
                        <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i <= strength ? strengthColors[strength] : 'bg-white/10'}`} />
                      ))}
                    </div>
                    <p className="mt-1.5 text-xs text-slate-400">
                      Password strength: <span className="font-medium text-slate-200">{strengthLabels[strength]}</span>
                    </p>
                  </div>
                )}
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-300">Confirm password</label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input type={showConfirm ? 'text' : 'password'} required autoComplete="new-password" placeholder="Repeat your password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className={inputBase + ' pr-12'} />
                  <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 transition-colors hover:text-white" aria-label={showConfirm ? 'Hide confirm password' : 'Show confirm password'}>
                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {confirmPassword && password !== confirmPassword && <p className="mt-1.5 text-xs text-red-400">Passwords don't match.</p>}
              </div>

              <label className="flex cursor-pointer select-none items-start gap-2.5 pt-1 text-sm text-slate-300">
                <input type="checkbox" checked={agreeTerms} onChange={(e) => setAgreeTerms(e.target.checked)} className="mt-0.5 h-4 w-4 appearance-none rounded border border-white/20 bg-white/5 transition-all checked:border-blue-500 checked:bg-blue-500" />
                <span>
                  I agree to the{' '}
                  <Link to="/terms-of-ops" className="font-medium text-blue-400 hover:text-blue-300">Terms of Operation</Link>{' '}
                  and{' '}
                  <Link to="/privacy-policy" className="font-medium text-blue-400 hover:text-blue-300">Privacy Policy</Link>.
                </span>
              </label>

              <button type="submit" disabled={loading || !agreeTerms}
                className="group flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/40 transition-all hover:shadow-xl hover:shadow-blue-600/50 hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60">
                {loading ? (<><Loader2 className="h-4 w-4 animate-spin" />Creating account...</>) : (<>Create account<ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" /></>)}
              </button>
            </form>

            <div className="my-7 flex items-center gap-4">
              <div className="h-px flex-1 bg-white/10" />
              <span className="text-xs text-slate-500">or continue with</span>
              <div className="h-px flex-1 bg-white/10" />
            </div>

            <p className="text-center text-sm text-slate-400">
              Already have an account?{' '}
              <Link to="/login" className="font-semibold text-blue-400 transition-colors hover:text-blue-300">Log in</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;