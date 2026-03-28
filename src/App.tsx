/**
 * App.tsx — MJBET IPL 2026 Main Orchestrator
 * Premium dark luxury betting platform
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, Target, Clock } from 'lucide-react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import {
  doc, onSnapshot, collection, addDoc,
  query, orderBy, runTransaction, getDoc, setDoc, updateDoc,
} from 'firebase/firestore';
import { auth, db } from './lib/firebase';
import Header from './components/Header';
import LoginScreen from './components/LoginScreen';
import DepositPopup from './components/DepositPopup';
import WithdrawPopup from './components/WithdrawPopup';
import BetSlip from './components/BetSlip';
import LiveMatch from './components/LiveMatch';
import BettingMarkets from './components/BettingMarkets';
import AdminDashboard from './components/AdminDashboard';
import TossBetting from './components/TossBetting';
import ReferralPopup from './components/ReferralPopup';
import ReferralCodeEntry from './components/ReferralCodeEntry';
import { fetchLiveMatchData } from './lib/cricketApi';
import { settlePendingBets } from './lib/settleBets';
import type { User, LiveMatch as LiveMatchType, BetSlipItem, PlacedBet } from './types';

// ─── Match data ───────────────────────────────────────────────────────────────

const INIT_MATCH: LiveMatchType = {
  status: 'live',                         // ← Match is LIVE now
  startTime: '2026-03-28T13:30:00Z',      // ← Backdated
  team1: 'Sunrisers Hyderabad', team2: 'Royal Challengers Bengaluru',
  team1Short: 'SRH', team2Short: 'RCB',
  team1Color: '#F26522', team2Color: '#EC1C24',
  score1: 7, wickets1: 0, overs: 1.0, totalOvers: 20, target: 0,
  crr: 7.0, rrr: 0, team1WinProb: 43, team2WinProb: 57,
  lastOverRuns: [0, 1, 0, 6, 0, 0],
  batsmen: [
    { name: 'Abhishek Sharma', runs: 6, balls: 4, fours: 0, sixes: 1 },
    { name: 'Travis Head *', runs: 1, balls: 2, fours: 0, sixes: 0 },
  ],
  bowler: { name: 'Jacob Duffy *', overs: '1.0', wickets: 0, economy: 7.0 },
  lastBall: '0',
};

const UPCOMING = [
  { id: 'm2', team1: 'MI', team1Name: 'Indians', team2: 'KKR', team2Name: 'Riders', time: 'Mar 29, 7:30 PM', odds1: 1.90, odds2: 1.90 },
  { id: 'm3', team1: 'RR', team1Name: 'Royals', team2: 'CSK', team2Name: 'Super Kings', time: 'Mar 30, 7:30 PM', odds1: 2.05, odds2: 1.80 },
  { id: 'm4', team1: 'PBKS', team1Name: 'Kings', team2: 'GT', team2Name: 'Titans', time: 'Mar 31, 7:30 PM', odds1: 2.20, odds2: 1.65 },
  { id: 'm5', team1: 'LSG', team1Name: 'Super Giants', team2: 'DC', team2Name: 'Capitals', time: 'Apr 01, 7:30 PM', odds1: 1.85, odds2: 2.00 },
];

function uid() { return Math.random().toString(36).slice(2, 10); }

/** Generates a unique 8-char alphanumeric referral code from UID */
function generateReferralCode(firebaseUid: string): string {
  return firebaseUid.slice(0, 8).toUpperCase();
}


// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  // Auth
  const [user, setUser] = useState<User | null>(() => {
    const s = localStorage.getItem('mjb_user');
    return s ? JSON.parse(s) : null;
  });

  // Wallet
  const [balance, setBalance] = useState<number>(0);

  // Referral
  const [referralCode, setReferralCode] = useState<string>('');
  const [referralCount, setReferralCount] = useState<number>(0);
  const [showReferralPopup, setShowReferralPopup] = useState(false);
  const [showReferralEntry, setShowReferralEntry] = useState(false);

  // Match & UI
  const [match, setMatch] = useState<LiveMatchType>(INIT_MATCH);
  const matchRef = useRef<LiveMatchType>(INIT_MATCH);
  useEffect(() => { matchRef.current = match; }, [match]);
  const [activeTab, setActiveTab] = useState<'live' | 'upcoming' | 'mybets'>('upcoming');
  const [showDeposit, setShowDeposit] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Bet slip
  const [betSlip, setBetSlip]         = useState<BetSlipItem[]>([]);
  const [selectedOdds, setSelectedOdds] = useState<Record<string, string>>({});
  const [isPlacing, setIsPlacing]     = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // History — synced from Firestore in real-time, NOT localStorage
  const [placedBets, setPlacedBets] = useState<PlacedBet[]>([]);

  // Settlement guard: track which match states we've already settled
  const settledRef = useRef<Set<string>>(new Set());

  const depositTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const liveTimer    = useRef<ReturnType<typeof setInterval> | null>(null);

  // 1. Firebase Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const code = generateReferralCode(firebaseUser.uid);
        const u: User = {
          uid: firebaseUser.uid,
          name: firebaseUser.displayName || 'User',
          email: firebaseUser.email || '',
          avatar: firebaseUser.photoURL || 'U',
          referralCode: code,
        };
        setUser(u);
        setReferralCode(code);
        localStorage.setItem('mjb_user', JSON.stringify(u));

        // Ensure user doc exists + has referralCode persisted
        const userRef = doc(db, 'users', firebaseUser.uid);
        const snap = await getDoc(userRef);
        if (!snap.exists()) {
          // Brand new user — persist referral code, show code-entry dialog
          await setDoc(userRef, {
            name: firebaseUser.displayName || 'User',
            email: firebaseUser.email || '',
            avatar: firebaseUser.photoURL || 'U',
            balance: 0,
            referralCode: code,
            referralCount: 0,
            createdAt: new Date().toISOString(),
          });
          setShowReferralEntry(true);
        } else if (!snap.data().referralCode) {
          // Existing user missing code (migration) — write it
          await updateDoc(userRef, { referralCode: code });
        }
      } else {
        setUser(null);
        localStorage.removeItem('mjb_user');
      }
    });
    return () => unsubscribe();
  }, []);

  // 2a. Real-time Firestore Balance + Referral Count Sync
  useEffect(() => {
    if (!user?.uid) return;
    const userRef = doc(db, 'users', user.uid);
    const unsub = onSnapshot(userRef, (snap) => {
      if (snap.exists()) {
        setBalance(snap.data().balance || 0);
        setReferralCount(snap.data().referralCount || 0);
      }
    });
    return () => unsub();
  }, [user?.uid]);

  // 2b. Real-time Firestore Placed Bets Sync (replaces localStorage)
  useEffect(() => {
    if (!user?.uid) return;
    const betsCol = collection(db, 'placedBets', user.uid, 'bets');
    const q = query(betsCol, orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const bets: PlacedBet[] = snap.docs.map(d => ({ id: d.id, ...d.data() } as PlacedBet));
      setPlacedBets(bets);
    });
    return () => unsub();
  }, [user?.uid]);

  // Auto-show deposit popup 
  useEffect(() => {
    if (!user) return;
    if (sessionStorage.getItem('mjb_deposit_shown')) return;
    
    // Pop up instantly for users with 0 balance (e.g. newly registered), otherwise wait 9s
    const popupDelay = balance === 0 ? 1000 : 9000;
    
    depositTimer.current = setTimeout(() => {
      setShowDeposit(true);
      sessionStorage.setItem('mjb_deposit_shown', '1');
    }, popupDelay);
    
    return () => { if (depositTimer.current) clearTimeout(depositTimer.current); };
  }, [user, balance]);

  const showToast = useCallback((msg: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2800);
  }, []);

  // Live match simulation / API polling + settlement trigger
  useEffect(() => {
    if (!user) return;

    const fetchLive = async () => {
      try {
        // Task 5a: Pre-match guard — don't poll/simulate while counting down
        if (matchRef.current.status === 'pre-match') {
          if (matchRef.current.startTime && new Date() >= new Date(matchRef.current.startTime)) {
            // Automatically snap to live when time hits!
            setMatch(prev => ({ ...prev, status: 'live' }));
          }
          return;
        }

        const newData = await fetchLiveMatchData(matchRef.current);
        setMatch(newData);

        // ── Task 5: Auto-settle when a team hits >= 95% win probability ──
        const settlementKey = `${newData.team1}-${newData.team2}-${newData.score1}-${newData.wickets1}`;
        if (!settledRef.current.has(settlementKey)) {
          if (newData.team1WinProb >= 95) {
            settledRef.current.add(settlementKey);
            try {
              const result = await settlePendingBets(user.uid, newData.team1);
              if (result.won > 0) showToast(`🏆 ${result.won} bet(s) WON! ₹${result.totalPayout} credited.`, 'success');
              else if (result.lost > 0) showToast(`${result.lost} bet(s) settled as LOST.`, 'info');
            } catch (e) { console.error('Settlement error:', e); }
          } else if (newData.team2WinProb >= 95) {
            settledRef.current.add(settlementKey);
            try {
              const result = await settlePendingBets(user.uid, newData.team2);
              if (result.won > 0) showToast(`🏆 ${result.won} bet(s) WON! ₹${result.totalPayout} credited.`, 'success');
              else if (result.lost > 0) showToast(`${result.lost} bet(s) settled as LOST.`, 'info');
            } catch (e) { console.error('Settlement error:', e); }
          }
        }
      } catch (e) {
        console.error('Fetch Live Error:', e);
      }
    };

    liveTimer.current = setInterval(fetchLive, 5000);
    return () => { if (liveTimer.current) clearInterval(liveTimer.current); };
  }, [user, showToast]);

  // Right-click security
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      e.preventDefault();
      showToast('🔒 Right-click disabled for security.', 'info');
    };
    document.addEventListener('contextmenu', handler);
    return () => document.removeEventListener('contextmenu', handler);
  }, []);

  // Bet slip actions
  const addToBetSlip = useCallback((market: string, label: string, odds: number) => {
    setSelectedOdds(p => ({ ...p, [market]: label }));
    setBetSlip(p => {
      const exists = p.find(b => b.market === market);
      return exists
        ? p.map(b => b.market === market ? { ...b, label, odds } : b)
        : [...p, { id: uid(), market, label, odds, stake: 200 }];
    });
  }, []);

  const removeFromSlip = useCallback((id: string) => {
    setBetSlip(p => {
      const removed = p.find(b => b.id === id);
      if (removed) setSelectedOdds(s => { const n = { ...s }; delete n[removed.market]; return n; });
      return p.filter(b => b.id !== id);
    });
  }, []);

  const updateStake = useCallback((id: string, stake: number) => {
    setBetSlip(p => p.map(b => b.id === id ? { ...b, stake } : b));
  }, []);

  const totalStake  = betSlip.reduce((s, b) => s + b.stake, 0);
  const totalReturn = betSlip.reduce((s, b) => s + b.stake * b.odds, 0);

  const placeBet = useCallback(async () => {
    if (!user?.uid || !betSlip.length) return;
    if (isPlacing) return; // Prevent double-click
    setIsPlacing(true);

    try {
      const userRef = doc(db, 'users', user.uid);
      const betsCol = collection(db, 'placedBets', user.uid, 'bets');
      const now = Date.now();

      // ── Firestore Transaction: atomic balance check + deduct ──
      await runTransaction(db, async (transaction) => {
        const userSnap = await transaction.get(userRef);
        if (!userSnap.exists()) throw new Error('User document not found.');

        const currentBalance: number = userSnap.data().balance || 0;
        if (currentBalance < totalStake) {
          throw new Error(`Insufficient balance. Have ₹${currentBalance}, need ₹${totalStake}.`);
        }

        // Deduct stake atomically
        transaction.update(userRef, { balance: currentBalance - totalStake });
      });

      // ── Write each bet as a Firestore document ──
      const writePromises = betSlip.map((b, i) =>
        addDoc(betsCol, {
          market: b.market,
          label: b.label,
          odds: b.odds,
          stake: b.stake,
          status: 'pending',
          timestamp: now + i,
          createdAt: now + i,
          matchId: `${match.team1Short}v${match.team2Short}`,
          matchLabel: `${match.team1} vs ${match.team2}`,
          uid: user.uid,
        })
      );
      await Promise.all(writePromises);

      // ── Clear slip and show success ──
      setBetSlip([]);
      setSelectedOdds({});
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2500);
    } catch (error: any) {
      console.error('Bet placement failed', error);
      showToast(error?.message || 'Error placing bet. Try again.', 'error');
    } finally {
      setIsPlacing(false);
    }
  }, [betSlip, totalStake, user, isPlacing, match, showToast]);

  const handleLogin = () => { /* Managed by onAuthStateChanged */ };
  const handleLogout = async () => { await signOut(auth); };

  if (!user) return <LoginScreen onLogin={handleLogin} />;

  // Admin routing
  if (window.location.pathname === '/admin') {
    return (
      <div className="min-h-screen bg-zinc-950 font-sans p-6 text-white max-w-5xl mx-auto">
        <button onClick={() => window.location.href = '/'} className="text-zinc-500 hover:text-white mb-6 font-bold text-xs uppercase tracking-widest">
          ← Back to Game
        </button>
        <AdminDashboard user={user} />
      </div>
    );
  }

  return (
    // ADDED: overflow-x-hidden to root to fix horizontal scroll bleed
    <div className="min-h-screen bg-zinc-950 text-white font-sans overflow-x-hidden w-full">

      {/* ── Success overlay ── */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
            className="fixed inset-0 flex items-center justify-center z-[200] bg-black/70 backdrop-blur-sm"
          >
            <div className="bg-zinc-900 border border-emerald-500 rounded-3xl p-10 flex flex-col items-center gap-4 shadow-2xl">
              <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 0.4 }}>
                <CheckCircle className="w-20 h-20 text-emerald-400" />
              </motion.div>
              <p className="text-2xl font-black text-emerald-400">Bet Placed!</p>
              <p className="text-zinc-400 text-sm">Good luck! 🏏</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Toast ── */}
      <AnimatePresence>
        {toast && (
          <motion.div key="toast"
            initial={{ y: -60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -60, opacity: 0 }}
            className={`fixed top-4 left-1/2 -translate-x-1/2 z-[300] px-5 py-2.5 rounded-2xl text-sm font-semibold shadow-xl whitespace-nowrap
              ${toast.type === 'success' ? 'bg-emerald-600 text-white' :
                toast.type === 'error'   ? 'bg-red-600 text-white' :
                                           'bg-zinc-800 border border-zinc-700 text-zinc-300'}`}
          >
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Deposit popup ── */}
      <AnimatePresence>
        {showDeposit && user && (
          <DepositPopup
            user={user}
            onClose={() => setShowDeposit(false)}
            onClosedWithoutDeposit={() => setShowReferralPopup(true)}
          />
        )}
      </AnimatePresence>

      {/* ── Referral popup (shown after deposit popup X'd) ── */}
      <AnimatePresence>
        {showReferralPopup && (
          <ReferralPopup
            referralCode={referralCode}
            onClose={() => setShowReferralPopup(false)}
          />
        )}
      </AnimatePresence>

      {/* ── Referral code entry (shown to new users) ── */}
      <AnimatePresence>
        {showReferralEntry && user && (
          <ReferralCodeEntry
            uid={user.uid}
            onClose={() => setShowReferralEntry(false)}
          />
        )}
      </AnimatePresence>

      {/* ── Withdraw popup ── */}
      <AnimatePresence>
        {showWithdraw && user && (
          <WithdrawPopup user={user} balance={balance} onClose={() => setShowWithdraw(false)} />
        )}
      </AnimatePresence>

      {/* ── Header ── */}
      <Header
        user={user} balance={balance}
        referralCode={referralCode} referralCount={referralCount}
        activeTab={activeTab}
        onTabChange={setActiveTab} onDeposit={() => setShowDeposit(true)}
        onWithdraw={() => setShowWithdraw(true)} onLogout={handleLogout}
      />

      {/* ── Page layout ── */}
      <div className="max-w-[1400px] mx-auto px-3 sm:px-5 py-5 flex gap-5 relative">
        <main className="flex-1 min-w-0 space-y-5">

          {/* LIVE tab */}
          {activeTab === 'live' && (
            <>
              <LiveMatch match={match} selectedOdds={selectedOdds} onBet={addToBetSlip} />
              {match.status === 'completed' ? (
                <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 text-center mt-5">
                  <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4 border border-zinc-700">
                    <CheckCircle className="w-8 h-8 text-zinc-500" />
                  </div>
                  <h3 className="text-xl font-black text-white mb-2">Match Completed</h3>
                  <p className="text-zinc-500 text-sm">All betting markets for this match are now closed and settled.</p>
                </div>
              ) : (
                <>
                  <TossBetting
                    match={match}
                    selectedOdds={selectedOdds}
                    onBet={addToBetSlip}
                    balance={balance}
                  />
                  <div className="mt-5">
                    <BettingMarkets selectedOdds={selectedOdds} onBet={addToBetSlip} status={match.status} />
                  </div>
                </>
              )}
            </>
          )}

          {/* UPCOMING tab */}
          {activeTab === 'upcoming' && (
            <div className="space-y-4">
              <div className="mb-6">
                <h1 className="text-4xl font-black tracking-tight mb-1">Upcoming<br />Matches</h1>
                <div className="flex items-center justify-between mt-2">
                  <p className="text-zinc-400 text-sm">IPL 2026 • Place your bets now</p>
                  <button className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-zinc-800 text-xs text-zinc-400 hover:bg-zinc-800 transition">
                    <Clock className="w-3.5 h-3.5" /> REFRESH
                  </button>
                </div>
              </div>

              {/* Toss Betting card for upcoming match (only if live isn't completed) */}
              {match.status !== 'completed' && (
                <TossBetting
                  match={match}
                  selectedOdds={selectedOdds}
                  onBet={addToBetSlip}
                  balance={balance}
                />
              )}

              {UPCOMING.map((m, i) => (
                <motion.div key={m.id}
                  initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.07 }}
                  className="bg-zinc-900 border border-zinc-800/80 rounded-3xl p-5 relative overflow-hidden"
                >
                  {/* Teams header */}
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex flex-col items-center flex-1">
                      <span className="text-3xl font-black tracking-tight">{m.team1}</span>
                      <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-1">{m.team1Name}</span>
                    </div>
                    <div className="flex flex-col items-center shrink-0 w-14">
                      <span className="text-emerald-400 font-black text-sm">VS</span>
                    </div>
                    <div className="flex flex-col items-center flex-1">
                      <div className="flex items-center gap-1 sm:gap-2">
                        <span className="text-2xl sm:text-3xl font-black tracking-tight">{m.team2}</span>
                        {m.time === 'LIVE' && (
                          <span className="bg-red-500/10 text-red-500 border border-red-500/30 text-[8px] sm:text-[9px] font-black px-1.5 sm:px-2 py-0.5 rounded-full animate-pulse shrink-0">LIVE</span>
                        )}
                      </div>
                      <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-1">{m.team2Name}</span>
                    </div>
                  </div>

                  {/* Odds buttons */}
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: m.team1, full: `${m.team1} Win`, odds: m.odds1 },
                      { label: m.team2, full: `${m.team2} Win`, odds: m.odds2 },
                    ].map(o => (
                      <button key={o.label}
                        onClick={() => addToBetSlip(`upcoming-${m.id}`, o.full, o.odds)}
                        className={`flex flex-col items-center justify-center py-5 rounded-2xl border transition-all ${
                          selectedOdds[`upcoming-${m.id}`] === o.full
                            ? 'bg-emerald-500/10 border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.15)]'
                            : 'bg-zinc-950 border-zinc-800 hover:border-emerald-500/50'
                        }`}
                      >
                        <span className="text-[9px] sm:text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-2 whitespace-nowrap">{o.label}</span>
                        <span className="text-3xl sm:text-4xl font-black text-emerald-400 leading-none">{o.odds}</span>
                        <span className="text-[8px] sm:text-[9px] text-zinc-600 font-bold uppercase tracking-widest mt-2 text-center">Match Winner</span>
                      </button>
                    ))}
                  </div>

                  {/* Live score bar (first) or time badge */}
                  {m.time !== 'LIVE' && (
                    <div className="absolute top-4 right-4 bg-zinc-800 border border-orange-500/20 text-orange-400 text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5">
                      <Clock className="w-3 h-3" /> {m.time}
                    </div>
                  )}
                </motion.div>
              ))}

              <p className="text-center text-[10px] text-zinc-600 font-bold uppercase tracking-widest pt-4 pb-8">
                IPL BET 2026 DEMO • FOR DEMONSTRATION PURPOSES ONLY • NOT REAL MONEY GAMBLING
              </p>
            </div>
          )}

          {/* MY BETS tab */}
          {activeTab === 'mybets' && (
            <div className="space-y-3">
              <h2 className="text-xl font-black mb-2">My Bets</h2>
              {placedBets.length === 0 ? (
                <div className="text-center py-24 text-zinc-600">
                  <Target className="w-12 h-12 mx-auto mb-4 opacity-30" />
                  <p className="font-semibold">No bets placed yet</p>
                  <p className="text-sm mt-1">Go to Live or Upcoming to place bets</p>
                </div>
              ) : (
                placedBets.map((b, i) => (
                  <motion.div key={b.id + i}
                    initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex items-center gap-3"
                  >
                    <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                      b.status === 'won' ? 'bg-emerald-400' :
                      b.status === 'lost' ? 'bg-red-500' : 'bg-yellow-500'}`}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-white truncate">{b.label}</p>
                      <p className="text-[11px] text-zinc-500 capitalize">{b.market}</p>
                    </div>
                    <div className="text-right shrink-0 mr-2">
                      <p className="text-sm font-black text-orange-400">@{b.odds}</p>
                      <p className="text-xs text-zinc-500">₹{b.stake}</p>
                    </div>
                    <span className={`text-[10px] font-black px-2 py-1 rounded-full shrink-0 ${
                      b.status === 'won'  ? 'bg-emerald-500/20 text-emerald-400' :
                      b.status === 'lost' ? 'bg-red-500/20 text-red-400' :
                                            'bg-yellow-500/20 text-yellow-400'}`}
                    >
                      {b.status.toUpperCase()}
                    </span>
                  </motion.div>
                ))
              )}
            </div>
          )}
        </main>

        {/* ── Bet Slip ── */}
        <BetSlip
          betSlip={betSlip} totalStake={totalStake} totalReturn={totalReturn}
          balance={balance} isPlacing={isPlacing}
          onRemove={removeFromSlip} onUpdateStake={updateStake}
          onPlace={placeBet} onDeposit={() => setShowDeposit(true)}
        />
      </div>
    </div>
  );
}
