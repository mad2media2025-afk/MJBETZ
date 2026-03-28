/**
 * TossBetting.tsx — Toss Betting Market
 * Users bet on which team wins the coin toss before the match starts.
 * Features: animated coin flip, countdown to lock, auto-result reveal.
 */
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Coins, Lock, CheckCircle, XCircle, Trophy, Timer } from 'lucide-react';
import type { LiveMatch } from '../types';

interface Props {
  match: LiveMatch;
  selectedOdds: Record<string, string>;
  onBet: (market: string, label: string, odds: number) => void;
  balance?: number; // reserved for future min-bet validation
}

// Toss state machine
type TossPhase = 'open' | 'locked' | 'flipping' | 'revealed';

const TOSS_ODDS_T1 = 1.90;
const TOSS_ODDS_T2 = 1.90;

// Simulated toss result — randomly picks winner 12s after lock
function simulateTossWinner(team1: string, team2: string): string {
  return Math.random() > 0.5 ? team1 : team2;
}

export default function TossBetting({ match, selectedOdds, onBet }: Props) {
  const [phase, setPhase] = useState<TossPhase>('open');
  const [winner, setWinner] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(30); // seconds until bets lock
  const [coinFace, setCoinFace] = useState<'heads' | 'tails'>('heads');
  const [userWon, setUserWon] = useState<boolean | null>(null);
  const [betsLocked, setBetsLocked] = useState(false);

  const team1Label = `${match.team1Short} Win Toss`;
  const team2Label = `${match.team2Short} Win Toss`;
  const selected = selectedOdds['toss-winner'];

  // Countdown timer — locks bets when hits 0
  useEffect(() => {
    if (phase !== 'open') return;
    if (countdown <= 0) {
      setPhase('locked');
      setBetsLocked(true);
      return;
    }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, countdown]);

  // After lock → show flip after 3s
  useEffect(() => {
    if (phase !== 'locked') return;
    const t = setTimeout(() => setPhase('flipping'), 3000);
    return () => clearTimeout(t);
  }, [phase]);

  // Coin flip animation cycle
  useEffect(() => {
    if (phase !== 'flipping') return;
    let flips = 0;
    const maxFlips = 14;
    const interval = setInterval(() => {
      setCoinFace(f => (f === 'heads' ? 'tails' : 'heads'));
      flips++;
      if (flips >= maxFlips) {
        clearInterval(interval);
        const w = simulateTossWinner(match.team1Short, match.team2Short);
        setWinner(w);
        // Determine if user's bet won
        if (selected) {
          const userPickedTeam = selected.startsWith(match.team1Short)
            ? match.team1Short
            : match.team2Short;
          setUserWon(userPickedTeam === w);
        }
        setTimeout(() => setPhase('revealed'), 500);
      }
    }, 150);
    return () => clearInterval(interval);
  }, [phase, match.team1Short, match.team2Short, selected]);


  const urgencyColor =
    countdown > 15 ? 'text-emerald-400' :
    countdown > 7  ? 'text-orange-400' :
                     'text-red-400';

  const isPreMatch = match.status === 'pre-match';

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden">
      {/* ── Header ── */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-zinc-800/80 bg-gradient-to-r from-zinc-900 to-zinc-950">
        <div className="p-2 bg-yellow-500/10 rounded-xl border border-yellow-500/20">
          <Coins className="w-4 h-4 text-yellow-400" />
        </div>
        <div className="flex-1">
          <h3 className="font-black text-sm text-white tracking-wide">Toss Betting</h3>
          <p className="text-[10px] text-zinc-500 mt-0.5">Bet on who wins the coin toss</p>
        </div>
        {/* Phase badge */}
        <AnimatePresence mode="wait">
          {phase === 'open' && (
            <motion.div
              key="open"
              initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
              className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 rounded-full"
            >
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
              <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">OPEN</span>
            </motion.div>
          )}
          {phase === 'locked' && (
            <motion.div
              key="locked"
              initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
              className="flex items-center gap-1.5 bg-orange-500/10 border border-orange-500/30 px-3 py-1 rounded-full"
            >
              <Lock className="w-3 h-3 text-orange-400" />
              <span className="text-[10px] font-black text-orange-400 uppercase tracking-widest">LOCKED</span>
            </motion.div>
          )}
          {(phase === 'flipping' || phase === 'revealed') && (
            <motion.div
              key="live"
              initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
              className="flex items-center gap-1.5 bg-purple-500/10 border border-purple-500/30 px-3 py-1 rounded-full"
            >
              <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-pulse" />
              <span className="text-[10px] font-black text-purple-400 uppercase tracking-widest">
                {phase === 'flipping' ? 'TOSSING' : 'RESULT'}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="p-5 space-y-5">

        {/* ── Coin Animation Area ── */}
        <div className="flex justify-center">
          <AnimatePresence mode="wait">
            {/* Revealed Result */}
            {phase === 'revealed' && winner ? (
              <motion.div
                key="result"
                initial={{ opacity: 0, scale: 0.5, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                className="flex flex-col items-center gap-3"
              >
                <div className={`w-24 h-24 rounded-full flex items-center justify-center border-4 shadow-2xl ${
                  userWon === true
                    ? 'bg-emerald-500/20 border-emerald-400 shadow-emerald-500/30'
                    : userWon === false
                    ? 'bg-red-500/20 border-red-400 shadow-red-500/30'
                    : 'bg-yellow-500/20 border-yellow-400 shadow-yellow-500/30'
                }`}>
                  <Trophy className={`w-10 h-10 ${
                    userWon === true ? 'text-emerald-400' :
                    userWon === false ? 'text-red-400' : 'text-yellow-400'
                  }`} />
                </div>
                <div className="text-center">
                  <p className="text-xs text-zinc-500 uppercase tracking-widest font-bold">Toss Won By</p>
                  <p className="text-2xl font-black text-white mt-1">{winner}</p>
                  {userWon !== null && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                      className={`flex items-center gap-1.5 justify-center mt-2 text-sm font-black px-3 py-1 rounded-full ${
                        userWon
                          ? 'bg-emerald-500/15 text-emerald-400'
                          : 'bg-red-500/15 text-red-400'
                      }`}
                    >
                      {userWon
                        ? <><CheckCircle className="w-4 h-4" /> Your bet WON! 🎉</>
                        : <><XCircle className="w-4 h-4" /> Your bet LOST</>
                      }
                    </motion.div>
                  )}
                </div>
              </motion.div>
            ) : phase === 'flipping' ? (
              /* Flipping Coin */
              <motion.div
                key="flipping"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex flex-col items-center gap-3"
              >
                <motion.div
                  animate={{ rotateY: [0, 180, 360] }}
                  transition={{ duration: 0.3, repeat: Infinity, ease: 'linear' }}
                  className="w-20 h-20 rounded-full bg-gradient-to-br from-yellow-300 via-yellow-400 to-yellow-600 border-4 border-yellow-300 flex items-center justify-center shadow-2xl shadow-yellow-500/40"
                >
                  <span className="text-3xl font-black text-yellow-900">
                    {coinFace === 'heads' ? '🏏' : '🌕'}
                  </span>
                </motion.div>
                <p className="text-xs text-yellow-400 font-black animate-pulse uppercase tracking-widest">Tossing...</p>
              </motion.div>
            ) : phase === 'locked' ? (
              /* Locked State */
              <motion.div
                key="locked-coin"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex flex-col items-center gap-3"
              >
                <div className="w-20 h-20 rounded-full bg-zinc-800 border-4 border-zinc-700 flex items-center justify-center shadow-xl">
                  <Lock className="w-8 h-8 text-orange-400" />
                </div>
                <p className="text-xs text-orange-400 font-black uppercase tracking-widest">Bets Locked • Toss Incoming</p>
              </motion.div>
            ) : (
              /* Open — Static Coin */
              <motion.div
                key="idle-coin"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex flex-col items-center gap-3"
              >
                <motion.div
                  animate={{ y: [0, -6, 0] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                  className="w-20 h-20 rounded-full bg-gradient-to-br from-yellow-300 via-yellow-400 to-yellow-600 border-4 border-yellow-300 flex items-center justify-center shadow-2xl shadow-yellow-500/20"
                >
                  <span className="text-3xl">🏏</span>
                </motion.div>
                {/* Countdown */}
                <div className="flex items-center gap-2">
                  <Timer className={`w-3.5 h-3.5 ${urgencyColor}`} />
                  <span className={`text-xs font-black ${urgencyColor}`}>
                    {countdown > 0
                      ? `Bets lock in ${countdown}s`
                      : 'Locking...'}
                  </span>
                </div>
                {/* Urgency bar */}
                <div className="w-32 h-1 bg-zinc-800 rounded-full overflow-hidden">
                  <motion.div
                    className={`h-full rounded-full ${
                      countdown > 15 ? 'bg-emerald-400' :
                      countdown > 7  ? 'bg-orange-400' : 'bg-red-400'
                    }`}
                    initial={{ width: '100%' }}
                    animate={{ width: `${(countdown / 30) * 100}%` }}
                    transition={{ duration: 0.9, ease: 'linear' }}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Betting Buttons ── */}
        <AnimatePresence>
          {(phase === 'open') && (
            <motion.div
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
              className="grid grid-cols-2 gap-3"
            >
              {[
                { label: team1Label, odds: TOSS_ODDS_T1, team: match.team1Short, color: match.team1Color },
                { label: team2Label, odds: TOSS_ODDS_T2, team: match.team2Short, color: match.team2Color },
              ].map((opt) => {
                const isSelected = selected === opt.label;
                return (
                  <motion.button
                    key={opt.label}
                    whileTap={{ scale: 0.96 }}
                    disabled={betsLocked}
                    onClick={() => onBet('toss-winner', opt.label, opt.odds)}
                    className={`relative flex flex-col items-center py-5 px-3 rounded-2xl border transition-all disabled:opacity-40 ${
                      isSelected
                        ? 'bg-yellow-500/10 border-yellow-400 shadow-[0_0_18px_rgba(234,179,8,0.15)]'
                        : 'bg-zinc-950/80 border-zinc-800 hover:border-yellow-500/40'
                    }`}
                  >
                    {isSelected && (
                      <motion.span
                        layoutId="toss-selected"
                        className="absolute top-2 right-2 w-2 h-2 bg-yellow-400 rounded-full"
                      />
                    )}
                    <span className="text-xl font-black text-white mb-1">{opt.team}</span>
                    <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mb-2">Win Toss</span>
                    <span className={`text-2xl font-black ${isSelected ? 'text-yellow-400' : 'text-orange-400'}`}>
                      {opt.odds}
                    </span>
                    <span className="text-[9px] text-zinc-600 font-bold uppercase tracking-wider mt-1">
                      ₹200 → ₹{(200 * opt.odds).toFixed(0)}
                    </span>
                  </motion.button>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Selected Bet Info (locked / flipping) ── */}
        {(phase === 'locked' || phase === 'flipping') && selected && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="flex items-center justify-between bg-zinc-800/60 border border-zinc-700/50 rounded-2xl px-4 py-3"
          >
            <div className="flex items-center gap-2">
              <Lock className="w-3.5 h-3.5 text-orange-400" />
              <span className="text-xs text-zinc-400 font-semibold">Your bet locked in:</span>
            </div>
            <span className="text-xs font-black text-yellow-400">{selected}</span>
          </motion.div>
        )}

        {/* ── No bet placed warning ── */}
        {(phase === 'locked' || phase === 'flipping') && !selected && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="text-center py-2 text-zinc-600 text-xs font-semibold"
          >
            No toss bet placed
          </motion.div>
        )}

        {/* ── Toss Completed state ── */}
        {phase === 'revealed' && (
          <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="w-full py-3 rounded-2xl bg-zinc-900 border border-zinc-800 text-xs font-black text-zinc-500 flex items-center justify-center gap-2 cursor-not-allowed opacity-80"
          >
            <Coins className="w-3.5 h-3.5 text-zinc-500" />
            Toss Completed • Bets Closed
          </motion.div>
        )}

        {/* Info line */}
        {phase === 'open' && !isPreMatch && (
          <p className="text-center text-[10px] text-zinc-600 font-bold">
            ⚡ Pre-toss market • Bets settle automatically after the toss
          </p>
        )}
      </div>
    </div>
  );
}
