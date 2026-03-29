/**
 * LoginScreen.tsx — Google Sign-In gate
 * Must authenticate before accessing betting features
 */
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Shield, Zap, TrendingUp } from 'lucide-react';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';
import type { User } from '../types';

interface Props { onLogin: (user: User) => void; }

export default function LoginScreen({ onLogin }: Props) {
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleGoogleLogin = async () => {
    setIsLoggingIn(true);

    try {
      // Strictly use Popup. It is the most reliable method for modern browsers 
      // without triggering 3rd-party Storage Partitioning errors.
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      onLogin({
        uid: user.uid,
        name: user.displayName || 'Demo User',
        email: user.email || '',
        avatar: user.photoURL || 'DU',
      });
    } catch (popupError: any) {
      console.error('Popup sign-in failed/blocked:', popupError);
      setIsLoggingIn(false);

      // Distinguish between user closing the popup vs Browser/Instagram blocking it
      if (popupError.code === 'auth/popup-closed-by-user') {
        // User just closed it manually, do nothing
        return;
      }

      // If the popup was blocked entirely (very common in Instagram/Facebook WebViews)
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      if (isMobile) {
        alert("🔒 Secure Login Blocked!\n\nYou are using an App Browser (like Instagram/Facebook).\n\nPlease tap the 3 dots (⋮) in the top right and select 'Open in System Browser' or 'Open in Chrome/Safari' to login securely.");
      } else {
        alert("🔒 Popup Blocked\n\nPlease allow pop-ups for this website or turn off Shields/Adblockers to sign in with Google.");
      }
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      {/* Background glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-emerald-900/20 blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-3xl p-8 shadow-2xl relative z-10"
      >
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-2xl flex items-center justify-center shadow-xl shadow-emerald-900/50 mb-4">
            <Trophy className="w-8 h-8 text-black" />
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">
            IPL <span className="text-emerald-400">BET</span>
          </h1>
          <p className="text-zinc-500 text-sm mt-1">2026 Season • Premium Platform</p>
        </div>

        {/* Feature pills */}
        <div className="grid grid-cols-3 gap-2 mb-8">
          {[
            { icon: <Zap className="w-4 h-4" />, label: 'Instant\nPayouts' },
            { icon: <TrendingUp className="w-4 h-4" />, label: 'Live\nOdds' },
            { icon: <Shield className="w-4 h-4" />, label: '256-bit\nSecure' },
          ].map(f => (
            <div key={f.label} className="bg-zinc-800/60 rounded-2xl p-3 flex flex-col items-center gap-1.5">
              <div className="text-emerald-400">{f.icon}</div>
              <p className="text-[9px] text-zinc-400 font-bold text-center leading-tight whitespace-pre-line">{f.label}</p>
            </div>
          ))}
        </div>

        {/* Bonus banner */}
        <div className="bg-gradient-to-r from-orange-500/20 to-orange-600/10 border border-orange-500/30 rounded-2xl p-4 mb-6 text-center">
          <p className="text-orange-400 text-xs font-bold uppercase tracking-wider mb-1">🎁 Welcome Bonus</p>
          <p className="text-white font-black text-lg">Get upto 200% bonus</p>
          <p className="text-zinc-400 text-xs mt-0.5">on your first deposit</p>
        </div>

        {/* Sign-in button */}
        <button
          onClick={handleGoogleLogin}
          disabled={isLoggingIn}
          className={`w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-100 text-gray-900 font-bold py-3.5 rounded-2xl transition-all shadow-lg mb-3 ${isLoggingIn ? 'opacity-80 cursor-wait' : 'active:scale-95'
            }`}
        >
          {isLoggingIn ? (
            <svg className="animate-spin w-5 h-5 text-gray-900" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
          ) : (
            <>
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Sign in with Google
            </>
          )}
        </button>

        <p className="text-center text-[10px] text-zinc-600 font-medium">
          By signing in, you agree to our Terms of Service.<br />
        </p>
      </motion.div>
    </div>
  );
}
