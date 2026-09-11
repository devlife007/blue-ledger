import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import firebase from 'firebase/compat/app';
import { auth, db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  User,
  Store,
  ArrowRight,
  Loader2,
  AlertCircle,
  CheckCircle2,
  HardHat,
} from 'lucide-react';

const API_BASE = (import.meta.env.VITE_API_URL as string) || 'http://localhost:5000';

const DEFAULT_COMPANY = 'Quincaillerie Nouvelle Génération';

const DEFAULT_BRANCHES = [
  { name: 'Kigali', location: 'Kigali City', description: 'Main store' },
  { name: 'Musanze', location: 'Musanze District', description: 'Northern store' },
  { name: 'Muhanga', location: 'Muhanga District', description: 'Southern store' },
];

const BG_PHOTO =
  'https://thumbs.dreamstime.com/b/construction-worker-watching-sunset-safety-helmet-industrial-site-city-background-diligent-wearing-observes-395177055.jpg';

const inputBase =
  'w-full rounded-xl border bg-navy-600 py-3 pl-11 pr-11 text-[14px] text-ink placeholder:text-muted/50 transition-all duration-150 outline-none';

const validInput = `${inputBase} border-line focus:border-brand focus:ring-4 focus:ring-brand/15`;
const invalidInput = `${inputBase} border-red-500/70 focus:border-red-500 focus:ring-4 focus:ring-red-500/15`;

type AuthMode = 'signin' | 'signup';

