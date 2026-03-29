/**
 * LoginScreen.tsx — Email/Password Authentication Gate
 * Two modes: Create Account | Existing User (Sign In)
 */
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Trophy, Shield, Zap, TrendingUp,
  Eye, EyeOff, Phone, Mail, Lock, User, Gift,
  AlertCircle, RefreshCw,
} from 'lucide-react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  updateProfile,
} from 'firebase/auth';
import {
  doc, setDoc, getDoc, collection, query, where, getDocs,
  updateDoc, increment,
} from 'firebase/firestore';
import { auth, db, googleProvider } from '../lib/firebase';

interface Props { onLogin: () => void; }

/** Generates an 8-char alphanumeric referral code from Firebase UID */
function generateReferralCode(uid: string): string {
  return uid.slice(0, 8).toUpperCase();
}

/** Human-readable Firebase auth errors */
const AUTH_ERRORS: Record<string, string> = {
  'auth/email-already-in-use': 'This email is already registered. Please sign in instead.',
  'auth/weak-password': 'Password must be at least 6 characters.',
  'auth/invalid-email': 'Please enter a valid email address.',
  'auth/user-not-found': 'No account found with this email.',
  'auth/wrong-password': 'Incorrect password. Please try again.',
  'auth/invalid-credential': 'Incorrect email or password. Please try again.',
  'auth/too-many-requests': 'Too many attempts. Please try again later.',
  'auth/network-request-failed': 'Network error. Please check your connection.',
};

