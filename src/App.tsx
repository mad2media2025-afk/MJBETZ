/**
 * App.tsx — MJBET IPL 2026 Main Orchestrator
 * Premium dark luxury betting platform
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, Target, Clock, Instagram, Mail } from 'lucide-react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import {
  doc, onSnapshot, collection, addDoc,
  query, orderBy, runTransaction, getDoc, updateDoc,
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
import MyNetworks from './components/MyNetworks';
import { SEOSchema } from './components/SEOSchema';
import { fetchLiveMatchData } from './lib/cricketApi';
import { settlePendingBets } from './lib/settleBets';
import type { User, LiveMatch as LiveMatchType, BetSlipItem, PlacedBet } from './types';

// ─── Match data ───────────────────────────────────────────────────────────────

const INIT_MATCH: LiveMatchType = {
  status: 'live',
  startTime: '2026-03-31T19:30:00Z',
  team1: 'Punjab Kings', team2: 'Gujarat Titans',
  team1Short: 'PBKS', team2Short: 'GT',
  team1Color: '#DC143C', team2Color: '#1E90FF',
  score1: 83, wickets1: 2, overs: 9.3, 
  score2: 162, wickets2: 6, overs2: 20.0,
  totalOvers: 20, target: 163,
  crr: 8.74, rrr: 7.62, 
  team1WinProb: 30, team2WinProb: 70,
  matchNote: 'GT 162-6 (20) • PBKS 83-2 (9.3) • Need 80 in 63 balls • Venue: Maharaja Yadavindra Singh International Cricket Stadium, Mullanpur, New Chandigarh',
  lastOverRuns: ['1', '2', '1', '0', '4', '0'],
  batsmen: [
    { name: 'Cooper Connolly', runs: 38, balls: 25, fours: 2, sixes: 3, strikeRate: 152.00, isStriker: true },
  ],
  bowler: { name: 'Rashid Khan', overs: '2.3', wickets: 1, economy: 6.00, runsConceded: 15 },
  lastBall: '0',
  battingTeamId: 1,
  team1Id: 1,
  team2Id: 2,
  currentInnings: 2,
  isLiveFromApi: false,
};

const UPCOMING = [
  { id: 'm4', team1: 'PBKS', team1Name: 'Kings', team2: 'GT', team2Name: 'Titans', time: 'Mar 31, 7:30 PM', odds1: 5.10, odds2: 1.50 },
  { id: 'm5', team1: 'LSG', team1Name: 'Super Giants', team2: 'DC', team2Name: 'Capitals', time: 'Apr 01, 7:30 PM', odds1: 1.85, odds2: 2.00 },
  { id: 'm6', team1: 'RCB', team1Name: 'Bengaluru', team2: 'MI', team2Name: 'Indians', time: 'Apr 02, 7:30 PM', odds1: 1.95, odds2: 1.85 },
];

function uid() { return Math.random().toString(36).slice(2, 10); }

/** Generates a unique 8-char alphanumeric referral code from UID */
function generateReferralCode(firebaseUid: string): string {
  return firebaseUid.slice(0, 8).toUpperCase();
}

/**
 * Checks if current time is Toss Time (6:45 PM - 7:15 PM IST)
 */
