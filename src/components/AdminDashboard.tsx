/**
 * AdminDashboard.tsx — Secure portal to manage deposits, settle bets, and oversee users
 * Premium Dark Luxury Design
 */
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, Wallet, Activity, Clock, Trophy, Coins, RefreshCw, XCircle
} from 'lucide-react';
import { collection, query, orderBy, getDocs, doc, getDoc, updateDoc, increment, where, collectionGroup } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { DepositRequest, User, PlacedBet } from '../types';

interface Props {
  user: User;
}

export default function AdminDashboard({ user }: Props) {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null); // null = loading
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  
  // Navigation State
  const [mainTab, setMainTab] = useState<'deposits' | 'bets' | 'users'>('deposits');
  const [depositsTab, setDepositsTab] = useState<'pending' | 'history'>('pending');
  const [betsTab, setBetsTab] = useState<'pending' | 'history'>('pending');

  // Data State
  const [deposits, setDeposits] = useState<DepositRequest[]>([]);
  const [bets, setBets] = useState<PlacedBet[]>([]);
  const [usersMap, setUsersMap] = useState<Record<string, User>>({});
  const [allUsers, setAllUsers] = useState<User[]>([]);

  // ── 1. Validate Admin Auth ──
  useEffect(() => {
    if (!user?.uid) { setIsAdmin(false); return; }
    getDoc(doc(db, 'users', user.uid))
      .then(snap => setIsAdmin(snap.exists() ? (snap.data()?.isAdmin === true) : false))
      .catch(() => setIsAdmin(false));
  }, [user?.uid]);

  // ── 2. Global Fetcher ──
  const fetchAllData = async () => {
    setLoading(true);
    try {
      // A. Fetch Users
      const uSnap = await getDocs(collection(db, 'users'));
      const uList: User[] = [];
      const uMap: Record<string, User> = {};
      uSnap.forEach(d => {
        const u = { uid: d.id, ...d.data() } as User;
        uList.push(u);
        uMap[u.uid] = u;
      });
      // Sort users by created descending roughly
      uList.sort((a, b) => {
        const d1 = (a as any).createdAt ? new Date((a as any).createdAt).getTime() : 0;
        const d2 = (b as any).createdAt ? new Date((b as any).createdAt).getTime() : 0;
        return d2 - d1;
      });
      setAllUsers(uList);
      setUsersMap(uMap);

      // B. Fetch Deposits
      try {
        const dSnap = await getDocs(query(collection(db, 'deposits'), orderBy('timestamp', 'desc')));
        const dList: DepositRequest[] = [];
        dSnap.forEach(d => dList.push({ id: d.id, ...d.data() } as DepositRequest));
        setDeposits(dList);
      } catch (e) {
        console.warn('Deposit fetch fallback:', e);
        const dSnap = await getDocs(collection(db, 'deposits'));
        const dList: DepositRequest[] = [];
        dSnap.forEach(d => dList.push({ id: d.id, ...d.data() } as DepositRequest));
        dList.sort((a, b) => b.timestamp - a.timestamp);
        setDeposits(dList);
      }

      // C. Fetch Bets via collectionGroup
      try {
        const bSnap = await getDocs(query(collectionGroup(db, 'bets'), orderBy('timestamp', 'desc')));
        const bList: PlacedBet[] = [];
        bSnap.forEach(b => bList.push({ id: b.id, ...b.data() } as PlacedBet));
        setBets(bList);
      } catch (e) {
        console.warn('Bets fetch fallback (Missing index):', e);
        // Fallback if no order index on collectionGroup
        const bSnap = await getDocs(collectionGroup(db, 'bets'));
        const bList: PlacedBet[] = [];
        bSnap.forEach(b => bList.push({ id: b.id, ...b.data() } as PlacedBet));
        bList.sort((a, b) => b.timestamp - a.timestamp);
        setBets(bList);
      }

    } catch (e) {
      console.error("Admin Fetch Error:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin === true) fetchAllData();
  }, [isAdmin]);

  // ── 3. Handlers ──
  const handleDepositAction = async (deposit: DepositRequest, action: 'approved' | 'rejected') => {
    if (!window.confirm(`Are you sure you want to ${action.toUpperCase()} ₹${deposit.amount} for ${deposit.userEmail}?`)) return;
    setProcessingId(deposit.id);
    try {
      const depRef = doc(db, 'deposits', deposit.id);
      await updateDoc(depRef, { status: action });

      // Deposit Bonus Logic
      if (action === 'approved') {
        const userRef = doc(db, 'users', deposit.uid);
        
        // Check if this is the user's FIRST approved deposit
        const depositsQuery = query(
          collection(db, 'deposits'),
          where('uid', '==', deposit.uid),
          where('status', '==', 'approved')
        );
        const existingApproved = await getDocs(depositsQuery);
        
        // If this is the FIRST approved one, existingApproved.docs.length will be 1 
        // (because we just updated the current one to 'approved' above)
        const isFirstDeposit = existingApproved.docs.length <= 1;

        let creditAmount = deposit.amount;
        // User clarified: First deposit (min 250) gets * 2. 
        if (isFirstDeposit && deposit.amount >= 250) {
          creditAmount = deposit.amount * 2;
        }
        
        await updateDoc(userRef, { balance: increment(creditAmount) });

        // Verify pending referrals
        try {
          const rq = query(collection(db, 'referrals'), 
            where('refereeUid', '==', deposit.uid), 
            where('status', '==', 'pending')
          );
          const rSnap = await getDocs(rq);
          if (!rSnap.empty) {
            const refDoc = rSnap.docs[0];
            const referrerRef = doc(db, 'users', refDoc.data().referrerUid);
            try { await updateDoc(referrerRef, { balance: increment(1000), referralCount: increment(1) }); } catch(err){}
            try { await updateDoc(userRef, { balance: increment(100) }); } catch(err){}
            try { await updateDoc(doc(db, 'referrals', refDoc.id), { status: 'rewarded' }); } catch(err){}
          }
        } catch (e) {}

        // Update local wallet map
        setUsersMap(prev => ({
          ...prev,
          [deposit.uid]: { ...prev[deposit.uid], balance: (prev[deposit.uid]?.balance || 0) + creditAmount }
        }));
      }

      setDeposits(prev => prev.map(d => d.id === deposit.id ? { ...d, status: action } : d));
    } catch (e: any) {
      alert(`Error processing transaction: ${e.message}`);
    } finally {
      setProcessingId(null);
    }
  };

  const handleBetAction = async (bet: PlacedBet, action: 'won' | 'lost' | 'refunded') => {
    const bettor = usersMap[bet.uid!]?.email || bet.uid;
    if (!window.confirm(`Set this ₹${bet.stake} bet by ${bettor} as ${action.toUpperCase()}?`)) return;
    setProcessingId(bet.id);
    try {
      // Placed bet is stored at placedBets/{uid}/bets/{betId}
      const betRef = doc(db, 'placedBets', bet.uid!, 'bets', bet.id);
      await updateDoc(betRef, { status: action });

      // Credit balance if won or refunded
      if (action === 'won' || action === 'refunded') {
        const creditAmount = action === 'won' ? Math.round(bet.stake * bet.odds) : bet.stake;
        const userRef = doc(db, 'users', bet.uid!);
        await updateDoc(userRef, { balance: increment(creditAmount) });
        
        // Local wallet update
        setUsersMap(prev => ({
          ...prev,
          [bet.uid!]: { ...prev[bet.uid!], balance: (prev[bet.uid!]?.balance || 0) + creditAmount }
        }));
      }

      setBets(prev => prev.map(b => b.id === bet.id ? { ...b, status: action } : b));
    } catch (e: any) {
      console.error(e);
      alert(`Error settling bet: ${e.message}`);
    } finally {
      setProcessingId(null);
    }
  };

  // ── Render Guards ──
  if (isAdmin === null) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-20">
        <RefreshCw className="w-10 h-10 text-emerald-400 animate-spin mb-4" />
        <p className="text-zinc-400 font-semibold">Verifying admin access...</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-20">
        <div className="w-24 h-24 bg-red-500/10 rounded-full flex items-center justify-center mb-6 border border-red-500/20">
          <XCircle className="w-12 h-12 text-red-500" />
        </div>
        <h2 className="text-3xl font-black text-white tracking-tight mb-2">ACCESS DENIED</h2>
        <p className="text-zinc-400">You do not have administrator privileges to view this area.</p>
      </div>
    );
  }

  // View Computations
  const pendingDeposits = deposits.filter(d => d.status === 'pending');
  const historyDeposits = deposits.filter(d => d.status !== 'pending');
  const pendingBets = bets.filter(b => b.status === 'pending');
  const settledBets = bets.filter(b => b.status !== 'pending');

  return (
    <div className="space-y-6 pb-20">
      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 bg-emerald-500/10 rounded-2xl border border-emerald-500/20">
              <ShieldAlert className="w-6 h-6 text-emerald-400" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
              Admin <span className="text-emerald-400">Control</span>
            </h1>
          </div>
          <p className="text-zinc-400 text-sm">Comprehensive platform management & settlements</p>
        </div>
        <button 
          onClick={fetchAllData}
          className="flex items-center justify-center gap-2 bg-zinc-900 border border-zinc-800 hover:border-emerald-500/50 hover:bg-zinc-800 px-5 py-2.5 rounded-2xl text-xs font-bold transition-all shrink-0"
        >
          <RefreshCw className={`w-4 h-4 text-emerald-400 ${loading ? 'animate-spin' : ''}`} />
          SYNC CLOUD
        </button>
      </div>

      {/* ── STATS GRID ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Pending Deposits', value: pendingDeposits.length, icon: <Wallet className="w-5 h-5" />, color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20' },
          { label: 'Unsettled Bets', value: pendingBets.length, icon: <Trophy className="w-5 h-5" />, color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
          { label: 'Registered Users', value: allUsers.length, icon: <Users className="w-5 h-5" />, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
          { label: 'System Health', value: '100%', icon: <Activity className="w-5 h-5" />, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
        ].map((stat, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
            className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 flex flex-col justify-between"
          >
            <div className="flex items-start justify-between mb-4">
              <div className={`p-2 rounded-xl ${stat.bg} ${stat.color} border ${stat.border}`}>{stat.icon}</div>
            </div>
            <div>
              <p className="text-2xl font-black text-white">{stat.value}</p>
              <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mt-1">{stat.label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* ── TOP NAV BUTTONS ── */}
      <div className="flex flex-wrap gap-2">
        {(['deposits', 'bets', 'users'] as const).map(tab => (
          <button
            key={tab} onClick={() => setMainTab(tab)}
            className={`flex-1 min-w-[100px] py-3.5 rounded-2xl text-xs font-black tracking-widest uppercase transition-all flex justify-center items-center gap-2 ${
              mainTab === tab 
                ? 'bg-gradient-to-br from-emerald-500 to-emerald-700 text-black shadow-[0_0_20px_rgba(16,185,129,0.3)]' 
                : 'bg-zinc-900 border border-zinc-800 text-zinc-500 hover:text-white hover:border-emerald-500/30'
            }`}
          >
            {tab === 'deposits' && <Wallet className="w-4 h-4" />}
            {tab === 'bets' && <Trophy className="w-4 h-4" />}
            {tab === 'users' && <Users className="w-4 h-4" />}
            {tab}
            
            {/* Notification bubbles */}
            {tab === 'deposits' && pendingDeposits.length > 0 && <span className="bg-red-500 text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px] ml-1">{pendingDeposits.length}</span>}
            {tab === 'bets' && pendingBets.length > 0 && <span className="bg-orange-500 text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px] ml-1">{pendingBets.length}</span>}
          </button>
        ))}
      </div>

      {/* ── MAIN WORKSPACE ── */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl min-h-[400px]">
        {loading ? (
          <div className="h-96 flex flex-col justify-center items-center">
            <RefreshCw className="w-10 h-10 text-emerald-500 animate-spin mb-4" />
            <span className="text-zinc-400 font-bold text-sm tracking-widest uppercase">Fetching Records</span>
          </div>
        ) : (
          <>
            {/* ========================================================= */}
            {/* VIEW: DEPOSITS */}
            {/* ========================================================= */}
            {mainTab === 'deposits' && (
              <>
                <div className="flex border-b border-zinc-800 bg-zinc-950/50 p-2 gap-2">
                  <button onClick={() => setDepositsTab('pending')} className={`flex-1 flex justify-center items-center gap-2 py-3 rounded-2xl text-xs font-bold transition-all ${depositsTab === 'pending' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500'}`}>
                    PENDING
                  </button>
                  <button onClick={() => setDepositsTab('history')} className={`flex-1 flex justify-center items-center gap-2 py-3 rounded-2xl text-xs font-bold transition-all ${depositsTab === 'history' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500'}`}>
                    PROCESSED
                  </button>
                </div>
                
                <div className="divide-y divide-zinc-800/60">
                  <AnimatePresence>
                    {(depositsTab === 'pending' ? pendingDeposits : historyDeposits).map(d => (
                      <motion.div key={d.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-5 hover:bg-zinc-800/20">
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border ${d.status === 'pending' ? 'bg-orange-500/10 border-orange-500/20 text-orange-400' : d.status === 'approved' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-500'}`}>
                            <Wallet className="w-6 h-6" />
                          </div>
                          <div>
                            <div className="flex items-center gap-3 mb-1">
                              <span className="font-black text-white text-xl">₹{d.amount}</span>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border uppercase tracking-widest ${d.status === 'pending' ? 'border-orange-500/30 text-orange-400' : d.status === 'approved' ? 'border-emerald-500/30 text-emerald-400' : 'border-red-500/30 text-red-500'}`}>{d.status}</span>
                            </div>
                            <p className="text-sm font-medium text-zinc-300 flex items-center gap-1.5"><Users className="w-3.5 h-3.5 text-zinc-500" /> {d.userEmail}</p>
                            <p className="text-[11px] text-zinc-500 mt-1 font-mono">{d.utr} • {new Date(d.timestamp).toLocaleString()}</p>
                          </div>
                        </div>

                        {depositsTab === 'pending' && (
                          <div className="flex items-center gap-2">
                            <button disabled={processingId === d.id} onClick={() => handleDepositAction(d, 'rejected')} className="px-5 py-3 rounded-xl bg-zinc-800 text-zinc-300 hover:text-red-400 hover:bg-zinc-700 font-bold text-xs transition">REJECT</button>
                            <button disabled={processingId === d.id} onClick={() => handleDepositAction(d, 'approved')} className="px-6 py-3 rounded-xl bg-emerald-500 text-black font-black text-xs hover:bg-emerald-400 transition shadow-[0_0_20px_rgba(16,185,129,0.2)]">APPROVE</button>
                          </div>
                        )}
                      </motion.div>
                    ))}
                    {(depositsTab === 'pending' ? pendingDeposits : historyDeposits).length === 0 && (
                      <p className="text-center py-16 text-zinc-500 font-bold">No records found.</p>
                    )}
                  </AnimatePresence>
                </div>
              </>
            )}

            {/* ========================================================= */}
            {/* VIEW: BETS */}
            {/* ========================================================= */}
            {mainTab === 'bets' && (
              <>
                <div className="flex border-b border-zinc-800 bg-zinc-950/50 p-2 gap-2">
                  <button onClick={() => setBetsTab('pending')} className={`flex-1 flex justify-center items-center gap-2 py-3 rounded-2xl text-xs font-bold transition-all ${betsTab === 'pending' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500'}`}>
                    PENDING BETS
                  </button>
                  <button onClick={() => setBetsTab('history')} className={`flex-1 flex justify-center items-center gap-2 py-3 rounded-2xl text-xs font-bold transition-all ${betsTab === 'history' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500'}`}>
                    RULINGS
                  </button>
                </div>

                <div className="divide-y divide-zinc-800/60">
                  <AnimatePresence>
                    {(betsTab === 'pending' ? pendingBets : settledBets).map(b => {
                      const bettor = usersMap[b.uid || ''];
                      const potentialWin = Math.round(b.stake * b.odds);
                      
                      return (
                        <motion.div key={b.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-5 hover:bg-zinc-800/20">
                          <div className="flex items-start gap-4">
                            <div className={`w-12 h-12 rounded-2xl flex flex-col items-center justify-center shrink-0 border ${b.status === 'pending' ? 'bg-purple-500/10 border-purple-500/20' : b.status === 'won' ? 'bg-emerald-500/10 border-emerald-500/20' : b.status === 'lost' ? 'bg-red-500/10 border-red-500/20' : 'bg-blue-500/10 border-blue-500/20'}`}>
                              <p className="text-[9px] text-zinc-500 font-bold leading-none tracking-wider mb-0.5">X</p>
                              <p className={`font-black leading-none ${b.status === 'pending' ? 'text-purple-400' : b.status === 'won' ? 'text-emerald-400' : b.status === 'lost' ? 'text-red-500' : 'text-blue-400'}`}>{b.odds}</p>
                            </div>
                            <div>
                              <div className="flex flex-wrap items-center gap-2 mb-1">
                                <span className="font-black text-white text-[15px]">{b.label}</span>
                                <span className="text-[10px] bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded font-bold uppercase tracking-wider border border-zinc-700">{b.market}</span>
                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-widest ${b.status === 'pending' ? 'border-purple-500/30 text-purple-400' : b.status === 'won' ? 'border-emerald-500/30 text-emerald-400' : b.status === 'lost' ? 'border-red-500/30 text-red-500' : 'border-blue-500/30 text-blue-400'}`}>{b.status}</span>
                              </div>
                              <p className="text-xs text-zinc-400 mb-2 truncate max-w-sm">
                                {b.matchLabel} <span className="mx-2 opacity-30">•</span> {new Date(b.timestamp).toLocaleString()}
                              </p>
                              
                              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
                                <span className="text-zinc-300 bg-zinc-800/50 px-2 py-1 rounded-md border border-zinc-700/50">
                                  Stake: <span className="font-black">₹{b.stake}</span>
                                </span>
                                <span className="text-emerald-400/80 bg-emerald-500/5 px-2 py-1 rounded-md border border-emerald-500/10">
                                  Win: <span className="font-black text-emerald-400">₹{potentialWin}</span>
                                </span>
                                <p className="text-zinc-500 font-medium flex items-center gap-1.5 ml-2">
                                  <Users className="w-3.5 h-3.5" /> 
                                  {bettor ? (
                                    <span className="text-zinc-300">{bettor.name} <span className="opacity-50">({bettor.email})</span></span>
                                  ) : (
                                    <span className="font-mono">{b.uid}</span>
                                  )}
                                </p>
                              </div>
                            </div>
                          </div>

                          {betsTab === 'pending' && (
                            <div className="flex flex-wrap items-center gap-2 mt-2 md:mt-0 lg:ml-auto">
                              <button disabled={processingId === b.id} onClick={() => handleBetAction(b, 'lost')} className="min-w-[80px] px-4 py-2.5 rounded-xl bg-zinc-800 text-zinc-300 hover:text-red-400 hover:border-red-500/50 border border-transparent font-bold text-xs transition">LOSE</button>
                              <button disabled={processingId === b.id} onClick={() => handleBetAction(b, 'refunded')} className="min-w-[80px] px-4 py-2.5 rounded-xl bg-zinc-800 text-zinc-300 hover:text-blue-400 hover:border-blue-500/50 border border-transparent font-bold text-xs transition">REFUND</button>
                              <button disabled={processingId === b.id} onClick={() => handleBetAction(b, 'won')} className="min-w-[100px] px-5 py-2.5 rounded-xl bg-emerald-500 text-black font-black text-xs hover:bg-emerald-400 transition shadow-[0_0_20px_rgba(16,185,129,0.2)] flex items-center justify-center gap-1.5"><Trophy className="w-3.5 h-3.5"/>WIN</button>
                            </div>
                          )}
                        </motion.div>
                      );
                    })}
                    {(betsTab === 'pending' ? pendingBets : settledBets).length === 0 && (
                      <p className="text-center py-16 text-zinc-500 font-bold">No active bets logged.</p>
                    )}
                  </AnimatePresence>
                </div>
              </>
            )}

            {/* ========================================================= */}
            {/* VIEW: USERS */}
            {/* ========================================================= */}
            {mainTab === 'users' && (
              <div className="divide-y divide-zinc-800/60 p-2">
                {allUsers.length === 0 && <p className="text-center py-16 text-zinc-500 font-bold">No users in database.</p>}
                {allUsers.map((u) => (
                  <div key={u.uid} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-zinc-800/20 rounded-2xl transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-zinc-800 border border-zinc-700 rounded-full flex items-center justify-center text-zinc-400 font-black tracking-widest overflow-hidden shrink-0">
                        {u.avatar ? <img src={u.avatar} alt={u.name} className="w-full h-full object-cover"/> : u.name?.slice(0,2).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-black text-white text-[15px]">{u.name}</p>
                        <p className="text-xs text-zinc-400 font-medium">{u.email}</p>
                        <div className="flex flex-wrap items-center gap-2 mt-1.5">
                          <span className="text-[9px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/20 font-bold uppercase">Bal: ₹{(u.balance || 0).toLocaleString()}</span>
                          <span className="text-[9px] bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded border border-zinc-700 font-medium font-mono uppercase">Ref: {u.referralCode || 'NONE'}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 flex items-center gap-3">
                        <Coins className="w-4 h-4 text-zinc-500" />
                        <div>
                          <p className="text-[9px] text-zinc-500 font-bold uppercase">Total Referrals</p>
                          <p className="text-sm font-black text-white leading-none">{u.referralCount || 0}</p>
                        </div>
                      </div>
                      <div className="bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 flex items-center gap-3">
                        <Clock className="w-4 h-4 text-zinc-500" />
                        <div>
                          <p className="text-[9px] text-zinc-500 font-bold uppercase">Joined</p>
                          <p className="text-xs font-bold text-zinc-300 leading-none mt-0.5">{(u as any).createdAt ? new Date((u as any).createdAt).toLocaleDateString() : 'N/A'}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// Dummy icon for Access Denied / Title
function ShieldAlert(props: any) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="M12 8v4" /><path d="M12 16h.01" />
    </svg>
  );
}
