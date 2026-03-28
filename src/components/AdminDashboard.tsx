/**
 * AdminDashboard.tsx — Secure portal to approve manual UTR deposits
 * Premium Dark Luxury Design
 */
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, CheckCircle, XCircle, RefreshCw, 
  TrendingUp, Users, Wallet, Activity, Clock
} from 'lucide-react';
import { collection, query, orderBy, getDocs, doc, getDoc, updateDoc, increment, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { DepositRequest, User } from '../types';

interface Props {
  user: User;
}

export default function AdminDashboard({ user }: Props) {
  const [deposits, setDeposits] = useState<DepositRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');

  // ── Task 3: Secure admin check via Firestore users/{uid}.isAdmin ──
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null); // null = loading

  useEffect(() => {
    if (!user?.uid) { setIsAdmin(false); return; }
    getDoc(doc(db, 'users', user.uid))
      .then(snap => setIsAdmin(snap.exists() ? (snap.data()?.isAdmin === true) : false))
      .catch(() => setIsAdmin(false));
  }, [user?.uid]);

  const fetchDeposits = async () => {
    setLoading(true);
    try {
      // Fetch all deposits ordered by timestamp descending
      const q = query(collection(db, 'deposits'), orderBy('timestamp', 'desc'));
      const snap = await getDocs(q);
      const reqs: DepositRequest[] = [];
      snap.forEach(d => reqs.push({ id: d.id, ...d.data() } as DepositRequest));
      setDeposits(reqs);
    } catch (e) {
      console.error(e);
      // alert("Error fetching deposits. Check Firebase Rules.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin === true) fetchDeposits();
  }, [isAdmin]);

  const handleAction = async (deposit: DepositRequest, action: 'approved' | 'rejected') => {
    if (!window.confirm(`Are you sure you want to ${action.toUpperCase()} ₹${deposit.amount} for ${deposit.userEmail}?`)) return;
    
    setProcessingId(deposit.id);
    try {
      // 1. Mark deposit as processed
      const depRef = doc(db, 'deposits', deposit.id);
      await updateDoc(depRef, { status: action });

      // 2. If approved, add 2× money to user (deposit + 100% welcome bonus)
      if (action === 'approved') {
        const userRef = doc(db, 'users', deposit.uid);
        await updateDoc(userRef, {
          balance: increment(deposit.amount * 2) // 2× credited amount
        });

        // 3. Check if this user was referred — if so, attempt referral reward
        try {
          const referralsRef = collection(db, 'referrals');
          const rq = query(referralsRef,
            where('refereeUid', '==', deposit.uid),
            where('status', '==', 'pending')
          );
          const rSnap = await getDocs(rq);
          if (!rSnap.empty) {
            const refDoc = rSnap.docs[0];
            const referral = refDoc.data();
            // Credit ₹1,000 to the referrer
            const referrerRef = doc(db, 'users', referral.referrerUid);
            await updateDoc(referrerRef, { balance: increment(1000), referralCount: increment(1) });
            // Credit ₹100 bonus to the referee (the depositing user) for joining via referral
            await updateDoc(userRef, { balance: increment(100) });
            // Mark referral as rewarded
            await updateDoc(doc(db, 'referrals', refDoc.id), { status: 'rewarded' });
          }
        } catch (refErr) {
          console.warn('Referral reward error:', refErr);
        }
      }

      // Update local state to reflect change without refetching immediately
      setDeposits(prev => prev.map(d => d.id === deposit.id ? { ...d, status: action } : d));
    } catch (e) {
      console.error(e);
      alert("Failed to process transaction.");
    } finally {
      setProcessingId(null);
    }
  };

  // Loading state while Firestore checks admin flag
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

  const pendingDeposits = deposits.filter(d => d.status === 'pending');
  const historyDeposits = deposits.filter(d => d.status !== 'pending');
  
  const totalApprovedAmount = deposits
    .filter(d => d.status === 'approved')
    .reduce((sum, d) => sum + d.amount, 0);

  const displayedDeposits = activeTab === 'pending' ? pendingDeposits : historyDeposits;

  return (
    <div className="space-y-6 pb-20">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-2">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 bg-emerald-500/10 rounded-2xl border border-emerald-500/20">
              <ShieldAlert className="w-6 h-6 text-emerald-400" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
              Admin <span className="text-emerald-400">Control</span>
            </h1>
          </div>
          <p className="text-zinc-400 text-sm">Review manual UTR deposits and manage user balances</p>
        </div>
        <button 
          onClick={fetchDeposits}
          className="flex items-center justify-center gap-2 bg-zinc-900 border border-zinc-800 hover:border-emerald-500/50 hover:bg-zinc-800 px-5 py-2.5 rounded-2xl text-xs font-bold transition-all shrink-0"
        >
          <RefreshCw className={`w-4 h-4 text-emerald-400 ${loading ? 'animate-spin' : ''}`} />
          REFRESH DATA
        </button>
      </div>

      {/* ── Stats Grid ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Pending Requests', value: pendingDeposits.length, icon: <Clock className="w-5 h-5" />, color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20' },
          { label: 'Total Processed', value: historyDeposits.length, icon: <Activity className="w-5 h-5" />, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
          { label: 'Approved Deposits', value: `₹${totalApprovedAmount.toLocaleString()}`, icon: <TrendingUp className="w-5 h-5" />, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
          { label: 'System Status', value: 'Online', icon: <CheckCircle className="w-5 h-5" />, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
        ].map((stat, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
            className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 flex flex-col justify-between"
          >
            <div className="flex items-start justify-between mb-4">
              <div className={`p-2 rounded-xl ${stat.bg} ${stat.color} border ${stat.border}`}>
                {stat.icon}
              </div>
            </div>
            <div>
              <p className="text-2xl font-black text-white">{stat.value}</p>
              <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mt-1">{stat.label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* ── Main Panel ── */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl">
        {/* Tabs */}
        <div className="flex border-b border-zinc-800 bg-zinc-950/50 p-2 gap-2">
          <button 
            onClick={() => setActiveTab('pending')}
            className={`flex-1 flex justify-center items-center gap-2 py-3 rounded-2xl text-xs font-bold transition-all ${
              activeTab === 'pending' 
                ? 'bg-zinc-800 text-white shadow-sm' 
                : 'text-zinc-500 hover:text-white hover:bg-zinc-800/50'
            }`}
          >
            PENDING <span className="bg-orange-500 text-white text-[10px] px-2 py-0.5 rounded-full">{pendingDeposits.length}</span>
          </button>
          <button 
            onClick={() => setActiveTab('history')}
            className={`flex-1 flex justify-center items-center gap-2 py-3 rounded-2xl text-xs font-bold transition-all ${
              activeTab === 'history' 
                ? 'bg-zinc-800 text-white shadow-sm' 
                : 'text-zinc-500 hover:text-white hover:bg-zinc-800/50'
            }`}
          >
            HISTORY <span className="bg-zinc-700 text-white text-[10px] px-2 py-0.5 rounded-full">{historyDeposits.length}</span>
          </button>
        </div>

        {/* List */}
        <div className="p-0 min-h-[300px]">
          {loading ? (
            <div className="py-32 flex justify-center">
              <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin" />
            </div>
          ) : displayedDeposits.length === 0 ? (
            <div className="py-24 text-center text-zinc-500 flex flex-col items-center">
              <div className="w-16 h-16 bg-zinc-800/50 rounded-full flex items-center justify-center mb-4">
                <Search className="w-8 h-8 opacity-50" />
              </div>
              <p className="font-bold text-lg text-zinc-400">No records found</p>
              <p className="text-sm mt-1">
                {activeTab === 'pending' ? "You're all caught up! No pending deposit requests." : "No processed requests yet."}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-800/60">
              <AnimatePresence>
                {displayedDeposits.map((d, index) => (
                  <motion.div 
                    initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, height: 0 }}
                    transition={{ delay: index * 0.05 }}
                    key={d.id} 
                    className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-5 hover:bg-zinc-800/20 transition-colors"
                  >
                    {/* User Info */}
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border ${
                        d.status === 'pending' ? 'bg-orange-500/10 border-orange-500/20 text-orange-400' :
                        d.status === 'approved' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                        'bg-red-500/10 border-red-500/20 text-red-400'
                      }`}>
                        <Wallet className="w-6 h-6" />
                      </div>
                      
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <span className="font-black text-white text-xl">₹{d.amount}</span>
                          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border uppercase tracking-widest ${
                            d.status === 'pending' ? 'bg-orange-500/10 border-orange-500/30 text-orange-400' :
                            d.status === 'approved' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' :
                            'bg-red-500/10 border-red-500/30 text-red-500'
                          }`}>
                            {d.status}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                          <Users className="w-3.5 h-3.5 text-zinc-500" /> {d.userEmail}
                        </p>
                        <p className="text-[11px] text-zinc-500 mt-1 flex items-center gap-1.5 font-medium tracking-wide">
                          <span className="text-zinc-400">UTR:</span> <span className="font-mono text-white bg-zinc-800 px-1.5 py-0.5 rounded">{d.utr}</span>
                          <span className="mx-1">•</span> 
                          {new Date(d.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>

                    {/* Actions (Only for pending) */}
                    {activeTab === 'pending' && (
                      <div className="flex items-center gap-3 shrink-0 sm:ml-auto w-full sm:w-auto mt-2 sm:mt-0">
                        <button 
                          disabled={processingId === d.id}
                          onClick={() => handleAction(d, 'rejected')}
                          className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-zinc-800 text-zinc-300 hover:text-red-400 hover:bg-zinc-700 font-bold text-xs transition disabled:opacity-50"
                        >
                          <XCircle className="w-4 h-4" /> REJECT
                        </button>
                        <button 
                          disabled={processingId === d.id}
                          onClick={() => handleAction(d, 'approved')}
                          className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-emerald-500 text-black font-black text-xs hover:bg-emerald-400 active:scale-95 transition shadow-[0_0_20px_rgba(16,185,129,0.2)] disabled:opacity-50"
                        >
                          {processingId === d.id ? (
                            <RefreshCw className="w-4 h-4 animate-spin text-black" />
                          ) : (
                            <CheckCircle className="w-4 h-4" />
                          )}
                          APPROVE
                        </button>
                      </div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
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