function isTossTime(): boolean {
  const now = new Date();
  
  // Convert to IST (UTC+5:30)
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istTime = new Date(now.getTime() + istOffset);
  
  const hours = istTime.getUTCHours();
  const minutes = istTime.getUTCMinutes();
  
  // Toss Window: 18:45 to 19:15 IST
  const timeInMinutes = hours * 60 + minutes;
  const startTime = 18 * 60 + 45; // 6:45 PM
  const endTime = 19 * 60 + 15;   // 7:15 PM
  
  return timeInMinutes >= startTime && timeInMinutes <= endTime;
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
  const [hasDeposited, setHasDeposited] = useState(false);

  // Match & UI
  const [match, setMatch] = useState<LiveMatchType>(INIT_MATCH);
  const matchRef = useRef<LiveMatchType>(INIT_MATCH);
  useEffect(() => { matchRef.current = match; }, [match]);
  const [activeTab, setActiveTab] = useState<'live' | 'upcoming' | 'mybets'>('upcoming');
  const [showDeposit, setShowDeposit] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Bet slip
  const [betSlip, setBetSlip] = useState<BetSlipItem[]>([]);
  const [selectedOdds, setSelectedOdds] = useState<Record<string, string>>({});
  const [isPlacing, setIsPlacing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // History — synced from Firestore in real-time, NOT localStorage
  const [placedBets, setPlacedBets] = useState<PlacedBet[]>([]);

  // Settlement guard: track which match states we've already settled
  const settledRef = useRef<Set<string>>(new Set());

  const depositTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const liveTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // 1. Firebase Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const code = generateReferralCode(firebaseUser.uid);
        const userRef = doc(db, 'users', firebaseUser.uid);

        // Read Firestore doc first — source of truth for name/email
        const snap = await getDoc(userRef);
        const firestoreData = snap.exists() ? snap.data() : null;

        const u: User = {
          uid: firebaseUser.uid,
          name: firestoreData?.name || firebaseUser.displayName || 'User',
          email: firestoreData?.email || firebaseUser.email || '',
          avatar: firebaseUser.photoURL || '',
          referralCode: firestoreData?.referralCode || code,
          isAdmin: firestoreData?.isAdmin || false,
        };
        setUser(u);
        setReferralCode(firestoreData?.referralCode || code);
        localStorage.setItem('mjb_user', JSON.stringify(u));

        if (!snap.exists()) {
          // New doc creation is handled in LoginScreen signup phase.
        } else if (!firestoreData?.referralCode) {
          // Migration: existing user missing referralCode field
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

  // 2c. Check if user has made any deposits (for referral eligibility)
  useEffect(() => {
    if (!user?.uid) return;
    const checkDeposits = async () => {
      try {
        const { getDocs, query: q, where, collection: col } = await import('firebase/firestore');
        const depositsRef = col(db, 'deposits');
        const depositsQ = q(depositsRef, where('uid', '==', user.uid));
        const snap = await getDocs(depositsQ);
        
        let hasApprovedDeposit = false;
        snap.forEach(doc => {
          const deposit = doc.data();
          if (deposit.status === 'approved' && (deposit.amount || 0) >= 250) {
            hasApprovedDeposit = true;
          }
        });
        setHasDeposited(hasApprovedDeposit);
      } catch (e) {
        console.error('Error checking deposits:', e);
      }
    };
    checkDeposits();
  }, [user?.uid]);

  // Auto-show deposit popup 
  useEffect(() => {
    if (!user) return;
    if (sessionStorage.getItem('mjb_deposit_shown')) return;

    // Rate Limiting Logic based on User Type
    const isNewUser = (referralCount === 0 && balance === 0);
    const maxPrompts = isNewUser ? 5 : 3;
    const currentCount = parseInt(localStorage.getItem('mjb_promo_count') || '0', 10);

    if (currentCount >= maxPrompts) return;

    // Pop up instantly for users with 0 balance (e.g. newly registered), otherwise wait 9s
    const popupDelay = balance === 0 ? 1000 : 9000;

    depositTimer.current = setTimeout(() => {
      setShowDeposit(true);
      sessionStorage.setItem('mjb_deposit_shown', '1');
      localStorage.setItem('mjb_promo_count', (currentCount + 1).toString());
    }, popupDelay);

    return () => { if (depositTimer.current) clearTimeout(depositTimer.current); };
  }, [user, balance, referralCount]);

  const showToast = useCallback((msg: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2800);
  }, []);

  // Live match simulation / API polling + settlement trigger
  useEffect(() => {
    if (!user) return;

    const fetchLive = async () => {
      try {
        const newData = await fetchLiveMatchData(matchRef.current);
        setMatch(newData);

        // ── Auto-settle when a team hits >= 95% win probability ──
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

  const totalStake = betSlip.reduce((s, b) => s + b.stake, 0);
  const totalReturn = betSlip.reduce((s, b) => s + b.stake * b.odds, 0);

  const placeBet = useCallback(async () => {
    if (!user?.uid || !betSlip.length) return;
    if (isPlacing) return;
    setIsPlacing(true);

    try {
      const userRef = doc(db, 'users', user.uid);
      const betsCol = collection(db, 'placedBets', user.uid, 'bets');
      const now = Date.now();

      await runTransaction(db, async (transaction) => {
        const userSnap = await transaction.get(userRef);
        const currentBalance: number = userSnap.data()?.balance || 0;
        if (currentBalance < totalStake) {
          throw new Error(`Insufficient balance. Have ₹${currentBalance}, need ₹${totalStake}.`);
        }
        transaction.update(userRef, { balance: currentBalance - totalStake });
      });

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

      setBetSlip([]);
      setSelectedOdds({});
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2500);
    } catch (error: any) {
      console.error('Bet placement failed', error);
      showToast(error?.message || 'Error placing bet.', 'error');
    } finally {
      setIsPlacing(false);
    }
  }, [betSlip, totalStake, user, isPlacing, match, showToast]);

  const handleLogout = async () => { await signOut(auth); };

  if (!user) return <LoginScreen onLogin={() => {}} />;

  // Admin routing
  if (window.location.pathname === '/admin' && user.isAdmin) {
    return (
      <div className="min-h-screen bg-zinc-950 font-sans p-6 text-white max-w-5xl mx-auto">
        <button onClick={() => window.location.href = '/'} className="text-zinc-500 hover:text-white mb-6 font-bold text-xs uppercase tracking-widest">
          ← Back to Game
        </button>
        <AdminDashboard user={user} />
      </div>
    );
  }

  // My Networks routing
  if (window.location.pathname === '/my-networks') {
    return (
      <MyNetworks
        user={user}
        balance={balance}
        referralCode={referralCode}
        referralCount={referralCount}
      />
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans overflow-x-hidden w-full">
      <SEOSchema />

      {/* ── Success overlay ── */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
            className="fixed inset-0 flex items-center justify-center z-[200] bg-black/70 backdrop-blur-sm"
          >
            <div className="bg-zinc-900 border border-emerald-500 rounded-3xl p-10 flex flex-col items-center gap-4 shadow-2xl">
              <CheckCircle className="w-20 h-20 text-emerald-400" />
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
                toast.type === 'error' ? 'bg-red-600 text-white' :
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

      {/* ── Referral popup ── */}
      <AnimatePresence>
        {showReferralPopup && hasDeposited && (
          <ReferralPopup
            referralCode={referralCode}
            onClose={() => setShowReferralPopup(false)}
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

          {activeTab === 'live' && (
            <>
              <LiveMatch match={match} selectedOdds={selectedOdds} onBet={addToBetSlip} />
              {match.status !== 'completed' && (
                <>
                  {isTossTime() && (
                    <div className="mt-5">
                      <TossBetting match={match} selectedOdds={selectedOdds} onBet={addToBetSlip} />
                    </div>
                  )}
                  <div className="mt-5">
                    <BettingMarkets selectedOdds={selectedOdds} onBet={addToBetSlip} status={match.status} />
                  </div>
                </>
              )}
            </>
          )}

          {activeTab === 'upcoming' && (
            <div className="space-y-4">
              <h1 className="text-4xl font-black tracking-tight mb-4">Upcoming Matches</h1>
              {match.status !== 'completed' && isTossTime() && (
                <div className="mb-5">
                  <TossBetting match={match} selectedOdds={selectedOdds} onBet={addToBetSlip} />
                </div>
              )}
              {UPCOMING.map((m, i) => (
                <motion.div key={m.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
                  className="bg-zinc-900 border border-zinc-800/80 rounded-3xl p-5 relative"
                >
                  {i === 0 && (
                    <div className="absolute top-4 right-4 flex items-center gap-1.5 bg-red-500/10 border border-red-500/30 text-red-500 text-[10px] font-black px-2.5 py-1 rounded-full">
                      <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                      LIVE
                    </div>
                  )}
                  <div className="flex justify-center mb-4 text-orange-400 text-xs font-bold gap-2">
                    <Clock className="w-4 h-4" /> {m.time}
                  </div>
                  <div className="flex items-center justify-between mb-5 px-4 text-center">
                    <div className="flex-1">
                      <p className="text-3xl font-black">{m.team1}</p>
                      <p className="text-[10px] text-zinc-500 font-bold uppercase">{m.team1Name}</p>
                    </div>
                    <div className="text-emerald-500 font-black px-4">VS</div>
                    <div className="flex-1">
                      <p className="text-3xl font-black">{m.team2}</p>
                      <p className="text-[10px] text-zinc-500 font-bold uppercase">{m.team2Name}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => addToBetSlip(`up-${m.id}`, `${m.team1} Win`, m.odds1)} className="bg-zinc-950 border border-zinc-800 hover:border-emerald-500/50 p-4 rounded-2xl">
                      <p className="text-xs text-zinc-500 mb-1">{m.team1}</p>
                      <p className="text-3xl font-black text-emerald-400">{m.odds1}</p>
                    </button>
                    <button onClick={() => addToBetSlip(`up-${m.id}`, `${m.team2} Win`, m.odds2)} className="bg-zinc-950 border border-zinc-800 hover:border-emerald-500/50 p-4 rounded-2xl">
                      <p className="text-xs text-zinc-500 mb-1">{m.team2}</p>
                      <p className="text-3xl font-black text-emerald-400">{m.odds2}</p>
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {activeTab === 'mybets' && (
            <div className="space-y-3">
              <h2 className="text-xl font-black mb-2">My Bets</h2>
              {placedBets.length === 0 ? (
                <div className="text-center py-24 text-zinc-600">
                  <Target className="w-12 h-12 mx-auto mb-4 opacity-30" />
                  <p className="font-semibold">No bets yet</p>
                </div>
              ) : (
                placedBets.map((b, i) => (
                  <div key={b.id + i} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex justify-between items-center">
                    <div>
                      <p className="text-sm font-bold">{b.label}</p>
                      <p className="text-[10px] text-zinc-500 uppercase">{b.market}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-orange-400">@{b.odds}</p>
                      <p className="text-xs text-zinc-500">₹{b.stake}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </main>

        <BetSlip
          betSlip={betSlip} totalStake={totalStake} totalReturn={totalReturn}
          balance={balance} isPlacing={isPlacing}
          onRemove={removeFromSlip} onUpdateStake={updateStake}
          onPlace={placeBet} onDeposit={() => setShowDeposit(true)}
        />
      </div>

      {/* ── FOOTER ── */}
      <footer className="mt-20 border-t border-zinc-900 bg-zinc-950 pt-16 pb-20">
        <div className="max-w-[1400px] mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center font-black text-black">MJ</div>
              <span className="text-xl font-black">MJBET <span className="text-emerald-500">2026</span></span>
            </div>
            <p className="text-zinc-500 text-sm max-w-sm">Premium IPL 2026 betting destination. Fast, secure, and luxury-first.</p>
          </div>
          <div className="flex flex-col gap-4 items-center md:items-end">
            <a href="https://www.instagram.com/_mjbooks?igsh=aDNqdml4MDZjOHlv" target="_blank" className="flex items-center gap-3 text-zinc-400 hover:text-emerald-400 transition bg-zinc-900 px-4 py-2 rounded-xl border border-zinc-800">
              <Instagram className="w-5 h-5" />
              <span className="text-sm font-bold">Instagram</span>
            </a>
            <a href="mailto:mjbetz2k26@gmail.com" className="flex items-center gap-3 text-zinc-400 hover:text-emerald-400 transition bg-zinc-900 px-4 py-2 rounded-xl border border-zinc-800">
              <Mail className="w-5 h-5" />
              <span className="text-sm font-bold">Contact Us</span>
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
