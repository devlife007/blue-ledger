import React, { useState, useEffect } from 'react';
import firebase from 'firebase/compat/app';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';
import { bootstrapAdmin } from '../services/bootstrapAdmin';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Loader2,
  AlertCircle,
  CheckCircle2,
  HardHat,
  ShieldCheck,
} from 'lucide-react';

const BG_PHOTO =
  'https://thumbs.dreamstime.com/b/construction-worker-watching-sunset-safety-helmet-industrial-site-city-background-diligent-wearing-observes-395177055.jpg';

const inputBase =
  'w-full rounded-xl border bg-navy-600 py-3 pl-11 pr-11 text-[14px] text-ink placeholder:text-muted/50 transition-all duration-150 outline-none';

const validInput = `${inputBase} border-line focus:border-brand focus:ring-4 focus:ring-brand/15`;

type SignInRole = 'admin' | 'worker';

// ---- Stable sub-components (module scope on purpose: defining these inside
// the Auth component would give them a new function identity on every render,
// causing React to unmount/remount the inputs and drop focus while typing).
type BannerTone = 'error' | 'success';

const Banner: React.FC<{ tone: BannerTone; text: string }> = ({ tone, text }) => {
  const isError = tone === 'error';
  return (
    <div
      className={`flex items-start gap-3 rounded-xl px-3.5 py-2.5 text-[13px] ring-1 ${
        isError ? 'bg-red-500/10 text-red-300 ring-red-500/30' : 'bg-emerald-500/10 text-emerald-300 ring-emerald-500/30'
      }`}
      role="alert"
    >
      {isError ? (
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
      ) : (
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
      )}
      <p className="leading-relaxed">{text}</p>
    </div>
  );
};

const FieldLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <label className="mb-1 block text-[13px] font-medium text-ink/80">{children}</label>
);

const SubmitButton: React.FC<{ loading: boolean; children: React.ReactNode }> = ({ loading, children }) => (
  <button
    type="submit"
    disabled={loading}
    className="group flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-3 text-[14px] font-bold text-navy-950 shadow-lg shadow-brand/20 transition-all duration-150 hover:bg-brand-bright hover:shadow-brand/30 active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
  >
    {loading ? (
      <>
        <Loader2 className="h-4 w-4 animate-spin" />
        {children}
      </>
    ) : (
      <>
        {children}
        <ArrowRight className="h-4 w-4 transition-transform duration-150 group-hover:translate-x-0.5" />
      </>
    )}
  </button>
);