export default function LoginScreen({ onLogin }: Props) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [isLoading, setIsLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');

  // ── Sign In fields ──
  const [siEmail, setSiEmail] = useState('');
  const [siPass, setSiPass] = useState('');

  // ── Sign Up fields ──
  const [suName, setSuName] = useState('');
  const [suPhone, setSuPhone] = useState('');
  const [suEmail, setSuEmail] = useState('');
  const [suPass, setSuPass] = useState('');
  const [suRef, setSuRef] = useState('');

  const clearError = () => setError('');

  // ── Google Sign-In (for existing users) ─────────────────────────────────
  const handleGoogleSignIn = async () => {
    setIsLoading(true); clearError();
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const firebaseUser = result.user;
      // Ensure Firestore doc exists for Google users (migration safety)
      const userRef = doc(db, 'users', firebaseUser.uid);
      const snap = await getDoc(userRef);
      if (!snap.exists()) {
        const code = generateReferralCode(firebaseUser.uid);
        await setDoc(userRef, {
          name: firebaseUser.displayName || 'User',
          email: firebaseUser.email || '',
          avatar: firebaseUser.photoURL || '',
          balance: 0,
          referralCode: code,
          referralCount: 0,
          createdAt: new Date().toISOString(),
        });
      }
      onLogin();
    } catch (e: any) {
      if (e.code === 'auth/popup-closed-by-user') { setIsLoading(false); return; }
      setError(AUTH_ERRORS[e.code] || 'Google sign-in failed. Please try again.');
      setIsLoading(false);
    }
  };

  // ── Sign In ──────────────────────────────────────────────────────────────
  const handleSignIn = async () => {
    if (!siEmail.trim() || !siPass) {
      setError('Please fill in all fields.'); return;
    }
    setIsLoading(true); clearError();
    try {
      await signInWithEmailAndPassword(auth, siEmail.trim(), siPass);
      onLogin();
    } catch (e: any) {
      setError(AUTH_ERRORS[e.code] || 'Sign in failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // ── Sign Up ──────────────────────────────────────────────────────────────
  const handleSignUp = async () => {
    if (!suName.trim() || !suPhone.trim() || !suEmail.trim() || !suPass) {
      setError('Please fill in all required fields.'); return;
    }
    if (!/^\d{10}$/.test(suPhone.replace(/\s/g, ''))) {
      setError('Please enter a valid 10-digit phone number.'); return;
    }
    if (suPass.length < 6) {
      setError('Password must be at least 6 characters.'); return;
    }
    setIsLoading(true); clearError();
    try {
      // 1. Create Firebase Auth account
      const cred = await createUserWithEmailAndPassword(auth, suEmail.trim(), suPass);
      const firebaseUser = cred.user;

      // 2. Set display name in Firebase Auth
      await updateProfile(firebaseUser, { displayName: suName.trim() });

      const referralCode = generateReferralCode(firebaseUser.uid);
      const trimmedRef = suRef.trim().toUpperCase();

      let initialBalance = 0;
      let referrerUid: string | null = null;

      // 3. If referral code provided, look up referrer
      if (trimmedRef.length >= 4) {
        try {
          const q = query(
            collection(db, 'users'),
            where('referralCode', '==', trimmedRef)
          );
          const snap = await getDocs(q);
          if (!snap.empty) {
            const referrerDoc = snap.docs[0];
            if (referrerDoc.id !== firebaseUser.uid) {
              referrerUid = referrerDoc.id;
              initialBalance = 100; // Referee gets ₹100 credit
            }
          }
        } catch (refErr) {
          console.warn('Referral lookup failed:', refErr);
        }
      }

      // 4. Create user Firestore document
      await setDoc(doc(db, 'users', firebaseUser.uid), {
        name: suName.trim(),
        email: suEmail.trim().toLowerCase(),
        phone: suPhone.trim(),
        avatar: '',
        balance: initialBalance,
        referralCode,
        referralCount: 0,
        createdAt: new Date().toISOString(),
        ...(referrerUid ? { referredBy: referrerUid, referredByCode: trimmedRef } : {}),
      });

      // 5. If referral is valid — credit referrer & record referral
      if (referrerUid) {
        try {
          // Create referral doc keyed by refereeUid (enables Firestore rule lookup)
          await setDoc(doc(db, 'referrals', firebaseUser.uid), {
            referrerUid,
            refereeUid: firebaseUser.uid,
            refereeName: suName.trim(),
            refereeEmail: suEmail.trim().toLowerCase(),
            status: 'pending', // will immediately flip to rewarded below
            timestamp: Date.now(),
          });

          // Credit referrer: +₹1,000 + referralCount++
          await updateDoc(doc(db, 'users', referrerUid), {
            balance: increment(1000),
            referralCount: increment(1),
          });

          // Mark referral as rewarded
          await updateDoc(doc(db, 'referrals', firebaseUser.uid), {
            status: 'rewarded',
          });
        } catch (creditErr) {
          console.warn('Referral credit failed (continuing):', creditErr);
        }
      }

      // onAuthStateChanged in App.tsx handles state update
      onLogin();
    } catch (e: any) {
      setError(AUTH_ERRORS[e.code] || e.message || 'Registration failed. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[700px] rounded-full bg-emerald-900/15 blur-3xl" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full bg-emerald-950/25 blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm relative z-10"
      >
        {/* Logo */}
        <div className="flex flex-col items-center mb-5">
          <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-2xl flex items-center justify-center shadow-xl shadow-emerald-900/50 mb-3">
            <Trophy className="w-8 h-8 text-black" />
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">
            MJ <span className="text-emerald-400">BETZ</span>
          </h1>
          <p className="text-zinc-500 text-xs mt-0.5">IPL 2026 • Premium Betting Platform</p>
        </div>

        {/* Feature pills */}
        <div className="grid grid-cols-3 gap-2 mb-5">
          {[
            { icon: <Zap className="w-3.5 h-3.5" />, label: 'Instant Payouts' },
            { icon: <TrendingUp className="w-3.5 h-3.5" />, label: 'Live Odds' },
            { icon: <Shield className="w-3.5 h-3.5" />, label: '256-bit Secure' },
          ].map(f => (
            <div key={f.label} className="bg-zinc-900/80 border border-zinc-800/60 rounded-xl p-2.5 flex flex-col items-center gap-1">
              <div className="text-emerald-400">{f.icon}</div>
              <p className="text-[9px] text-zinc-400 font-bold text-center leading-tight">{f.label}</p>
            </div>
          ))}
        </div>

        {/* Auth Card */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden">

          {/* Tab switcher */}
          <div className="flex bg-zinc-950 border-b border-zinc-800 p-1.5 gap-1.5">
            {(['signin', 'signup'] as const).map(m => (
              <button
                key={m}
                onClick={() => { setMode(m); clearError(); setShowPass(false); }}
                className={`flex-1 py-2.5 rounded-2xl text-[11px] font-black transition-all ${
                  mode === m
                    ? 'bg-emerald-500 text-black shadow-sm'
                    : 'text-zinc-500 hover:text-white hover:bg-zinc-800/50'
                }`}
              >
                {m === 'signin' ? 'EXISTING USER' : 'CREATE ACCOUNT'}
              </button>
            ))}
          </div>

          <div className="p-5 space-y-4">
            <AnimatePresence mode="wait">

              {/* ── SIGN IN ── */}
              {mode === 'signin' && (
                <motion.div
                  key="signin"
                  initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 16 }}
                  className="space-y-3"
                >
                  <div>
                    <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mb-1.5 block">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                      <input
                        id="si-email"
                        type="email" value={siEmail}
                        onChange={e => { setSiEmail(e.target.value); clearError(); }}
                        onKeyDown={e => e.key === 'Enter' && handleSignIn()}
                        placeholder="your@email.com"
                        autoComplete="email"
                        className="w-full bg-zinc-950 border border-zinc-700 rounded-xl pl-10 pr-4 py-3 text-white text-sm font-medium focus:border-emerald-500 outline-none transition placeholder:text-zinc-600"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mb-1.5 block">Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                      <input
                        id="si-pass"
                        type={showPass ? 'text' : 'password'} value={siPass}
                        onChange={e => { setSiPass(e.target.value); clearError(); }}
                        onKeyDown={e => e.key === 'Enter' && handleSignIn()}
                        placeholder="Enter your password"
                        autoComplete="current-password"
                        className="w-full bg-zinc-950 border border-zinc-700 rounded-xl pl-10 pr-11 py-3 text-white text-sm font-medium focus:border-emerald-500 outline-none transition placeholder:text-zinc-600"
                      />
                      <button
                        onClick={() => setShowPass(p => !p)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition"
                      >
                        {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* OR divider */}
                  <div className="flex items-center gap-3 pt-1">
                    <div className="flex-1 h-px bg-zinc-800" />
                    <span className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest">OR</span>
                    <div className="flex-1 h-px bg-zinc-800" />
                  </div>

                  {/* Google Sign-In */}
                  <button
                    id="google-signin-btn"
                    onClick={handleGoogleSignIn}
                    disabled={isLoading}
                    className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-50 text-gray-900 font-bold py-3 rounded-xl transition-all shadow-sm active:scale-95 disabled:opacity-60 disabled:cursor-wait"
                  >
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    <span className="text-sm">Continue with Google</span>
                  </button>
                </motion.div>
              )}

              {/* ── SIGN UP ── */}
              {mode === 'signup' && (
                <motion.div
                  key="signup"
                  initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }}
                  className="space-y-3"
                >
                  {/* Full Name */}
                  <div>
                    <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mb-1.5 block">Full Name</label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                      <input
                        id="su-name"
                        type="text" value={suName}
                        onChange={e => { setSuName(e.target.value); clearError(); }}
                        placeholder="Your full name"
                        autoComplete="name"
                        className="w-full bg-zinc-950 border border-zinc-700 rounded-xl pl-10 pr-4 py-3 text-white text-sm font-medium focus:border-emerald-500 outline-none transition placeholder:text-zinc-600"
                      />
                    </div>
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mb-1.5 block">Phone Number</label>
                    <div className="relative">
                      <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                      <input
                        id="su-phone"
                        type="tel" value={suPhone}
                        onChange={e => { setSuPhone(e.target.value.replace(/\D/g, '').slice(0, 10)); clearError(); }}
                        placeholder="10-digit mobile number"
                        autoComplete="tel"
                        className="w-full bg-zinc-950 border border-zinc-700 rounded-xl pl-10 pr-4 py-3 text-white text-sm font-medium focus:border-emerald-500 outline-none transition placeholder:text-zinc-600"
                      />
                    </div>
                  </div>

                  {/* Email */}
                  <div>
                    <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mb-1.5 block">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                      <input
                        id="su-email"
                        type="email" value={suEmail}
                        onChange={e => { setSuEmail(e.target.value); clearError(); }}
                        placeholder="your@email.com"
                        autoComplete="email"
                        className="w-full bg-zinc-950 border border-zinc-700 rounded-xl pl-10 pr-4 py-3 text-white text-sm font-medium focus:border-emerald-500 outline-none transition placeholder:text-zinc-600"
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div>
                    <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mb-1.5 block">Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                      <input
                        id="su-pass"
                        type={showPass ? 'text' : 'password'} value={suPass}
                        onChange={e => { setSuPass(e.target.value); clearError(); }}
                        placeholder="Min. 6 characters"
                        autoComplete="new-password"
                        className="w-full bg-zinc-950 border border-zinc-700 rounded-xl pl-10 pr-11 py-3 text-white text-sm font-medium focus:border-emerald-500 outline-none transition placeholder:text-zinc-600"
                      />
                      <button
                        onClick={() => setShowPass(p => !p)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition"
                      >
                        {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Referral Code (optional) */}
                  <div>
                    <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                      <Gift className="w-3 h-3 text-purple-400" />
                      Referral Code
                      <span className="text-zinc-600 normal-case font-normal">(Optional)</span>
                    </label>
                    <input
                      id="su-ref"
                      type="text" value={suRef}
                      onChange={e => setSuRef(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10))}
                      placeholder="Have a code? Enter here"
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-3 text-white text-sm font-mono tracking-widest focus:border-purple-500 outline-none transition placeholder:text-zinc-600 uppercase text-center"
                    />
                  </div>

                  {/* Welcome bonus banner */}
                  <div className="bg-gradient-to-r from-orange-500/10 to-orange-600/5 border border-orange-500/20 rounded-xl p-3 text-center">
                    <p className="text-orange-400 text-[10px] font-bold uppercase tracking-wider">🎁 Welcome Bonus</p>
                    <p className="text-white font-black text-sm mt-0.5">Get 200% on your First Deposit</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Error message */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 flex items-start gap-2"
                >
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <p className="text-red-400 text-xs font-semibold">{error}</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Submit */}
            <button
              id="auth-submit"
              onClick={mode === 'signin' ? handleSignIn : handleSignUp}
              disabled={isLoading}
              className={`w-full py-3.5 font-black rounded-2xl text-sm transition-all flex items-center justify-center gap-2 ${
                isLoading
                  ? 'bg-zinc-800 text-zinc-500 cursor-wait'
                  : 'bg-emerald-500 text-black hover:bg-emerald-400 active:scale-95 shadow-lg shadow-emerald-900/30'
              }`}
            >
              {isLoading
                ? <><RefreshCw className="w-4 h-4 animate-spin" /> {mode === 'signin' ? 'SIGNING IN...' : 'CREATING ACCOUNT...'}</>
                : mode === 'signin' ? 'SIGN IN' : 'CREATE ACCOUNT'
              }
            </button>

            <p className="text-center text-[10px] text-zinc-600 font-medium leading-relaxed">
              By continuing, you agree to our Terms of Service.<br />Must be 18+ to participate.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
