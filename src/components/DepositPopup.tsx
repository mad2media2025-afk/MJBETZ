/**
 * DepositPopup.tsx — Manual Deposit Modal
 * Minimum ₹250 deposit.
 * Generates a live UPI QR code for EXACTLY the amount the user enters.
 * UPI ID: mjb6t@axl
 * On success page shows 2× "bonus balance" display.
 */
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Zap, Shield, CheckCircle, Minus, Plus, Copy, RefreshCw } from 'lucide-react';
import QRCode from 'qrcode';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { User } from '../types';

interface Props {
  user: User;
  onClose: () => void;
  onClosedWithoutDeposit?: () => void;
}

const UPI_ID       = 'mjb6t@axl';
const PAYEE_NAME   = 'MJBET';
const MIN_DEPOSIT  = 250;
const PRESETS      = [250, 500, 1000, 2500, 5000];

/** Build a UPI intent URL that most Indian payment apps recognise */
function buildUpiUrl(amount: number): string {
  const note = encodeURIComponent(`MJBET Deposit ₹${amount}`);
  return `upi://pay?pa=${UPI_ID}&pn=${encodeURIComponent(PAYEE_NAME)}&am=${amount}&cu=INR&tn=${note}`;
}

export default function DepositPopup({ user, onClose, onClosedWithoutDeposit }: Props) {
  const [amount, setAmount]       = useState<number>(250);
  const [utr, setUtr]             = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess]     = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [copied, setCopied]       = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const amountError  = amount < MIN_DEPOSIT ? `Minimum deposit is ₹${MIN_DEPOSIT}` : null;
  const displayBonus = amount * 2;

  // ── Regenerate QR whenever amount changes (debounced 400ms) ──
  useEffect(() => {
    if (amountError) { setQrDataUrl(null); return; }

    setQrLoading(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      try {
        const url = buildUpiUrl(amount);
        const dataUrl = await QRCode.toDataURL(url, {
          errorCorrectionLevel: 'H',
          margin: 1,
          width: 220,
          color: { dark: '#000000', light: '#ffffff' },
        });
        setQrDataUrl(dataUrl);
      } catch (err) {
        console.error('QR generation failed', err);
        setQrDataUrl(null);
      } finally {
        setQrLoading(false);
      }
    }, 400);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [amount, amountError]);

  const handleClose = () => {
    if (!success) onClosedWithoutDeposit?.();
    onClose();
  };

  const handleCopyUpi = () => {
    navigator.clipboard.writeText(UPI_ID).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
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
      setTimeout(onClose, 4500);
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
        className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden relative max-h-[92vh] overflow-y-auto"
      >
        {/* ── Success Screen ── */}
        {success ? (
          <div className="p-10 flex flex-col items-center text-center">
            <motion.div
              initial={{ scale: 0 }} animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 260, damping: 18 }}
            >
              <CheckCircle className="w-20 h-20 text-emerald-400 mb-4" />
            </motion.div>
            <h3 className="text-2xl font-black text-white">Deposit Received!</h3>
            <p className="text-zinc-400 mt-2 text-sm leading-relaxed">
              UTR: <span className="text-white font-bold">{utr}</span> is under review.
            </p>
            <div className="mt-5 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl px-6 py-4 text-center w-full">
              <p className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold mb-1">Pending Credit</p>
              <p className="text-4xl font-black text-emerald-400">₹{displayBonus.toLocaleString()}</p>
              <p className="text-xs text-emerald-600 mt-1">Includes 100% Welcome Bonus • After Admin Approval</p>
            </div>
            <p className="text-zinc-500 text-xs mt-4">Balance finalised in 2–5 minutes after admin approval.</p>
          </div>
        ) : (
          <>
            {/* ── Gradient Banner ── */}
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

            <div className="px-6 py-5 space-y-6 border-b border-zinc-800">

              {/* ── Step 1 : Amount ── */}
              <div>
                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mb-3">
                  Step 1 — Select Amount <span className="text-zinc-600">(min. ₹{MIN_DEPOSIT})</span>
                </p>

                {/* Preset buttons */}
                <div className="grid grid-cols-5 gap-1.5 mb-3">
                  {PRESETS.map(p => (
                    <button key={p} onClick={() => setAmount(p)}
                      className={`py-2 rounded-xl text-[11px] font-black transition-all border ${
                        amount === p
                          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                          : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500'
                      }`}>
                      {p >= 1000 ? `${p / 1000}k` : p}
                    </button>
                  ))}
                </div>

                {/* Custom amount +/- */}
                <div className="flex items-center gap-2 bg-zinc-800/50 border border-zinc-700 rounded-xl p-1">
                  <button onClick={() => setAmount(prev => Math.max(MIN_DEPOSIT, prev - 250))}
                    className="w-9 h-9 flex items-center justify-center bg-zinc-800 hover:bg-zinc-700 rounded-lg text-zinc-400 hover:text-white transition">
                    <Minus className="w-4 h-4" />
                  </button>
                  <div className="flex-1 relative flex items-center">
                    <span className="absolute left-3 text-zinc-400 font-bold">₹</span>
                    <input
                      type="number" min={MIN_DEPOSIT} value={amount}
                      onChange={e => setAmount(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full bg-transparent pl-7 pr-3 py-1.5 text-sm font-black text-center text-white outline-none"
                    />
                  </div>
                  <button onClick={() => setAmount(prev => prev + 250)}
                    className="w-9 h-9 flex items-center justify-center bg-zinc-800 hover:bg-zinc-700 rounded-lg text-zinc-400 hover:text-white transition">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                {amountError && <p className="text-red-400 text-xs mt-1.5 font-semibold">{amountError}</p>}

                {/* 2× Bonus preview */}
                {!amountError && (
                  <div className="mt-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-2 flex justify-between items-center">
                    <span className="text-xs text-zinc-400">You'll receive in wallet:</span>
                    <span className="text-emerald-400 font-black text-sm">₹{displayBonus.toLocaleString()}</span>
                  </div>
                )}
              </div>

              {/* ── Step 2 : Dynamic QR Code ── */}
              <div>
                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mb-3">
                  Step 2 — Scan & Pay <span className="text-white font-black">₹{amount.toLocaleString()}</span> via UPI
                </p>

                {/* QR Card */}
                <div className="bg-white rounded-2xl p-4 flex flex-col items-center mx-auto w-fit shadow-lg">
                  <AnimatePresence mode="wait">
                    {amountError ? (
                      /* Invalid amount — placeholder */
                      <motion.div
                        key="invalid"
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="w-[160px] h-[160px] bg-zinc-100 rounded-xl flex flex-col items-center justify-center border-2 border-dashed border-zinc-300"
                      >
                        <p className="text-zinc-400 text-xs text-center font-semibold px-2 leading-relaxed">
                          Enter ₹{MIN_DEPOSIT}+ to<br />generate QR
                        </p>
                      </motion.div>
                    ) : qrLoading ? (
                      /* Loading spinner */
                      <motion.div
                        key="loading"
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="w-[160px] h-[160px] bg-zinc-100 rounded-xl flex flex-col items-center justify-center gap-2"
                      >
                        <RefreshCw className="w-7 h-7 text-emerald-500 animate-spin" />
                        <p className="text-zinc-500 text-[10px] font-bold">Generating...</p>
                      </motion.div>
                    ) : qrDataUrl ? (
                      /* Real QR */
                      <motion.img
                        key={`qr-${amount}`}
                        src={qrDataUrl}
                        alt={`UPI QR for ₹${amount}`}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ type: 'spring', stiffness: 240, damping: 20 }}
                        className="w-[160px] h-[160px] rounded-xl object-cover"
                      />
                    ) : null}
                  </AnimatePresence>

                  {/* Amount label under QR */}
                  {!amountError && (
                    <div className="mt-2 text-center">
                      <p className="text-zinc-900 font-black text-base">₹{amount.toLocaleString()}</p>
                      <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest">{UPI_ID}</p>
                    </div>
                  )}
                </div>

                {/* Copy UPI ID */}
                <button
                  onClick={handleCopyUpi}
                  className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 bg-zinc-800 hover:bg-zinc-750 border border-zinc-700 rounded-xl text-xs font-bold text-zinc-300 hover:text-white transition-all"
                >
                  <AnimatePresence mode="wait">
                    {copied ? (
                      <motion.span key="copied" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        className="flex items-center gap-1.5 text-emerald-400">
                        <CheckCircle className="w-3.5 h-3.5" /> Copied!
                      </motion.span>
                    ) : (
                      <motion.span key="copy" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        className="flex items-center gap-1.5">
                        <Copy className="w-3.5 h-3.5" /> Copy UPI ID: <span className="text-emerald-400 font-black">{UPI_ID}</span>
                      </motion.span>
                    )}
                  </AnimatePresence>
                </button>

                <p className="text-[10px] text-zinc-600 text-center mt-2 font-medium">
                  Open any UPI app · Scan QR · Amount is pre-filled
                </p>
              </div>

              {/* ── Step 3 : UTR ── */}
              <div>
                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mb-2">
                  Step 3 — Enter UTR / Transaction ID
                </p>
                <input
                  type="text"
                  placeholder="12-digit UTR e.g. 301234567890"
                  value={utr}
                  onChange={e => setUtr(e.target.value.replace(/\D/g, '').slice(0, 12))}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-3 text-white font-bold tracking-widest focus:border-emerald-500 outline-none transition placeholder:text-zinc-600"
                />
                <div className="flex items-center justify-between mt-1.5">
                  <p className="text-[10px] text-zinc-500">Found in your UPI app's transaction history.</p>
                  <p className={`text-[10px] font-bold ${utr.length === 12 ? 'text-emerald-400' : 'text-zinc-600'}`}>
                    {utr.length}/12
                  </p>
                </div>
              </div>
            </div>

            {/* ── Submit ── */}
            <div className="px-6 py-5 bg-zinc-900/50">
              <button
                onClick={handleSubmit}
                disabled={isSubmitting || !!amountError || utr.length < 10}
                className={`w-full py-4 font-black rounded-2xl text-sm transition-all shadow-lg flex justify-center items-center gap-2 ${
                  isSubmitting || !!amountError || utr.length < 10
                    ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                    : 'bg-emerald-500 text-black hover:bg-emerald-400 hover:scale-[1.02] shadow-emerald-900/40'
                }`}
              >
                {isSubmitting
                  ? <><RefreshCw className="w-4 h-4 animate-spin" /> SUBMITTING...</>
                  : `SUBMIT & CLAIM ₹${displayBonus.toLocaleString()}`
                }
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
