/**
 * MyNetworks.tsx — Referral Network Dashboard
 * Accessible at /my-networks (opens in new tab from Header)
 * Shows: profile, stats, coupon code entry, list of referred users
 */
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Copy, CheckCircle, Trophy, ArrowLeft,
  Gift, Clock, Star, RefreshCw, AlertCircle, ArrowRight,
} from 'lucide-react';
import {
  collection, query, where, getDocs,
  doc, getDoc, updateDoc, increment, setDoc,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { User } from '../types';

interface Props {
  user: User;
  balance: number;
  referralCode: string;
  referralCount: number;
}

interface ReferredUser {
  id: string;
  refereeName: string;
  refereeEmail: string;
  status: 'rewarded' | 'pending';
  timestamp: number;
}

export default function MyNetworks({ user, balance, referralCode, referralCount }: Props) {
  const [referrals, setReferrals] = useState<ReferredUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  // Coupon entry state
  const [couponCode, setCouponCode] = useState('');
  const [couponApplied, setCouponApplied] = useState(false);
  const [couponSubmitting, setCouponSubmitting] = useState(false);
  const [couponError, setCouponError] = useState('');
  const [couponSuccess, setCouponSuccess] = useState(false);

  const shareUrl = `https://mjbet-e4ed1.web.app/?ref=${referralCode}`;
  const totalBonusEarned = referralCount * 1000;

  // ── Check if user already has a referral code applied ───────────────────
  useEffect(() => {
    const checkReferral = async () => {
      try {
        const snap = await getDoc(doc(db, 'users', user.uid));
        if (snap.exists() && snap.data().referredBy) {
          setCouponApplied(true);
        }
      } catch (e) {
        console.error('Referral check error:', e);
      }
    };
    checkReferral();
  }, [user.uid]);

  // ── Fetch referred users ─────────────────────────────────────────────────
  useEffect(() => {
    const fetchReferrals = async () => {
      setLoading(true);
      try {
        const q = query(
          collection(db, 'referrals'),
          where('referrerUid', '==', user.uid)
        );
        const snap = await getDocs(q);
        const refs: ReferredUser[] = snap.docs.map(d => ({
          id: d.id,
          refereeName: d.data().refereeName || 'Anonymous',
          refereeEmail: d.data().refereeEmail || '',
          status: d.data().status as 'rewarded' | 'pending',
          timestamp: d.data().timestamp || 0,
        }));
        setReferrals(refs.sort((a, b) => b.timestamp - a.timestamp));
      } catch (e) {
        console.error('Fetch referrals error:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchReferrals();
  }, [user.uid]);

  // ── Copy referral link ───────────────────────────────────────────────────
  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  // ── Apply coupon code ────────────────────────────────────────────────────
  const handleApplyCoupon = async () => {
    const trimmedCode = couponCode.trim().toUpperCase();
    if (trimmedCode.length < 4) {
      setCouponError('Please enter a valid referral code.'); return;
    }
    setCouponSubmitting(true);
    setCouponError('');
    try {
      // 1. Find referrer by code
      const q = query(
        collection(db, 'users'),
        where('referralCode', '==', trimmedCode)
      );
      const snap = await getDocs(q);
      if (snap.empty) {
        setCouponError('Invalid code. Please check and try again.'); return;
      }
      const referrerDoc = snap.docs[0];
      const referrerUid = referrerDoc.id;
      if (referrerUid === user.uid) {
        setCouponError("You can't use your own referral code!"); return;
      }

      // 2. Double-check user doesn't already have referredBy
      const userSnap = await getDoc(doc(db, 'users', user.uid));
      if (userSnap.exists() && userSnap.data().referredBy) {
        setCouponApplied(true);
        setCouponError('You have already applied a referral code.'); return;
      }

      // 3. Update user doc — add referredBy + ₹100 credit
      await updateDoc(doc(db, 'users', user.uid), {
        referredBy: referrerUid,
        referredByCode: trimmedCode,
        balance: increment(100),
      });

      // 4. Create referral doc (keyed by refereeUid for Firestore rule enforcement)
      await setDoc(doc(db, 'referrals', user.uid), {
        referrerUid,
        refereeUid: user.uid,
        refereeName: user.name,
        refereeEmail: user.email,
        status: 'pending',
        timestamp: Date.now(),
      });

      // 5. Credit referrer: +₹1,000 + referralCount++
      await updateDoc(doc(db, 'users', referrerUid), {
        balance: increment(1000),
        referralCount: increment(1),
      });

      // 6. Mark referral rewarded
      await updateDoc(doc(db, 'referrals', user.uid), { status: 'rewarded' });

      setCouponSuccess(true);
      setCouponApplied(true);
    } catch (e: any) {
      console.error('Coupon apply error:', e);
      setCouponError('Something went wrong. Please try again.');
    } finally {
      setCouponSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans">

      {/* ── Sticky Header ── */}
      <div className="sticky top-0 z-50 bg-zinc-950/95 backdrop-blur-xl border-b border-zinc-800/60">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <button
            onClick={() => window.close()}
            className="flex items-center gap-2 text-zinc-400 hover:text-white transition text-sm font-bold"
          >
            <ArrowLeft className="w-4 h-4" /> Close
          </button>
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-emerald-400" />
            <span className="text-sm font-black text-white tracking-tight">My Networks</span>
          </div>
          <div className="w-16" />
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">

        {/* ── Profile Card ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5"
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center text-2xl font-black text-black border-2 border-emerald-500/30 shrink-0">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-base font-black text-white truncate">{user.name}</p>
              <p className="text-xs text-zinc-500 truncate">{user.email}</p>
              <div className="flex items-center gap-1.5 mt-1">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">Active Player</span>
              </div>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Balance</p>
              <p className="text-lg font-black text-emerald-400">₹{balance.toLocaleString()}</p>
            </div>
          </div>

          {/* Referral code display */}
          <div className="bg-zinc-950/60 border border-zinc-700/50 rounded-2xl p-3.5">
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mb-2">Your Referral Code</p>
            <div className="flex items-center gap-3">
              <div className="flex-1 bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 min-w-0">
                <p className="font-mono font-black text-emerald-400 text-lg tracking-[0.3em]">{referralCode}</p>
                <p className="text-[9px] text-zinc-600 mt-0.5 truncate">{shareUrl}</p>
              </div>
              <button
                onClick={handleCopyLink}
                className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-black transition-all shrink-0 ${
                  copied
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                    : 'bg-emerald-500 text-black hover:bg-emerald-400 active:scale-95'
                }`}
              >
                {copied ? <CheckCircle className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>
        </motion.div>

        {/* ── Stats ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="grid grid-cols-2 gap-3"
        >
          {[
            {
              label: 'Friends Referred',
              value: referralCount,
              icon: <Users className="w-5 h-5" />,
              color: 'text-blue-400',
              bg: 'bg-blue-500/10',
              border: 'border-blue-500/20',
            },
            {
              label: 'Bonus Earned',
              value: `₹${totalBonusEarned.toLocaleString()}`,
              icon: <Trophy className="w-5 h-5" />,
              color: 'text-emerald-400',
              bg: 'bg-emerald-500/10',
              border: 'border-emerald-500/20',
            },
          ].map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.07 + i * 0.05 }}
              className={`bg-zinc-900 border ${stat.border} rounded-2xl p-4`}
            >
              <div className={`${stat.bg} ${stat.color} w-9 h-9 rounded-xl flex items-center justify-center mb-3 border ${stat.border}`}>
                {stat.icon}
              </div>
              <p className="text-2xl font-black text-white">{stat.value}</p>
              <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mt-1">{stat.label}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* ── Enter Coupon Code ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className={`bg-zinc-900 border rounded-3xl p-5 transition-opacity ${
            couponApplied ? 'border-zinc-700/40 opacity-60' : 'border-purple-500/25'
          }`}
        >
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center border ${
              couponApplied
                ? 'bg-zinc-800 border-zinc-700'
                : 'bg-purple-500/10 border-purple-500/20'
            }`}>
              <Gift className={`w-4 h-4 ${couponApplied ? 'text-zinc-500' : 'text-purple-400'}`} />
            </div>
            <div>
              <p className={`text-sm font-black ${couponApplied ? 'text-zinc-400' : 'text-white'}`}>
                {couponApplied ? 'Referral Code Applied ✓' : 'Enter a Coupon Code'}
              </p>
              <p className="text-[10px] text-zinc-600 font-medium">
                {couponApplied
                  ? 'You have already used a referral code.'
                  : "Have a friend's code? Enter it below."}
              </p>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {couponSuccess ? (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4 flex items-center gap-3"
              >
                <CheckCircle className="w-6 h-6 text-emerald-400 shrink-0" />
                <div>
                  <p className="text-sm font-black text-emerald-400">Code Applied!</p>
                  <p className="text-xs text-zinc-400 mt-0.5">Credits have been added to your wallet.</p>
                </div>
              </motion.div>
            ) : (
              <motion.div key="input" className={couponApplied ? 'pointer-events-none' : ''}>
                <div className="flex gap-2">
                  <input
                    id="coupon-input"
                    type="text"
                    value={couponCode}
                    onChange={e => {
                      setCouponCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10));
                      setCouponError('');
                    }}
                    placeholder={couponApplied ? 'Already applied' : 'Enter referral code'}
                    disabled={couponApplied}
                    className="flex-1 bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-3 text-white text-sm font-mono tracking-widest focus:border-purple-500 outline-none transition placeholder:text-zinc-600 uppercase text-center disabled:opacity-40 disabled:cursor-not-allowed"
                  />
                  <button
                    id="coupon-apply-btn"
                    onClick={handleApplyCoupon}
                    disabled={couponApplied || couponSubmitting || couponCode.length < 4}
                    className={`flex items-center gap-1.5 px-5 py-3 rounded-xl text-xs font-black transition-all shrink-0 ${
                      couponApplied || couponCode.length < 4
                        ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
                        : couponSubmitting
                          ? 'bg-purple-800 text-white cursor-wait'
                          : 'bg-purple-600 hover:bg-purple-500 text-white active:scale-95'
                    }`}
                  >
                    {couponSubmitting
                      ? <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      : <ArrowRight className="w-3.5 h-3.5" />
                    }
                    APPLY
                  </button>
                </div>
                {couponError && (
                  <motion.p
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-red-400 text-xs mt-2 flex items-center gap-1.5"
                  >
                    <AlertCircle className="w-3 h-3 shrink-0" /> {couponError}
                  </motion.p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* ── Referral Network List ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden"
        >
          <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-black text-white">Your Network</h2>
              <p className="text-[10px] text-zinc-500 mt-0.5">People who joined using your referral code</p>
            </div>
            <div className="bg-zinc-800 px-2.5 py-1 rounded-full text-[10px] font-black text-zinc-400">
              {referrals.length} {referrals.length === 1 ? 'member' : 'members'}
            </div>
          </div>

          {loading ? (
            <div className="py-16 flex justify-center">
              <RefreshCw className="w-6 h-6 text-emerald-500 animate-spin" />
            </div>
          ) : referrals.length === 0 ? (
            <div className="py-16 flex flex-col items-center text-center px-6">
              <div className="w-14 h-14 bg-zinc-800/60 rounded-2xl flex items-center justify-center mb-4">
                <Users className="w-7 h-7 text-zinc-600" />
              </div>
              <p className="text-sm font-bold text-zinc-400">No referrals yet</p>
              <p className="text-xs text-zinc-600 mt-1.5 leading-relaxed">
                Share your referral code with friends.<br />When they sign up, they'll appear here.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-800/60">
              {referrals.map((ref, i) => (
                <motion.div
                  key={ref.id}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="px-5 py-4 flex items-center gap-4 hover:bg-zinc-800/20 transition-colors"
                >
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-zinc-700 to-zinc-800 border border-zinc-700 flex items-center justify-center text-sm font-black text-white shrink-0">
                    {ref.refereeName.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white truncate">{ref.refereeName}</p>
                    <p className="text-[11px] text-zinc-500 truncate">{ref.refereeEmail}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <Clock className="w-3 h-3 text-zinc-700" />
                      <p className="text-[10px] text-zinc-600">
                        {new Date(ref.timestamp).toLocaleDateString('en-IN', {
                          day: 'numeric', month: 'short', year: 'numeric',
                        })}
                      </p>
                    </div>
                  </div>
                  <span className={`text-[10px] font-black px-2.5 py-1 rounded-full shrink-0 ${
                    ref.status === 'rewarded'
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                      : 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/30'
                  }`}>
                    {ref.status === 'rewarded' ? '✓ JOINED' : 'PENDING'}
                  </span>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>

        {/* ── How It Works ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5"
        >
          <p className="text-sm font-black text-white mb-4 flex items-center gap-2">
            <Star className="w-4 h-4 text-yellow-400" /> How It Works
          </p>
          <div className="space-y-3">
            {[
              'Share your unique referral code or link with friends.',
              'When your friend signs up using your code, they receive credits instantly.',
              'You receive a bonus credited to your account automatically.',
              'Wager your credits on matches to unlock withdrawals and keep winning!',
            ].map((text, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-[10px] font-black text-emerald-400 shrink-0 mt-0.5">
                  {i + 1}
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">{text}</p>
              </div>
            ))}
          </div>
        </motion.div>

        <div className="pb-8" />
      </div>
    </div>
  );
}