const AuthField: React.FC<{
  icon: React.ReactNode;
  type: string;
  required?: boolean;
  autoComplete?: string;
  placeholder: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  showToggle?: { show: boolean; onToggle: () => void };
}> = ({ icon, type, required, autoComplete, placeholder, value, onChange, showToggle }) => (
  <div className="relative">
    <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted">
      {icon}
    </span>
    <input
      type={type}
      required={required}
      autoComplete={autoComplete}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      className={validInput}
    />
    {showToggle && (
      <button
        type="button"
        onClick={showToggle.onToggle}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 text-muted transition-colors hover:text-brand cursor-pointer"
        aria-label={showToggle.show ? 'Hide' : 'Show'}
      >
        {showToggle.show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    )}
  </div>
);

const ROLE_OPTIONS: { id: SignInRole; label: string; icon: React.ReactNode }[] = [
  { id: 'admin', label: 'Admin', icon: <ShieldCheck className="h-4 w-4" /> },
  { id: 'worker', label: 'Worker', icon: <HardHat className="h-4 w-4" /> },
];

const Auth: React.FC = () => {
  const [role, setRole] = useState<SignInRole>('admin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetting, setResetting] = useState(false);
  const navigate = useNavigate();
  const { user, profile, loading: authLoading, refreshProfile } = useAuth();

  useEffect(() => {
    if (authLoading) return;
    if (!user) return;
    if (!profile) return; // no role/profile yet -> stay here so handleSignin's error stays visible
    const target = profile.role === UserRole.ADMIN ? '/admin' : '/worker';
    navigate(target, { replace: true });
  }, [authLoading, user, profile, navigate]);

  const handleSignin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const userCredential = await auth.signInWithEmailAndPassword(email, password);
      const fireUser = userCredential.user;
      if (!fireUser) {
        setError("We couldn't start your session. Please try again.");
        return;
      }
      const docSnap = await db.collection('users').doc(fireUser.uid).get();
      let userData: { role?: UserRole } | Record<string, unknown> | null = null;

      if (docSnap.exists) {
        userData = docSnap.data();
      } else {
        // Console-created admin hasn't been provisioned yet. The deployed
        // rules whitelist a client-side admin bootstrap (companies/{uid} +
        // users/{uid} + standard branches), so we run it directly — no Cloud
        // Function / billing plan required.
        const provisioned = await bootstrapAdmin(fireUser, 'NG Hardware');
        if (provisioned) userData = provisioned as Record<string, unknown>;
      }

      if (!userData) {
        await auth.signOut();
        setError(
          "We can't find an account for you. Admins must have a users/{uid} profile in Firestore; workers are invited by an admin."
        );
        return;
      }
      const actualRole: SignInRole = userData.role === UserRole.ADMIN ? 'admin' : 'worker';

      if (actualRole !== role) {
        await auth.signOut();
        setError(
          role === 'admin'
            ? 'This is not an admin account. Switch the role to Worker and try again.'
            : 'This is an admin account. Switch the role to Admin and try again.'
        );
        return;
      }

      await refreshProfile();
      setSuccess(`Welcome back, ${fireUser.email}!`);
      setTimeout(() => navigate(actualRole === 'admin' ? '/admin' : '/worker'), 800);
    } catch (err: any) {
      setError(err?.message || "We couldn't sign you in. Please check your details and try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    setError('');
    setSuccess('');
    const target = email.trim();
    if (!target) {
      setError('Enter your email address first, then click "Forgot password?".');
      return;
    }
    setResetting(true);
    try {
      // Verify the email maps to an admin account before sending a reset.
      // Done via a Cloud Function because an anonymous client-side query on
      // `users` is (correctly) denied by Firestore rules.
      const check = auth.app.functions().httpsCallable('forgotPassword');
      const result = await check({ email: target });
      const ok = Boolean((result as any)?.data?.ok);
      if (!ok) {
        setError('No admin account was found with this email.');
        return;
      }
      await auth.sendPasswordResetEmail(target);
      setSuccess(`Password reset link sent to ${target}. Check your inbox.`);
    } catch (err: any) {
      setError(err?.message || 'We could not send a reset email. Please try again.');
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full flex-col bg-navy-950 lg:flex-row">
      <style>{`
        @keyframes qngFadeUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
        .qng-fade { animation: qngFadeUp .35s cubic-bezier(.22,1,.36,1) both; }
        .qng-kenburns { animation: qngKenburns 24s ease-in-out infinite alternate; }
        @keyframes qngKenburns { from { transform: scale(1); } to { transform: scale(1.12); } }
        @media (prefers-reduced-motion: reduce) {
          .qng-fade { animation: none !important; }
          .qng-kenburns { animation: none !important; }
        }
      `}</style>

      {/* ---- Left inspirational panel (60%) ---- */}
      <aside className="relative hidden w-full overflow-hidden lg:flex lg:w-[60%] lg:min-h-screen">
        <img
          src={BG_PHOTO}
          alt="Construction site"
          className="qng-kenburns pointer-events-none absolute inset-0 h-full w-full scale-105 object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-navy-950 via-navy-950/70 to-navy-950/20" />
        <div className="absolute inset-0 bg-gradient-to-r from-navy-950/80 via-navy-950/40 to-transparent" />

        <div className="relative flex h-full w-full flex-col justify-between p-8 xl:p-12">
          <div className="flex items-start justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-xl bg-white/95 p-1.5 ring-1 ring-line shadow-lg shadow-black/40">
                <img src="/logo.png" alt="NG Hardware" className="h-full w-full object-contain" />
              </div>
              <div>
                <p className="text-[15px] font-extrabold leading-tight tracking-tight text-ink">
                  New Generation Hardware
                </p>
                <p className="text-[12px] font-medium text-brand">Building & hardware supplies</p>
              </div>
            </div>
            <p className="hidden text-[13px] font-semibold tracking-wide text-ink/60 sm:block">
              Build Today <span className="mx-1 text-brand">•</span> Grow Tomorrow
            </p>
          </div>

          <div className="py-12 lg:py-16">
            <h1 className="text-[44px] font-black leading-[1.06] tracking-tight text-ink sm:text-[54px]">
              Stronger Teams.
              <br />
              <span className="text-brand">Greater Projects.</span>
            </h1>
            <p className="mt-5 max-w-md text-[16px] leading-relaxed text-ink/70">
              Run your hardware stores from one place — stock, sales and your team, all under
              control.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-brand text-navy-950 shadow-lg shadow-black/40">
              <HardHat className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-ink">Construction Materials</div>
              <div className="text-xs text-ink/60">Kigali · Musanze · Muhanga, Rwanda</div>
            </div>
          </div>
        </div>
      </aside>

      {/* ---- Right auth panel (40%) ---- */}
      <main className="flex w-full flex-1 items-center justify-center bg-navy-900 px-4 py-10 sm:px-8 lg:w-[40%] lg:py-0">
        <div className="qng-fade w-full max-w-md">
          <div className="rounded-3xl border border-line bg-navy-850 p-6 shadow-2xl shadow-black/50 sm:p-7">
            <div className="mb-5 flex flex-col items-center gap-2 text-center">
              <div className="grid h-14 w-14 place-items-center overflow-hidden rounded-2xl bg-white/95 p-2 ring-1 ring-line shadow-lg shadow-black/40">
                <img src="/logo.png" alt="NG Hardware" className="h-full w-full object-contain" />
              </div>
              <div>
                <div className="text-base font-extrabold tracking-tight text-ink">NG Hardware</div>
                <div className="text-[11px] font-medium text-muted">New Generation</div>
              </div>
            </div>

            {(error || success) && (
              <div className="mb-5 qng-fade">
                {error && <Banner tone="error" text={error} />}
                {success && <Banner tone="success" text={success} />}
              </div>
            )}

            <form onSubmit={handleSignin} className="space-y-4">
              <div>
                <h1 className="text-[22px] font-extrabold tracking-tight text-ink">Welcome Back</h1>
                <p className="mt-1 text-sm text-muted">Choose your role and sign in to continue.</p>
              </div>

              <div>
                <FieldLabel>I am signing in as</FieldLabel>
                <div className="grid grid-cols-2 gap-2 rounded-xl border border-line bg-navy-800 p-1">
                  {ROLE_OPTIONS.map((opt) => {
                    const active = role === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => { setRole(opt.id); setError(''); setSuccess(''); }}
                        aria-pressed={active}
                        className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-[13px] font-semibold transition-colors cursor-pointer ${
                          active ? 'bg-brand text-navy-950 shadow-sm' : 'text-muted hover:text-ink'
                        }`}
                      >
                        {opt.icon}
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <FieldLabel>Username or Email</FieldLabel>
                <AuthField
                  icon={<Mail className="h-4 w-4" />}
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div>
                <FieldLabel>Password</FieldLabel>
                <AuthField
                  icon={<Lock className="h-4 w-4" />}
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  showToggle={{ show: showPassword, onToggle: () => setShowPassword(!showPassword) }}
                />
              </div>

              <div className="flex items-center justify-between">
                <label className="flex cursor-pointer select-none items-center gap-2 text-sm text-muted">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-4 w-4 cursor-pointer accent-brand"
                  />
                  Remember me
                </label>
               
              </div>

              <SubmitButton loading={loading}>Sign in</SubmitButton>
            </form>

            <p className="mt-4 text-center text-xs text-muted/70">
              Accounts are created by your manager. Admins use the account provisioned in Firebase.
            </p>
          </div>

          <p className="mt-4 text-center text-xs text-muted/70">
            © {new Date().getFullYear()} NG Hardware — Kigali · Musanze · Muhanga
          </p>
        </div>
      </main>
    </div>
  );
};

export default Auth;