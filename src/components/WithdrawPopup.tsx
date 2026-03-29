/**
 * WithdrawPopup.tsx — Refined withdrawal modal
 * UPI ID validation with shake animation on invalid input
 */
import { useState } from 'react';
import { motion, useAnimation } from 'framer-motion';
import { X, ArrowDownToLine, CheckCircle, Shield, AlertCircle } from 'lucide-react';
import type { User } from '../types';

interface Props {
  user: User;
  balance: number;
  onClose: () => void;
}

// UPI format: something@something (e.g. 9876543210@ybl, name@okaxis)
const isValidUPI = (upi: string) => /^[a-zA-Z0-9._-]{3,}@[a-zA-Z]{3,}$/.test(upi.trim());

export default function WithdrawPopup({ user, balance, onClose }: Props) {
  const [amount, setAmount] = useState<number | ''>('');
  const [upi, setUpi] = useState('');
  const [upiTouched, setUpiTouched] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  // Show wagering notice first — user must acknowledge before accessing the form
  const [showWagerNotice, setShowWagerNotice] = useState(true);

  const amountControls = useAnimation();
  const upiControls = useAnimation();

  const numAmount = typeof amount === 'number' ? amount : 0;
  const amountError =
    numAmount > balance ? 'Insufficient balance' :
    numAmount > 0 && numAmount < 500 ? 'Minimum withdrawal is ₹500' : null;
  const upiError = upiTouched && upi.length > 0 && !isValidUPI(upi)
    ? 'Enter a valid UPI ID (e.g. 9876543210@ybl)' : null;

  const shake = (controls: ReturnType<typeof useAnimation>) => {
    controls.start({
      x: [0, -10, 10, -10, 10, -6, 6, 0],
      transition: { duration: 0.4 },
    });
  };

  const handleSubmit = async () => {
    let hasError = false;
    if (!isValidUPI(upi)) { shake(upiControls); setUpiTouched(true); hasError = true; }
    if (numAmount < 500 || !!amountError) { shake(amountControls); hasError = true; }
    if (hasError) return;

    setIsSubmitting(true);
    try {
      await new Promise(r => setTimeout(r, 1200));
      setSuccess(true);
      setTimeout(onClose, 3000);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.85, y: 40 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.85, y: 40 }}
        transition={{ type: 'spring', damping: 22, stiffness: 300 }}
        className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden relative"
      >
        {/* ── Wager Notice Screen (shown first) ── */}
        {showWagerNotice ? (
          <div className="p-8 flex flex-col items-center text-center">
            <button onClick={onClose} className="absolute top-3 right-3 w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white transition">
              <X className="w-4 h-4" />
            </button>
            <div className="w-20 h-20 bg-yellow-500/10 rounded-full flex items-center justify-center mb-5 border border-yellow-500/20">
              <span className="text-4xl">⚠️</span>
            </div>
            <h3 className="text-xl font-black text-white mb-3">Wager Requirement</h3>
            <p className="text-zinc-400 text-sm leading-relaxed mb-2">
              To withdraw your balance, you must first <span className="text-white font-bold">wager the amount</span> you have into your account through placing bets.
            </p>
            <p className="text-zinc-500 text-xs leading-relaxed mb-6">
              Place bets on live or upcoming matches to meet the wagering requirement before requesting a withdrawal.
            </p>
            <div className="w-full space-y-3">
              <button
                onClick={() => setShowWagerNotice(false)}
                className="w-full py-3.5 bg-orange-500 hover:bg-orange-400 text-black font-black rounded-2xl text-sm transition-all active:scale-95 shadow-lg shadow-orange-900/30"
              >
                I UNDERSTAND — CONTINUE
              </button>
              <button
                onClick={onClose}
                className="w-full py-3 border border-zinc-700 text-zinc-400 hover:text-white hover:bg-zinc-800 font-bold rounded-2xl text-sm transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : success ? (
          <div className="p-10 flex flex-col items-center text-center">
            <CheckCircle className="w-20 h-20 text-orange-400 mb-4" />
            <h3 className="text-2xl font-black text-white">Request Sent!</h3>
            <p className="text-zinc-400 mt-2 text-sm leading-relaxed">
              We are processing your withdrawal of <span className="text-white font-bold">₹{numAmount.toLocaleString()}</span> to <span className="text-white font-bold">{upi}</span>.<br/><br/>
              Funds will reflect in your account within 2–4 hours.
            </p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="relative bg-gradient-to-br from-orange-800 via-orange-600 to-orange-900 px-6 pt-6 pb-8 text-center">
              <button onClick={onClose}
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/20 flex items-center justify-center text-white hover:bg-black/40 transition">
                <X className="w-4 h-4" />
              </button>
              <div className="flex items-center justify-center gap-2 mb-2">
                <ArrowDownToLine className="w-5 h-5 text-orange-200" />
                <span className="text-orange-200 font-black text-sm uppercase tracking-widest">Withdraw Funds</span>
              </div>
              <h2 className="text-4xl font-black text-white leading-none mb-1">₹{balance.toLocaleString()}</h2>
              <p className="text-orange-200 text-sm font-bold bg-black/20 py-1 px-4 rounded-full inline-block mt-2">
                Available balance
              </p>
            </div>

            <div className="px-5 py-5 border-b border-zinc-800 space-y-4">
              {/* User context */}
              <div className="text-center pb-1">
                <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Withdrawing From</p>
                <p className="text-sm font-bold text-white">{user.name}</p>
                <p className="text-xs text-zinc-400">{user.email}</p>
              </div>

              {/* Amount */}
              <div>
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2 block">Amount</label>
                <motion.div animate={amountControls} className="relative flex items-center">
                  <span className="absolute left-4 text-zinc-500 font-bold">₹</span>
                  <input
                    type="number" value={amount}
                    onChange={e => setAmount(e.target.value ? parseInt(e.target.value) : '')}
                    placeholder="Min. ₹500"
                    className={`w-full bg-zinc-950 border rounded-xl pl-8 pr-16 py-3 text-white font-bold tracking-wider outline-none transition placeholder:text-zinc-700 ${
                      amountError ? 'border-red-500/70 focus:border-red-500' : 'border-zinc-700 focus:border-orange-500'
                    }`}
                  />
                  <button onClick={() => setAmount(balance)}
                    className="absolute right-3 text-[10px] font-black uppercase text-orange-400 bg-orange-500/10 hover:bg-orange-500/20 px-2 py-1 rounded">
                    Max
                  </button>
                </motion.div>
                {amountError && <p className="text-red-400 text-[11px] mt-1.5 flex items-center gap-1"><AlertCircle className="w-3 h-3"/>{amountError}</p>}
              </div>

              {/* UPI ID */}
              <div>
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2 block">UPI ID</label>
                <motion.input
                  animate={upiControls}
                  type="text" value={upi}
                  onChange={e => setUpi(e.target.value)}
                  onBlur={() => setUpiTouched(true)}
                  placeholder="e.g. 9876543210@ybl"
                  className={`w-full bg-zinc-950 border rounded-xl px-4 py-3 text-white font-bold tracking-wider outline-none transition placeholder:text-zinc-700 ${
                    upiError ? 'border-red-500/70 focus:border-red-500' :
                    upiTouched && isValidUPI(upi) ? 'border-emerald-500/50' :
                    'border-zinc-700 focus:border-orange-500'
                  }`}
                />
                {upiError && <p className="text-red-400 text-[11px] mt-1.5 flex items-center gap-1"><AlertCircle className="w-3 h-3"/>{upiError}</p>}
                {upiTouched && isValidUPI(upi) && <p className="text-emerald-400 text-[11px] mt-1.5">✓ Valid UPI ID</p>}
                <p className="text-zinc-600 text-[10px] mt-1">Format: username@bankname (e.g. name@okaxis, 9876@ybl)</p>
              </div>
            </div>

            {/* Actions */}
            <div className="px-5 py-4 bg-zinc-900/50 space-y-3">
              <button onClick={handleSubmit}
                disabled={isSubmitting}
                className={`w-full py-4 font-black rounded-2xl text-sm transition-all shadow-lg flex justify-center items-center ${
                  isSubmitting
                    ? 'bg-zinc-800 text-zinc-500 cursor-wait'
                    : 'bg-orange-500 text-black hover:bg-orange-400 active:scale-95 shadow-orange-900/40'
                }`}
              >
                {isSubmitting ? 'PROCESSING...' : 'REQUEST WITHDRAWAL'}
              </button>

              {/* Wagering disclaimer */}
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-4 py-3 flex items-start gap-2">
                <span className="text-yellow-400 text-base shrink-0">⚠️</span>
                <p className="text-yellow-400/90 text-[11px] font-semibold leading-snug">
                  Please wager your existing balance first before requesting a withdrawal. Unwagered bonus funds are not eligible for withdrawal.
                </p>
              </div>

              <div className="flex items-center justify-center gap-2 text-[9px] text-zinc-500 uppercase font-bold tracking-wider">
                <Shield className="w-3 h-3 text-orange-500" />
                Secure Transfer • No fees • Instant Processing
              </div>
            </div>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}
