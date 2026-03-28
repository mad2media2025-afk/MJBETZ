/**
 * BetSlip.tsx — Floating right sidebar on desktop, bottom drawer on mobile
 * Shows all selected bets, stake inputs, and place bet button
 */
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, X, ChevronRight, CreditCard, Plus, Minus } from 'lucide-react';
import type { BetSlipItem } from '../types';

interface Props {
  betSlip: BetSlipItem[];
  totalStake: number;
  totalReturn: number;
  balance: number;
  isPlacing: boolean;
  onRemove: (id: string) => void;
  onUpdateStake: (id: string, stake: number) => void;
  onPlace: () => void;
  onDeposit: () => void;
}

export default function BetSlip({
  betSlip, totalStake, totalReturn, balance,
  isPlacing, onRemove, onUpdateStake, onPlace, onDeposit
}: Props) {
  const insufficient = totalStake > balance;

  const SlipItems = (
    <div className="max-h-[45vh] lg:max-h-72 overflow-y-auto divide-y divide-zinc-800/50">
      <AnimatePresence>
        {betSlip.map(b => (
          <motion.div
            key={b.id}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="p-4 overflow-hidden"
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1 min-w-0 pr-2">
                <p className="text-xs font-bold text-white leading-snug">{b.label}</p>
                <p className="text-[10px] text-zinc-500 capitalize mt-0.5">{b.market}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-orange-400 font-black text-xs">@{b.odds}</span>
                <button onClick={() => onRemove(b.id)}
                  className="text-zinc-600 hover:text-red-400 transition" aria-label="Remove">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            {/* Stake input with enhanced controls */}
            <div className="flex flex-col gap-2 mt-2">
              <div className="flex items-center gap-1.5 bg-zinc-800/50 rounded-xl p-1 border border-zinc-700/50">
                <button
                  onClick={() => onUpdateStake(b.id, Math.max(10, b.stake - 100))}
                  className="w-8 h-8 flex items-center justify-center bg-zinc-800 hover:bg-zinc-700 rounded-lg text-zinc-400 hover:text-white transition"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                
                <div className="flex-1 relative flex items-center">
                  <span className="absolute left-3 text-zinc-500 text-xs font-bold">₹</span>
                  <input
                    type="number" min={10} value={b.stake || ''}
                    onChange={e => onUpdateStake(b.id, Math.max(10, parseInt(e.target.value) || 0))}
                    className="w-full bg-transparent pl-7 pr-3 py-1.5 text-sm font-black text-center text-white outline-none"
                  />
                </div>

                <button
                  onClick={() => onUpdateStake(b.id, b.stake + 100)}
                  className="w-8 h-8 flex items-center justify-center bg-zinc-800 hover:bg-zinc-700 rounded-lg text-zinc-400 hover:text-white transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Presets */}
              <div className="grid grid-cols-4 gap-1.5">
                {[100, 500, 1000, 5000].map(amt => (
                  <button key={amt} onClick={() => onUpdateStake(b.id, amt)}
                    className="text-[10px] font-black py-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700/50 rounded-lg text-zinc-400 hover:text-white transition uppercase tracking-wider">
                    {amt >= 1000 ? `${amt/1000}k` : amt}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );

  const SlipFooter = (
    <div className="p-4 border-t border-zinc-800/60 space-y-3">
      <div className="flex justify-between text-xs">
        <span className="text-zinc-400">Total Stake</span>
        <span className="font-bold text-white">₹{totalStake.toLocaleString()}</span>
      </div>
      <div className="flex justify-between text-xs">
        <span className="text-zinc-400">Est. Return</span>
        <span className="font-black text-emerald-400">₹{Math.round(totalReturn).toLocaleString()}</span>
      </div>
      {insufficient && (
        <p className="text-red-400 text-[11px] flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5" /> Insufficient balance
        </p>
      )}
      <button
        onClick={onPlace}
        disabled={isPlacing || insufficient || betSlip.length === 0}
        className={`w-full py-3.5 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all ${
          isPlacing
            ? 'bg-zinc-800 text-zinc-500 cursor-wait'
            : insufficient
            ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
            : 'bg-gradient-to-b from-emerald-500 to-emerald-600 text-black hover:from-emerald-400 hover:to-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.2)] active:scale-95'
        } disabled:opacity-60`}
      >
        {isPlacing ? (
          <>
            <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            PROCESSING...
          </>
        ) : (
          <>PLACE BET <ChevronRight className="w-4 h-4" /></>
        )}
      </button>
    </div>
  );

  return (
    <>
      {/* ── Desktop sidebar ── */}
      <div className="hidden lg:block w-[300px] shrink-0">
        <div className="sticky top-[calc(62px+1px+24px+16px)] space-y-3">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 bg-zinc-900/80">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                <span className="text-[11px] font-black uppercase tracking-widest text-zinc-300">Bet Slip</span>
              </div>
              <span className="text-[10px] font-bold text-zinc-500 bg-zinc-800 px-2.5 py-0.5 rounded-full border border-zinc-700 uppercase">
                {betSlip.length} {betSlip.length === 1 ? 'Selection' : 'Selections'}
              </span>
            </div>

            {betSlip.length === 0 ? (
              <div className="py-16 text-center text-zinc-500 px-5">
                <p className="text-sm leading-relaxed">Your bet slip is empty.<br />Click on the odds to add selections.</p>
              </div>
            ) : (
              <>{SlipItems}{SlipFooter}</>
            )}
          </div>

          {/* Quick deposit button */}
          <button
            onClick={onDeposit}
            className="w-full flex items-center justify-center gap-2 py-3.5 bg-zinc-900 border border-zinc-800 rounded-2xl text-[11px] font-bold text-zinc-400 hover:text-white hover:bg-zinc-800 transition tracking-widest uppercase"
          >
            <CreditCard className="w-4 h-4" />
            Quick Deposit ₹2500 via UPI
          </button>

          <p className="text-center text-[9px] text-zinc-600 font-bold uppercase tracking-wider">
            DEMO PROJECT • ALL TRANSACTIONS SIMULATED
          </p>
        </div>
      </div>

      {/* ── Mobile bottom drawer ── */}
      <AnimatePresence>
        {betSlip.length > 0 && (
          <motion.div
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-zinc-900 border-t border-zinc-800 rounded-t-3xl shadow-2xl"
          >
            <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-black text-sm text-white">BET SLIP ({betSlip.length})</span>
              </div>
              <span className="text-xs text-zinc-400">
                ₹{totalStake} → <span className="text-emerald-400 font-bold">₹{Math.round(totalReturn)}</span>
              </span>
            </div>
            {SlipItems}
            {SlipFooter}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