const Auth: React.FC<{ initialMode?: AuthMode }> = ({ initialMode = 'signin' }) => {
  const [mode, setMode] = useState<AuthMode>(initialMode);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState(DEFAULT_COMPANY);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { refreshProfile } = useAuth();

  const passwordTouched = mode === 'signup' && password.length > 0;
  const confirmMismatch = mode === 'signup' && confirmPassword.length > 0 && password !== confirmPassword;

  const strength = Math.min(
    4,
    (password.length >= 8 ? 1 : 0) +
      (/[a-z]/.test(password) && /[A-Z]/.test(password) ? 1 : 0) +
      (/\d/.test(password) ? 1 : 0) +
      (/[^a-zA-Z0-9]/.test(password) ? 1 : 0)
  );
  const strengthLabels = ['Too short', 'Weak', 'Okay', 'Good', 'Strong'];
  const strengthColors = ['#263746', '#DC2626', '#D97706', '#FFC928', '#22C55E'];
  const strengthTextColors = [
    'text-muted',
    'text-red-400',
    'text-amber-400',
    'text-brand',
    'text-emerald-400',
  ];

  const switchMode = (m: AuthMode) => {
    if (m === mode) return;
    setMode(m);
    setError('');
    setSuccess('');
  };

  const handleSignin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const userCredential = await auth.signInWithEmailAndPassword(email, password);
      const user = userCredential.user;
      if (!user) {
        setError("We couldn't start your session. Please try again.");
        return;
      }
      const docSnap = await db.collection('users').doc(user.uid).get();
      if (!docSnap.exists) {
        setError("We can't find an account for you. Please contact your manager.");
        return;
      }
      const userData = docSnap.data() as { role?: UserRole };
      await refreshProfile();
      setSuccess(`Welcome back, ${user.email}!`);
      setTimeout(() => navigate(userData?.role === UserRole.ADMIN ? '/admin' : '/worker'), 900);
    } catch (err: any) {
      setError(err?.message || "We couldn't sign you in. Please check your details and try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (password !== confirmPassword) {
      setError("Your passwords don't match.");
      return;
    }
    if (strength < 3) {
      setError('Please choose a stronger password — 8 or more characters, with letters and numbers.');
      return;
    }

    setLoading(true);
    try {
      const userCredential = await auth.createUserWithEmailAndPassword(email, password);
      const user = userCredential.user;
      if (!user) {
        setError("We couldn't create your account. Please try again.");
        return;
      }

      const companyId = user.uid;
      const finalCompany = companyName.trim() || DEFAULT_COMPANY;

      await db.collection('users').doc(user.uid).set({
        uid: user.uid,
        name,
        companyName: finalCompany,
        email,
        role: UserRole.ADMIN,
        companyId,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      });

      await db.collection('companies').doc(companyId).set(
        {
          companyId,
          companyName: finalCompany,
          ownerUid: user.uid,
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      await Promise.all(
        DEFAULT_BRANCHES.map((b) =>
          db.collection('branches').add({
            companyId,
            name: b.name,
            location: b.location,
            description: b.description,
            isActive: true,
            createdBy: user.uid,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          })
        )
      );

      setSuccess('Your account is ready! Kigali, Musanze and Muhanga are set up for you.');
      await refreshProfile();
      setTimeout(() => navigate('/admin'), 1200);
    } catch (err: any) {
      setError(err?.message || "We couldn't create your account. Please try again.");
    } finally {
      firebase
        .auth()
        .currentUser?.getIdToken()
        .then((idToken) =>
          fetch(`${API_BASE}/api/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
            body: JSON.stringify({
              uid: auth.currentUser?.uid,
              name,
              email,
              companyName: companyName.trim() || DEFAULT_COMPANY,
              companyId: auth.currentUser?.uid,
              role: UserRole.ADMIN,
            }),
          })
        )
        .catch(() => {});
      setLoading(false);
    }
  };

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
    isValid?: boolean;
    showToggle?: { show: boolean; onToggle: () => void };
  }> = ({ icon, type, required, autoComplete, placeholder, value, onChange, isValid, showToggle }) => (
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
        className={isValid === false ? invalidInput : validInput}
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
                <img src="/logo.png" alt="Quincaillerie Nouvelle Génération" className="h-full w-full object-contain" />
              </div>
              <div>
                <p className="text-[15px] font-extrabold leading-tight tracking-tight text-ink">
                  Quincaillerie New Generation
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
              <div className="text-sm font-bold text-ink">Matériaux de construction</div>
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
                <img src="/logo.png" alt="Quincaillerie Nouvelle Génération" className="h-full w-full object-contain" />
              </div>
              <div>
                <div className="text-base font-extrabold tracking-tight text-ink">Quincaillerie NG</div>
                <div className="text-[11px] font-medium text-muted">Nouvelle Génération</div>
              </div>
            </div>

            {(error || success) && (
              <div className="mb-5 qng-fade">
                {error && <Banner tone="error" text={error} />}
                {success && <Banner tone="success" text={success} />}
              </div>
            )}

            {mode === 'signin' ? (
              <form onSubmit={handleSignin} key="signin" className="space-y-4">
                <div>
                  <h1 className="text-[22px] font-extrabold tracking-tight text-ink">Welcome Back</h1>
                  <p className="mt-1 text-sm text-muted">Sign in to your account to continue.</p>
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
                    isValid={email.length > 0}
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
                    isValid={password.length > 0}
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
                  <button
                    type="button"
                    className="text-sm font-semibold text-muted transition-colors hover:text-brand cursor-pointer"
                  >
                    Forgot password?
                  </button>
                </div>

                <SubmitButton loading={loading}>Sign in</SubmitButton>

                <div className="flex items-center gap-3 py-1">
                  <div className="h-px flex-1 bg-line" />
                  <span className="text-xs font-medium text-muted">or</span>
                  <div className="h-px flex-1 bg-line" />
                </div>

                <button
                  type="button"
                  onClick={() => switchMode('signup')}
                  className="w-full rounded-xl border border-line bg-transparent py-2.5 text-[14px] font-semibold text-ink transition-colors hover:border-brand/50 hover:bg-brand/5 hover:text-brand cursor-pointer"
                >
                  Create an Account
                </button>
              </form>
            ) : (
              <form onSubmit={handleSignup} key="signup" className="space-y-3">
                <div>
                  <h1 className="text-[22px] font-extrabold tracking-tight text-ink">Create your account</h1>
                  <p className="mt-1 text-sm text-muted">
                    We'll set up Kigali, Musanze and Muhanga for you right away.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <FieldLabel>Full name</FieldLabel>
                    <AuthField
                      icon={<User className="h-4 w-4" />}
                      type="text"
                      required
                      placeholder="Jean Mugisha"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      isValid={name.length > 0}
                    />
                  </div>
                  <div>
                    <FieldLabel>Store name</FieldLabel>
                    <AuthField
                      icon={<Store className="h-4 w-4" />}
                      type="text"
                      required
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <FieldLabel>Email address</FieldLabel>
                  <AuthField
                    icon={<Mail className="h-4 w-4" />}
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="you@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    isValid={email.length > 0}
                  />
                </div>

                <div>
                  <FieldLabel>Password</FieldLabel>
                  <AuthField
                    icon={<Lock className="h-4 w-4" />}
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="new-password"
                    placeholder="8+ characters, letters & numbers"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    isValid={password.length > 0}
                    showToggle={{ show: showPassword, onToggle: () => setShowPassword(!showPassword) }}
                  />
                  {passwordTouched && (
                    <div className="mt-1.5 qng-fade">
                      <div className="flex gap-1.5">
                        {[1, 2, 3, 4].map((i) => (
                          <div
                            key={i}
                            className="h-1 flex-1 rounded-full transition-colors"
                            style={{ backgroundColor: i <= strength ? strengthColors[strength] : '#263746' }}
                          />
                        ))}
                      </div>
                      <p className="mt-1 text-[11px] text-muted">
                        Password strength:{' '}
                        <span className={`font-semibold ${strengthTextColors[strength]}`}>
                          {strengthLabels[strength]}
                        </span>
                      </p>
                    </div>
                  )}
                </div>

                <div>
                  <FieldLabel>Re-enter password</FieldLabel>
                  <AuthField
                    icon={<Lock className="h-4 w-4" />}
                    type={showConfirm ? 'text' : 'password'}
                    required
                    autoComplete="new-password"
                    placeholder="Type your password again"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    isValid={confirmMismatch ? false : confirmPassword.length > 0}
                    showToggle={{ show: showConfirm, onToggle: () => setShowConfirm(!showConfirm) }}
                  />
                  {confirmMismatch && (
                    <p className="mt-1 text-[11px] font-semibold text-red-400">These passwords don't match.</p>
                  )}
                </div>

                <label className="flex cursor-pointer select-none items-start gap-2 pt-0.5 text-[13px] text-muted">
                  <input
                    type="checkbox"
                    checked={agreeTerms}
                    onChange={(e) => setAgreeTerms(e.target.checked)}
                    className="mt-0.5 h-4 w-4 cursor-pointer accent-brand"
                  />
                  <span>
                    I agree to the{' '}
                    <Link to="/terms-of-ops" className="font-semibold text-brand hover:text-brand-bright">
                      Terms
                    </Link>{' '}
                    and{' '}
                    <Link to="/privacy-policy" className="font-semibold text-brand hover:text-brand-bright">
                      Privacy Policy
                    </Link>
                    .
                  </span>
                </label>

                <SubmitButton loading={loading || !agreeTerms}>Create my account</SubmitButton>

                <div className="flex items-center gap-3 py-1">
                  <div className="h-px flex-1 bg-line" />
                  <span className="text-xs font-medium text-muted">or</span>
                  <div className="h-px flex-1 bg-line" />
                </div>

                <button
                  type="button"
                  onClick={() => switchMode('signin')}
                  className="w-full rounded-xl border border-line bg-transparent py-2.5 text-[14px] font-semibold text-ink transition-colors hover:border-brand/50 hover:bg-brand/5 hover:text-brand cursor-pointer"
                >
                  I already have an account
                </button>
              </form>
            )}

            <p className="mt-4 text-center text-sm text-muted">
              {mode === 'signin' ? (
                <>
                  Don't have an account?{' '}
                  <button
                    type="button"
                    onClick={() => switchMode('signup')}
                    className="font-semibold text-brand transition-colors hover:text-brand-bright cursor-pointer"
                  >
                    Sign up
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => switchMode('signin')}
                    className="font-semibold text-brand transition-colors hover:text-brand-bright cursor-pointer"
                  >
                    Sign in
                  </button>
                </>
              )}
            </p>
          </div>

          <p className="mt-4 text-center text-xs text-muted/70">
            © {new Date().getFullYear()} Quincaillerie Nouvelle Génération — Kigali · Musanze · Muhanga
          </p>
        </div>
      </main>
    </div>
  );
};

export default Auth;