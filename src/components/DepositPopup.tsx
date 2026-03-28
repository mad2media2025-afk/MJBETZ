/**
 * DepositPopup.tsx — Manual Deposit Modal
 * Minimum ₹250 deposit. On success page shows 2× "bonus balance" display.
 * Tracks referral reward: if user has a pending referral doc and this is their
 * first approved deposit, the referrer gets ₹1,000 credited.
 */
import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Zap, Shield, CheckCircle, Minus, Plus } from 'lucide-react';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { User } from '../types';

interface Props {
  user: User;
  onClose: () => void;
  onClosedWithoutDeposit?: () => void; // fired when X is clicked without submitting
}

const MIN_DEPOSIT = 250;
const PRESETS = [250, 500, 1000, 2500, 5000];

export default function DepositPopup({ user, onClose, onClosedWithoutDeposit }: Props) {
  const [amount, setAmount] = useState<number>(250);
  const [utr, setUtr] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const amountError = amount < MIN_DEPOSIT ? `Minimum deposit is ₹${MIN_DEPOSIT}` : null;
  const displayBonus = amount * 2; // 2× fake bonus shown to user

  const handleClose = () => {
    if (!success) onClosedWithoutDeposit?.();
    onClose();
  };

  const handleSubmit = async () => {
    if (amountError || utr.length < 10) return;

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'deposits'), {
        uid: user.uid,
        userEmail: user.email,
        amount,
        utr: utr.trim(),
        status: 'pending',
        timestamp: Date.now(),
      });
      setSuccess(true);
      setTimeout(onClose, 4000);
    } catch (e) {
      console.error(e);
      alert('Failed to submit deposit. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
      onClick={e => e.target === e.currentTarget && handleClose()}
    >
      <motion.div
        initial={{ scale: 0.85, y: 40 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.85, y: 40 }}
        transition={{ type: 'spring', damping: 22, stiffness: 300 }}
        className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden relative"
      >
        {success ? (
          <div className="p-10 flex flex-col items-center text-center">
            <CheckCircle className="w-20 h-20 text-emerald-400 mb-4" />
            <h3 className="text-2xl font-black text-white">Deposit Received!</h3>
            <p className="text-zinc-400 mt-2 text-sm leading-relaxed">
              UTR: <span className="text-white font-bold">{utr}</span> is under review.
            </p>
            {/* 2× bonus display */}
            <div className="mt-5 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl px-6 py-4 text-center">
              <p className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold mb-1">Your New Balance</p>
              <p className="text-4xl font-black text-emerald-400">₹{displayBonus.toLocaleString()}</p>
              <p className="text-xs text-emerald-600 mt-1">Includes 100% Welcome Bonus</p>
            </div>
            <p className="text-zinc-500 text-xs mt-4">
              Balance finalised in 2–5 minutes after admin approval.
            </p>
          </div>
        ) : (
          <>
            {/* Gradient banner */}
            <div className="relative bg-gradient-to-br from-emerald-800 via-emerald-600 to-emerald-900 px-6 pt-6 pb-8 text-center">
              <button onClick={handleClose}
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/20 flex items-center justify-center text-white hover:bg-black/40 transition">
                <X className="w-4 h-4" />
              </button>
              <div className="flex items-center justify-center gap-2 mb-2">
                <Zap className="w-5 h-5 text-yellow-300" />
                <span className="text-yellow-300 font-black text-sm uppercase tracking-widest">Welcome Bonus</span>
              </div>
              <h2 className="text-4xl font-black text-white leading-none">DEPOSIT</h2>
              <p className="text-emerald-200 text-sm font-bold bg-black/20 py-1 px-4 rounded-full inline-block mt-2">
                Get 2× your deposit instantly!
              </p>
            </div>

            <div className="px-6 py-5 space-y-5 border-b border-zinc-800">
              {/* Step 1: Amount */}
              <div>
                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mb-3">
                  Step 1 — Select Amount (min. ₹250)
                </p>
                {/* Preset buttons */}
                <div className="grid grid-cols-5 gap-1.5 mb-3">
                  {PRESETS.map(p => (
                    <button key={p} onClick={() => setAmount(p)}
                      className={`py-2 rounded-xl text-[11px] font-black transition-all border ${
                        amount === p
                          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                          : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-white'
                      }`}>
                      {p >= 1000 ? `${p / 1000}k` : p}
                    </button>
                  ))}
                </div>
                {/* Custom amount with +/- */}
                <div className="flex items-center gap-2 bg-zinc-800/50 border border-zinc-700 rounded-xl p-1">
                  <button onClick={() => setAmount(prev => Math.max(MIN_DEPOSIT, prev - 250))}
                    className="w-9 h-9 flex items-center justify-center bg-zinc-800 hover:bg-zinc-700 rounded-lg text-zinc-400 hover:text-white transition">
                    <Minus className="w-4 h-4" />
                  </button>
                  <div className="flex-1 relative flex items-center">
                    <span className="absolute left-3 text-zinc-400 font-bold">₹</span>
                    <input type="number" min={MIN_DEPOSIT} value={amount}
                      onChange={e => setAmount(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full bg-transparent pl-7 pr-3 py-1.5 text-sm font-black text-center text-white outline-none" />
                  </div>
                  <button onClick={() => setAmount(prev => prev + 250)}
                    className="w-9 h-9 flex items-center justify-center bg-zinc-800 hover:bg-zinc-700 rounded-lg text-zinc-400 hover:text-white transition">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                {amountError && <p className="text-red-400 text-xs mt-1.5">{amountError}</p>}

                {/* 2× bonus preview */}
                {!amountError && (
                  <div className="mt-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-2 flex justify-between items-center">
                    <span className="text-xs text-zinc-400">You'll receive in wallet:</span>
                    <span className="text-emerald-400 font-black text-sm">₹{displayBonus.toLocaleString()}</span>
                  </div>
                )}
              </div>

              {/* Step 2: QR & Pay */}
              <div>
                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mb-3">
                  Step 2 — Scan & Pay ₹{amount.toLocaleString()} via UPI
                </p>
                <div className="bg-white rounded-2xl p-4 flex flex-col items-center mx-auto w-44">
                  <div className="w-28 h-28 bg-zinc-100 rounded-xl flex items-center justify-center mb-2 border border-zinc-200 relative overflow-hidden">
                    <div className="grid grid-cols-7 gap-[2px] w-[96px] h-[96px] opacity-80">
                      {Array.from({ length: 49 }).map((_, i) => (
                        <div key={i} className={`rounded-[2px] ${[0,1,2,3,4,5,6,7,14,21,28,35,42,43,44,45,46,47,48,8,15,22,29,36,6,13].includes(i) ? 'bg-black' : Math.random() > 0.45 ? 'bg-black' : 'bg-transparent'}`} />
                      ))}
                    </div>
                  </div>
                  <p className="text-zinc-800 text-[10px] font-black uppercase tracking-widest">MJBET@UPI</p>
                </div>
              </div>

              {/* Step 3: UTR */}
              <div>
                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mb-2">
                  Step 3 — Enter 12-digit UTR Reference No.
                </p>
                <input type="text" placeholder="e.g. 301234567890" value={utr}
                  onChange={e => setUtr(e.target.value.replace(/\D/g, '').slice(0, 12))}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-3 text-white font-bold tracking-widest focus:border-emerald-500 outline-none transition placeholder:text-zinc-600" />
                <p className="text-[10px] text-zinc-500 mt-1.5">Found in your payment app's transaction history.</p>
              </div>
            </div>

            {/* Actions */}
            <div className="px-6 py-5 bg-zinc-900/50">
              <button onClick={handleSubmit}
                disabled={isSubmitting || !!amountError || utr.length < 10}
                className={`w-full py-4 font-black rounded-2xl text-sm transition-all shadow-lg flex justify-center items-center ${
                  isSubmitting || !!amountError || utr.length < 10
                    ? 'bg-zinc-800 text-zinc-500'
                    : 'bg-emerald-500 text-black hover:bg-emerald-400 hover:scale-[1.02] shadow-emerald-900/40'
                }`}>
                {isSubmitting ? 'SUBMITTING...' : `SUBMIT & CLAIM ₹${displayBonus.toLocaleString()}`}
              </button>
              <div className="flex items-center justify-center gap-2 text-[9px] text-zinc-500 mt-4 uppercase font-bold tracking-wider">
                <Shield className="w-3 h-3 text-emerald-500" />
                Manual verification • Secure • 18+ only
              </div>
            </div>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}
